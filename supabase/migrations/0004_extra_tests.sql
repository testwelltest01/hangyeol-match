-- 한결 0004: 추가 검사(선택)와 사진 거절 사유
-- Supabase SQL Editor에서 한 번 실행한다. 여러 번 실행해도 괜찮다.

-- 1) 추가 검사 결과. 한 사람이 검사마다 한 줄 (다시 하면 덮어쓴다)
create table if not exists public.extra_results (
  user_id uuid not null references auth.users (id) on delete cascade,
  test_id text not null,                 -- src/lib/extra/tests.ts의 검사 id
  version text not null,
  answers jsonb not null,
  scores jsonb not null,
  share boolean not null default true,   -- 추천받은 상대에게 요약을 보여줄지
  completed_at timestamptz not null default now(),
  primary key (user_id, test_id)
);

alter table public.extra_results enable row level security;
revoke all on table public.extra_results from anon, authenticated;

-- 2) 사진 시도 기록에 거절 사유·오류 내용을 남긴다 (관리자 회원 상세에서 본다)
alter table public.photo_attempts add column if not exists detail text check (char_length(detail) <= 500);
