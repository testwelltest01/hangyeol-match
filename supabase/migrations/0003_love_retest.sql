-- 연애 상황 보고서 다시 검사하기: 한 사람에 한 줄이던 것을 검사할 때마다 한 줄로 바꾼다 (이전 결과는 재검사 분석용으로 남긴다).
-- Supabase SQL Editor에서 한 번 실행한다. 0002_love_report.sql 다음에.

alter table public.love_reports drop constraint love_reports_pkey;
alter table public.love_reports add column id uuid not null default gen_random_uuid();
alter table public.love_reports add constraint love_reports_pkey primary key (id);
create index love_reports_user on public.love_reports (user_id, created_at desc);

-- 한 사람에 '쓰는 중'은 하나만 (동시에 두 번 내도 하나만 들어간다)
create unique index love_reports_one_pending on public.love_reports (user_id) where status = 'pending';
