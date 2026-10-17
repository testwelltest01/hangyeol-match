-- 한결 0003: 회원 활동(방문) 기록
-- 관리자 '추세' 화면에서 성별·날짜·시간대·요일별 활동을 보기 위한 기록이다.
-- 로그인한 회원이 서비스를 쓰면 30분에 한 번만 남긴다. 관리자 본인의 활동은 남기지 않는다.
-- 개인정보처리방침의 '접속 로그 3개월'에 맞춰 매일 크론이 90일 지난 기록을 지운다.
-- Supabase SQL Editor에서 한 번 실행한다. 여러 번 실행해도 괜찮다.

create table if not exists public.activity_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('visit')),
  created_at timestamptz not null default now()
);
create index if not exists activity_events_time on public.activity_events (created_at);
create index if not exists activity_events_user_time on public.activity_events (user_id, created_at desc);

-- 1단계 테이블과 같이 서버(secret key)만 읽고 쓴다
alter table public.activity_events enable row level security;
revoke all on table public.activity_events from anon, authenticated;

-- 마지막 방문 기록이 p_gap_seconds보다 오래됐을 때만 새로 남긴다
create or replace function public.log_visit(p_user uuid, p_gap_seconds integer default 1800)
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

revoke all on function public.log_visit(uuid, integer) from public, anon, authenticated;
grant execute on function public.log_visit(uuid, integer) to service_role;
