-- 한결 DB 전체 (2026-10-21에 0001~0008을 하나로 합쳐 처음부터 다시 만든 기준)
-- 빈 프로젝트의 Supabase 대시보드 > SQL Editor에 통째로 붙여넣고 한 번 실행한다.
-- 이후 바뀌는 내용은 0002_*.sql부터 새 파일로 더한다.
--
-- 보안 원칙
-- - 모든 테이블에 RLS를 켠다. 쓰기는 모두 서버(secret key)가 로그인·입력을 확인한 뒤에 한다.
-- - 브라우저(로그인 사용자)가 직접 읽는 것은 0단계 표 4개(profiles, test_answers, test_scores, friend_invites)의 '본인 행'뿐이다.
-- - 나머지 표는 정책을 두지 않고 anon·authenticated 권한도 회수한다 (정책을 실수로 더해도 열리지 않게 한 겹 더).

-- ============================================================================
-- 0단계: 기본 정보, 검사, 친구 평가
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 12),
  gender text not null check (gender in ('male', 'female')),
  birth_year int not null check (birth_year between 1900 and 2100),
  agreed_privacy_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 검사 응답 원본 (단계마다 저장, 이어하기에 쓴다)
create table public.test_answers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  version text not null,                 -- src/lib/items.ts의 TEST_VERSION
  answers jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

-- 검사 점수 (서버가 계산해서 저장)
create table public.test_scores (
  user_id uuid primary key references auth.users (id) on delete cascade,
  version text not null,
  scores jsonb not null,                 -- src/lib/scoring.ts의 Scores
  computed_at timestamptz not null default now()
);

-- 친구 평가 초대 링크 (한 사람에 하나)
create table public.friend_invites (
  token text primary key,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 친구 평가 응답 (평가한 친구의 개인정보는 받지 않는다. 3명 이상일 때만 평균을 보여준다)
create table public.friend_ratings (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  answers jsonb not null,
  created_at timestamptz not null default now()
);
create index friend_ratings_user_id_idx on public.friend_ratings (user_id);

-- ============================================================================
-- 매칭
-- ============================================================================

-- 매칭용 내 정보와 원하는 상대 조건
create table public.match_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  region text not null,                  -- '시도|시군구' (src/lib/regions.ts)
  height smallint not null check (height between 130 and 230),
  intro text not null default '' check (char_length(intro) <= 300),
  religion text not null check (religion in ('none', 'protestant', 'catholic', 'buddhist', 'other')),  -- 민감정보
  filters jsonb not null,                -- 원하는 상대 조건 (src/lib/match/filters.ts의 Filters)
  paused boolean not null default false, -- 매칭 쉬기
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 별도 동의 기록 (처음 정보 입력에서 모두 받는다)
-- religion = 종교(민감정보), photo_overseas = 사진 AI 확인(OpenAI 국외 이전), illustration = 그림 프로필(OpenAI 국외 이전)
create table public.consents (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('religion', 'photo_overseas', 'illustration')),
  agreed_at timestamptz not null default now(),
  primary key (user_id, kind)
);

-- 프로필 사진 (얼굴·전신 한 장씩. 바꾸면 이전 사진은 신고 확인용으로 1년 보관 뒤 파일을 지운다)
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slot text not null check (slot in ('face', 'body')),
  path text not null,                    -- Storage 'photos' 버킷 안의 경로
  feedback jsonb not null,               -- 사용자에게 보여주는 AI 피드백
  internal jsonb not null,               -- 내부 점수. 사용자에게 보여주지 않고 추천에도 쓰지 않는다
  created_at timestamptz not null default now(),
  replaced_at timestamptz,               -- 새 사진으로 바뀐 시각
  purged_at timestamptz                  -- 파일을 지운 시각
);
create unique index photos_one_active on public.photos (user_id, slot) where replaced_at is null;
create index photos_to_purge on public.photos (replaced_at) where replaced_at is not null and purged_at is null;

-- 사진 올리기 시도 (계정당 횟수 제한, 거절 사유. 거절된 사진 파일은 저장하지 않는다)
create table public.photo_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  slot text not null,
  result text not null,                  -- src/lib/photo/rules.ts (registered, rejected, error 등)
  detail text check (char_length(detail) <= 500),  -- 거절 사유·오류 내용 (관리자 회원 상세)
  created_at timestamptz not null default now()
);
create index photo_attempts_user_time on public.photo_attempts (user_id, created_at);

-- 연락처 (서버에서 AES-256-GCM으로 암호화한 값만 저장)
create table public.contacts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  instagram text,
  kakao text,
  updated_at timestamptz not null default now(),
  check (instagram is not null or kakao is not null)
);

-- 하루 추천 (day = 추천 하루, 저녁 8시에 다음 날로 넘어간다: src/lib/day.ts의 matchDay)
create table public.recommendations (
  user_id uuid not null references auth.users (id) on delete cascade,   -- 추천을 받는 사람
  target_id uuid not null references auth.users (id) on delete cascade, -- 추천된 사람
  day date not null,
  score real not null,
  reason text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day, target_id)
);
create index recommendations_target_day on public.recommendations (target_id, day);

-- 오늘의 추천 새로고침 쿠폰 사용 기록 (친구 평가 1명당 1장, 추천 하루에 한 번)
create table public.recommendation_refreshes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,                     -- 추천 하루 (recommendations.day와 같은 기준)
  replaced uuid[] not null default '{}', -- 바꿔서 오늘 목록에서 뺀 상대 (14일 동안 다시 추천하지 않는다)
  added uuid[] not null default '{}',    -- 새로 받은 상대
  created_at timestamptz not null default now(),
  unique (user_id, day)                  -- 동시에 두 번 눌러도 한 번만 쓰인다
);
create index recommendation_refreshes_day on public.recommendation_refreshes (day);

-- 관심·수락
create table public.reactions (
  from_user uuid not null references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  interest boolean not null,             -- true 관심 있어요 / false 넘기기
  accept boolean,                        -- 사진 공개 뒤 true 수락 / false 거절
  interest_at timestamptz not null default now(),
  accept_at timestamptz,
  primary key (from_user, to_user),
  check (from_user <> to_user)
);
create index reactions_to_user on public.reactions (to_user);

-- 차단·신고
create table public.blocks (
  blocker uuid not null references auth.users (id) on delete cascade,
  blocked uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked)
);
create index blocks_blocked on public.blocks (blocked);

create table public.reports (
  id bigint generated always as identity primary key,
  reporter uuid references auth.users (id) on delete set null,
  target uuid not null references auth.users (id) on delete cascade,
  reason text not null,
  detail text check (char_length(detail) <= 500),
  created_at timestamptz not null default now(),
  resolved_at timestamptz                -- 운영자가 확인한 시각
);
create index reports_target on public.reports (target);

-- 만남 후 피드백 (행동 기반 게이트)
create table public.meeting_feedback (
  from_user uuid not null references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  outcome text not null check (outcome in ('met', 'not_yet', 'no_contact', 'no_show')),
  photo_match smallint check (photo_match between 1 and 5),   -- 사진과 실제 인상이 비슷했나요
  cleanliness smallint check (cleanliness between 1 and 5),   -- 깔끔한 인상이었나요
  manners smallint check (manners between 1 and 5),           -- 매너가 좋았나요
  again smallint check (again between 1 and 5),               -- 다시 만나고 싶나요
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (from_user, to_user)
);
create index meeting_feedback_to_user on public.meeting_feedback (to_user);

-- 운영자 조치 (이용 정지)
create table public.user_flags (
  user_id uuid primary key references auth.users (id) on delete cascade,
  suspended_at timestamptz,
  reason text,
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 그림 프로필 (매칭에 꼭 필요. 추천 카드에는 실제 사진 대신 이 그림이 보인다)
-- ============================================================================

create table public.illustrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null check (status in ('pending', 'done', 'failed')),
  path text,                             -- Storage 'photos' 버킷 안의 그림 파일 (완료 후)
  model text not null,                   -- 쓴 이미지 모델
  prompt_version text not null,          -- src/lib/illustration/prompt.ts의 PROMPT_VERSION
  features jsonb not null,               -- 프롬프트에 넣은 정보 (이름·지역·종교·연락처는 넣지 않는다)
  error text,
  shown boolean not null default false,  -- 추천 카드에 보여줄 그림 (없으면 가장 최근 그림)
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  deleted_at timestamptz                 -- 회원이 지운 시각 (파일도 지움. 횟수에는 남는다)
);
create index illustrations_user on public.illustrations (user_id, created_at desc);
create index illustrations_day on public.illustrations (created_at);
create unique index illustrations_one_shown on public.illustrations (user_id) where shown and deleted_at is null;

-- ============================================================================
-- 추가 검사 (선택, 한결 자체 문항. 한 사람이 검사마다 한 줄, 다시 하면 덮어쓴다)
-- ============================================================================

create table public.extra_results (
  user_id uuid not null references auth.users (id) on delete cascade,
  test_id text not null,                 -- src/lib/extra/tests.ts의 검사 id
  version text not null,
  answers jsonb not null,
  scores jsonb not null,
  share boolean not null default true,   -- 추천받은 상대에게 요약을 보여줄지
  completed_at timestamptz not null default now(),
  primary key (user_id, test_id)
);

-- ============================================================================
-- 대화방 (서로 수락 → 한 사람당 메시지 49개까지 → 둘 다 '연락처 전달'을 누르면 연락처 공개)
-- 분석을 위해 메시지마다 순번·말차례·응답 간격·글자 수를 남긴다. 내용은 마지막 대화 후 90일 뒤 지우고 나머지는 남긴다.
-- ============================================================================

create table public.chat_rooms (
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
create index chat_rooms_user_b on public.chat_rooms (user_b);

create table public.chat_messages (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.chat_rooms (id) on delete cascade,
  sender uuid not null references auth.users (id) on delete cascade,
  body text check (body is null or char_length(body) between 1 and 500),   -- 보관 기간이 지나면 null
  room_seq smallint not null,            -- 방 안에서 몇 번째 메시지 (1부터)
  sender_seq smallint not null,          -- 보낸 사람의 몇 번째 메시지 (1부터)
  turn smallint not null,                -- 말차례 번호. 보내는 사람이 바뀔 때마다 1씩 늘어난다
  char_count smallint not null,          -- 글자 수 (내용을 지워도 남는다)
  response_seconds integer,              -- 말차례를 바꾼 메시지면, 상대의 직전 메시지부터 걸린 초
  created_at timestamptz not null default now(),
  body_purged_at timestamptz,            -- 내용을 지운 시각
  unique (room_id, room_seq)
);
create index chat_messages_room on public.chat_messages (room_id, id);

-- 방에서 일어난 일 (분석용 타임라인)
create table public.chat_events (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.chat_rooms (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('opened', 'contact_request', 'contact_cancel', 'contact_exchanged', 'limit_reached', 'closed')),
  created_at timestamptz not null default now()
);
create index chat_events_room on public.chat_events (room_id, created_at);

-- 어디까지 읽었는지 (안 읽은 수, 읽음 표시)
create table public.chat_reads (
  room_id uuid not null references public.chat_rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  last_read_id bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

-- ============================================================================
-- 알림 구독 (웹 푸시. 알림을 끄거나 로그아웃·탈퇴하면 지운다)
-- ============================================================================

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,         -- 브라우저 회사 푸시 서버의 이 기기 주소 (FCM, Apple, Mozilla, WNS)
  p256dh text not null,                  -- 알림 내용을 암호화하는 기기 공개키
  auth text not null,                    -- 암호화 보조 키
  user_agent text,                       -- 어떤 기기·브라우저인지 (문제 확인용)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index push_subscriptions_user on public.push_subscriptions (user_id, updated_at desc);

-- ============================================================================
-- 운영: 방문 기록(관리자 추세, 90일 보관), 요청 횟수 제한
-- ============================================================================

create table public.activity_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('visit')),
  created_at timestamptz not null default now()
);
create index activity_events_time on public.activity_events (created_at);
create index activity_events_user_time on public.activity_events (user_id, created_at desc);

create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null,
  count integer not null
);

-- ============================================================================
-- 권한
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.test_answers enable row level security;
alter table public.test_scores enable row level security;
alter table public.friend_invites enable row level security;
alter table public.friend_ratings enable row level security;
alter table public.match_profiles enable row level security;
alter table public.consents enable row level security;
alter table public.photos enable row level security;
alter table public.photo_attempts enable row level security;
alter table public.contacts enable row level security;
alter table public.recommendations enable row level security;
alter table public.recommendation_refreshes enable row level security;
alter table public.reactions enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.meeting_feedback enable row level security;
alter table public.user_flags enable row level security;
alter table public.illustrations enable row level security;
alter table public.extra_results enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_events enable row level security;
alter table public.chat_reads enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.activity_events enable row level security;
alter table public.rate_limits enable row level security;

-- 0단계 표: 로그인 사용자가 본인 행만 읽는다 (쓰기는 서버만. 직접 쓸 수 있으면 출생연도·성별을 바꿔 나이 확인을 건너뛸 수 있다)
create policy "profiles: 본인 조회" on public.profiles for select using ((select auth.uid()) = id);
create policy "test_answers: 본인 조회" on public.test_answers for select using ((select auth.uid()) = user_id);
create policy "test_scores: 본인 조회" on public.test_scores for select using ((select auth.uid()) = user_id);
create policy "friend_invites: 본인 조회" on public.friend_invites for select using ((select auth.uid()) = user_id);
revoke all on table public.profiles, public.test_answers, public.test_scores, public.friend_invites from anon;
revoke insert, update, delete, truncate on table public.profiles, public.test_answers, public.test_scores, public.friend_invites from authenticated;

-- 나머지 표: 서버(secret key)만
revoke all on table
  public.friend_ratings, public.match_profiles, public.consents, public.photos, public.photo_attempts, public.contacts,
  public.recommendations, public.recommendation_refreshes, public.reactions, public.blocks, public.reports,
  public.meeting_feedback, public.user_flags, public.illustrations, public.extra_results,
  public.chat_rooms, public.chat_messages, public.chat_events, public.chat_reads,
  public.push_subscriptions, public.activity_events, public.rate_limits
from anon, authenticated;

-- ============================================================================
-- 함수 (서버만 실행: service_role)
-- ============================================================================

-- 요청 횟수 제한. 같은 키로 p_window_seconds 안에 p_limit번을 넘으면 false
create function public.hit_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update set
    count = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.count + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning count into v_count;
  return v_count <= p_limit;
end;
$$;

-- 방문 기록: 마지막 방문이 p_gap_seconds보다 오래됐을 때만 남긴다
create function public.log_visit(p_user uuid, p_gap_seconds integer default 1800)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.activity_events
    where user_id = p_user and kind = 'visit' and created_at > now() - make_interval(secs => p_gap_seconds)
  ) then
    insert into public.activity_events (user_id, kind) values (p_user, 'visit');
  end if;
end;
$$;

-- 대화방 열기. 이미 있으면 그 방 id
create function public.open_chat_room(p_x uuid, p_y uuid)
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
create function public.send_chat_message(p_room uuid, p_sender uuid, p_body text, p_limit integer)
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
create function public.set_contact_request(p_room uuid, p_user uuid, p_on boolean)
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
create function public.purge_chat_bodies(p_days integer default 90)
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

revoke all on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.log_visit(uuid, integer) from public, anon, authenticated;
revoke all on function public.open_chat_room(uuid, uuid) from public, anon, authenticated;
revoke all on function public.send_chat_message(uuid, uuid, text, integer) from public, anon, authenticated;
revoke all on function public.set_contact_request(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.purge_chat_bodies(integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
grant execute on function public.log_visit(uuid, integer) to service_role;
grant execute on function public.open_chat_room(uuid, uuid) to service_role;
grant execute on function public.send_chat_message(uuid, uuid, text, integer) to service_role;
grant execute on function public.set_contact_request(uuid, uuid, boolean) to service_role;
grant execute on function public.purge_chat_bodies(integer) to service_role;

-- 대화 분석용 요약 (SQL Editor에서 바로 보기. 내용은 쓰지 않는다)
create view public.chat_room_summary
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

-- ============================================================================
-- 사진 저장소: 비공개 버킷. 사진·그림은 서버가 만든 10분짜리 서명 주소로만 보인다
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
