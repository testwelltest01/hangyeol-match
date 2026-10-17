-- 한결 0005: 서로 수락한 두 사람의 대화방
-- 흐름: 서로 수락 → 대화방이 열림(한 사람당 메시지 49개까지) → 둘 다 '연락처 전달'을 누르면 연락처 공개
-- 분석을 위해 메시지마다 순번·말차례·응답 간격·글자 수를 함께 남긴다. 대화 내용은 보관 기간이 지나면 지우고
-- 내용 없는 정보(시각, 글자 수, 순번 등)는 남긴다.
-- Supabase SQL Editor에서 한 번 실행한다. 여러 번 실행해도 괜찮다.

-- ---------------------------------------------------------------------------
-- 테이블
-- ---------------------------------------------------------------------------

create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users (id) on delete cascade,   -- 두 사람 중 id가 작은 쪽
  user_b uuid not null references auth.users (id) on delete cascade,   -- id가 큰 쪽
  opened_at timestamptz not null default now(),                        -- 서로 수락해서 방이 열린 시각
  first_message_at timestamptz,
  last_message_at timestamptz,
  count_a smallint not null default 0,                                 -- user_a가 보낸 메시지 수
  count_b smallint not null default 0,
  contact_a_at timestamptz,                                            -- user_a가 '연락처 전달'을 누른 시각 (취소하면 null)
  contact_b_at timestamptz,
  exchanged_at timestamptz,                                            -- 둘 다 눌러서 연락처가 공개된 시각
  closed_at timestamptz,                                               -- 차단·신고로 닫힌 시각
  close_reason text check (close_reason in ('blocked', 'reported')),
  check (user_a < user_b),
  unique (user_a, user_b)
);
create index if not exists chat_rooms_user_b on public.chat_rooms (user_b);

create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.chat_rooms (id) on delete cascade,
  sender uuid not null references auth.users (id) on delete cascade,
  body text check (body is null or char_length(body) between 1 and 500),   -- 보관 기간이 지나면 null
  room_seq smallint not null,        -- 방 안에서 몇 번째 메시지 (1부터)
  sender_seq smallint not null,      -- 보낸 사람의 몇 번째 메시지 (1부터)
  turn smallint not null,            -- 말차례 번호. 보내는 사람이 바뀔 때마다 1씩 늘어난다
  char_count smallint not null,      -- 글자 수 (내용을 지워도 남는다)
  response_seconds integer,          -- 말차례를 바꾼 메시지면, 상대의 직전 메시지부터 걸린 초
  created_at timestamptz not null default now(),
  body_purged_at timestamptz,        -- 내용을 지운 시각
  unique (room_id, room_seq)
);
create index if not exists chat_messages_room on public.chat_messages (room_id, id);

-- 방에서 일어난 일 (분석용 타임라인)
create table if not exists public.chat_events (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.chat_rooms (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('opened', 'contact_request', 'contact_cancel', 'contact_exchanged', 'limit_reached', 'closed')),
  created_at timestamptz not null default now()
);
create index if not exists chat_events_room on public.chat_events (room_id, created_at);

-- 어디까지 읽었는지 (안 읽은 수, 읽음 표시)
create table if not exists public.chat_reads (
  room_id uuid not null references public.chat_rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  last_read_id bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

-- 1단계 테이블과 같이 서버(secret key)만 읽고 쓴다
alter table public.chat_rooms enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_events enable row level security;
alter table public.chat_reads enable row level security;
revoke all on table public.chat_rooms, public.chat_messages, public.chat_events, public.chat_reads from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 함수 (서버만 실행)
-- ---------------------------------------------------------------------------

-- 방 열기. 이미 있으면 그 방 id
create or replace function public.open_chat_room(p_x uuid, p_y uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_a uuid := least(p_x, p_y);
  v_b uuid := greatest(p_x, p_y);
  v_id uuid;
begin
  if v_a = v_b then
    raise exception 'same user';
  end if;
  insert into public.chat_rooms (user_a, user_b) values (v_a, v_b)
  on conflict (user_a, user_b) do nothing
  returning id into v_id;
  if v_id is not null then
    insert into public.chat_events (room_id, kind) values (v_id, 'opened');
    return v_id;
  end if;
  select id into v_id from public.chat_rooms where user_a = v_a and user_b = v_b;
  return v_id;
end;
$$;

-- 메시지 보내기. 방을 잠가서 동시에 보내도 순번과 한도가 어긋나지 않는다
-- status: ok | no_room | not_member | closed | limit
create or replace function public.send_chat_message(p_room uuid, p_sender uuid, p_body text, p_limit integer)
returns table (message_id bigint, room_seq integer, sender_seq integer, created_at timestamptz, status text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  r public.chat_rooms%rowtype;
  v_prev public.chat_messages%rowtype;
  v_count integer;
  v_seq integer;
  v_turn integer;
  v_gap integer;
  v_id bigint;
  v_at timestamptz := clock_timestamp();
begin
  select * into r from public.chat_rooms where id = p_room for update;
  if not found then
    return query select null::bigint, null::integer, null::integer, null::timestamptz, 'no_room'::text;
    return;
  end if;
  if p_sender <> r.user_a and p_sender <> r.user_b then
    return query select null::bigint, null::integer, null::integer, null::timestamptz, 'not_member'::text;
    return;
  end if;
  if r.closed_at is not null then
    return query select null::bigint, null::integer, null::integer, null::timestamptz, 'closed'::text;
    return;
  end if;
  v_count := case when p_sender = r.user_a then r.count_a else r.count_b end;
  if v_count >= p_limit then
    return query select null::bigint, null::integer, null::integer, null::timestamptz, 'limit'::text;
    return;
  end if;

  select * into v_prev from public.chat_messages m where m.room_id = p_room order by m.room_seq desc limit 1;
  v_seq := coalesce(v_prev.room_seq, 0) + 1;
  if v_prev.id is null then
    v_turn := 1;
    v_gap := null;
  elsif v_prev.sender = p_sender then
    v_turn := v_prev.turn;
    v_gap := null;
  else
    v_turn := v_prev.turn + 1;
    v_gap := floor(extract(epoch from v_at - v_prev.created_at))::integer;
  end if;

  insert into public.chat_messages (room_id, sender, body, room_seq, sender_seq, turn, char_count, response_seconds, created_at)
  values (p_room, p_sender, p_body, v_seq, v_count + 1, v_turn, char_length(p_body), v_gap, v_at)
  returning id into v_id;

  update public.chat_rooms
  set count_a = count_a + case when p_sender = user_a then 1 else 0 end,
      count_b = count_b + case when p_sender = user_b then 1 else 0 end,
      first_message_at = coalesce(first_message_at, v_at),
      last_message_at = v_at
  where id = p_room;

  if v_count + 1 = p_limit then
    insert into public.chat_events (room_id, user_id, kind) values (p_room, p_sender, 'limit_reached');
  end if;

  return query select v_id, v_seq, v_count + 1, v_at, 'ok'::text;
end;
$$;

-- 연락처 전달 누르기(p_on = true) / 취소(false). 둘 다 누르면 그 자리에서 교환된다
-- status: ok | no_room | not_member | closed
create or replace function public.set_contact_request(p_room uuid, p_user uuid, p_on boolean)
returns table (mine_at timestamptz, theirs_at timestamptz, exchanged_at timestamptz, status text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  r public.chat_rooms%rowtype;
  v_is_a boolean;
  v_mine timestamptz;
begin
  select * into r from public.chat_rooms where id = p_room for update;
  if not found then
    return query select null::timestamptz, null::timestamptz, null::timestamptz, 'no_room'::text;
    return;
  end if;
  if p_user <> r.user_a and p_user <> r.user_b then
    return query select null::timestamptz, null::timestamptz, null::timestamptz, 'not_member'::text;
    return;
  end if;
  v_is_a := p_user = r.user_a;
  if r.closed_at is not null then
    return query select
      case when v_is_a then r.contact_a_at else r.contact_b_at end,
      case when v_is_a then r.contact_b_at else r.contact_a_at end,
      r.exchanged_at, 'closed'::text;
    return;
  end if;

  -- 이미 교환했으면 바꾸지 않는다
  if r.exchanged_at is null then
    v_mine := case when v_is_a then r.contact_a_at else r.contact_b_at end;
    if p_on and v_mine is null then
      update public.chat_rooms
      set contact_a_at = case when v_is_a then clock_timestamp() else contact_a_at end,
          contact_b_at = case when v_is_a then contact_b_at else clock_timestamp() end
      where id = p_room;
      insert into public.chat_events (room_id, user_id, kind) values (p_room, p_user, 'contact_request');
    elsif not p_on and v_mine is not null then
      update public.chat_rooms
      set contact_a_at = case when v_is_a then null else contact_a_at end,
          contact_b_at = case when v_is_a then contact_b_at else null end
      where id = p_room;
      insert into public.chat_events (room_id, user_id, kind) values (p_room, p_user, 'contact_cancel');
    end if;

    select * into r from public.chat_rooms where id = p_room;
    if r.contact_a_at is not null and r.contact_b_at is not null then
      update public.chat_rooms set exchanged_at = clock_timestamp() where id = p_room returning * into r;
      insert into public.chat_events (room_id, user_id, kind) values (p_room, p_user, 'contact_exchanged');
    end if;
  end if;

  return query select
    case when v_is_a then r.contact_a_at else r.contact_b_at end,
    case when v_is_a then r.contact_b_at else r.contact_a_at end,
    r.exchanged_at, 'ok'::text;
end;
$$;

-- 마지막 대화 후 p_days일이 지난 방의 대화 내용을 지운다 (확인 중인 신고가 있으면 남긴다). 지운 메시지 수
create or replace function public.purge_chat_bodies(p_days integer default 90)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n integer;
begin
  update public.chat_messages m
  set body = null, body_purged_at = now()
  from public.chat_rooms r
  where m.room_id = r.id
    and m.body is not null
    and coalesce(r.last_message_at, r.opened_at) < now() - make_interval(days => p_days)
    and not exists (
      select 1 from public.reports rp
      where rp.resolved_at is null
        and ((rp.reporter = r.user_a and rp.target = r.user_b) or (rp.reporter = r.user_b and rp.target = r.user_a))
    );
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function public.open_chat_room(uuid, uuid) from public, anon, authenticated;
revoke all on function public.send_chat_message(uuid, uuid, text, integer) from public, anon, authenticated;
revoke all on function public.set_contact_request(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.purge_chat_bodies(integer) from public, anon, authenticated;
grant execute on function public.open_chat_room(uuid, uuid) to service_role;
grant execute on function public.send_chat_message(uuid, uuid, text, integer) to service_role;
grant execute on function public.set_contact_request(uuid, uuid, boolean) to service_role;
grant execute on function public.purge_chat_bodies(integer) to service_role;

-- ---------------------------------------------------------------------------
-- 분석용 요약 (SQL Editor에서 바로 보기). 내용은 쓰지 않는다
-- ---------------------------------------------------------------------------

create or replace view public.chat_room_summary
with (security_invoker = true)
as
select
  r.id as room_id,
  r.user_a,
  r.user_b,
  r.opened_at,
  r.first_message_at,
  r.last_message_at,
  r.count_a,
  r.count_b,
  r.exchanged_at,
  r.closed_at,
  r.close_reason,
  floor(extract(epoch from r.first_message_at - r.opened_at))::integer as seconds_to_first_message,
  floor(extract(epoch from r.exchanged_at - r.opened_at))::integer as seconds_to_exchange,
  (select max(m.turn) from public.chat_messages m where m.room_id = r.id) as turns,
  (select round(avg(m.char_count), 1) from public.chat_messages m where m.room_id = r.id and m.sender = r.user_a) as avg_chars_a,
  (select round(avg(m.char_count), 1) from public.chat_messages m where m.room_id = r.id and m.sender = r.user_b) as avg_chars_b,
  (select percentile_cont(0.5) within group (order by m.response_seconds)
     from public.chat_messages m where m.room_id = r.id and m.sender = r.user_a and m.response_seconds is not null) as median_response_a,
  (select percentile_cont(0.5) within group (order by m.response_seconds)
     from public.chat_messages m where m.room_id = r.id and m.sender = r.user_b and m.response_seconds is not null) as median_response_b
from public.chat_rooms r;

revoke all on table public.chat_room_summary from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 이미 서로 수락한 사람들: 그동안은 수락하면 바로 연락처가 보였으므로, 연락처를 교환한 방으로 옮긴다
-- ---------------------------------------------------------------------------

insert into public.chat_rooms (user_a, user_b, opened_at, contact_a_at, contact_b_at, exchanged_at)
select
  a.from_user,
  a.to_user,
  greatest(a.accept_at, b.accept_at),
  greatest(a.accept_at, b.accept_at),
  greatest(a.accept_at, b.accept_at),
  greatest(a.accept_at, b.accept_at)
from public.reactions a
join public.reactions b on b.from_user = a.to_user and b.to_user = a.from_user
where a.from_user < a.to_user
  and a.accept is true
  and b.accept is true
on conflict (user_a, user_b) do nothing;
