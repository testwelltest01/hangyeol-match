-- 한결 0008: 오늘의 추천 새로고침 쿠폰
-- 친구 평가 1명당 쿠폰 1장(개수 제한 없음, friend_ratings 수로 계산). 쿠폰을 쓰면 오늘 추천 중 아직 답하지 않은 사람을
-- 새 사람으로 바꾼다. 추천 하루(저녁 8시에 넘어가는 날짜)에 한 번까지: (user_id, day) unique.
-- 바꾼 사람(replaced)은 같은 사람을 다시 추천하지 않는 기간(14일) 동안 다시 추천하지 않는다.
-- 이 표를 만들기 전에는 쿠폰 기능만 숨겨진다. Supabase SQL Editor에서 한 번 실행한다. 여러 번 실행해도 괜찮다.

create table if not exists public.recommendation_refreshes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,                           -- 추천 하루 (recommendations.day와 같은 기준)
  replaced uuid[] not null default '{}',       -- 바꿔서 오늘 목록에서 뺀 상대
  added uuid[] not null default '{}',          -- 새로 받은 상대
  created_at timestamptz not null default now(),
  unique (user_id, day)                        -- 하루 한 번 (동시에 두 번 눌러도 한 번만 쓰인다)
);
create index if not exists recommendation_refreshes_day on public.recommendation_refreshes (day);

-- 1단계 테이블과 같이 서버(secret key)만 읽고 쓴다
alter table public.recommendation_refreshes enable row level security;
revoke all on table public.recommendation_refreshes from anon, authenticated;
