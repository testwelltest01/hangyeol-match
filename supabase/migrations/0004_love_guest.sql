-- 연애 상황 보고서를 가입 전(비회원)에도: 공유 링크로 들어온 사람이 로그인 없이 검사하고 보고서를 받는다.
-- 비회원 검사는 user_id 없이 guest_hash(비밀 열쇠의 SHA-256)로 찾고, 가입·로그인하면 그 계정으로 옮긴다(user_id를 채운다. 열쇠는 남겨 결과 주소가 계속 열린다).
-- 옮기지 않은 비회원 검사는 30일 뒤 크론이 지운다.
-- Supabase SQL Editor에서 실행한다. 0003_love_retest.sql 다음에. 다시 실행해도 괜찮다.

alter table public.love_reports alter column user_id drop not null;
alter table public.love_reports add column if not exists guest_hash text;
create unique index if not exists love_reports_guest on public.love_reports (guest_hash) where guest_hash is not null;
create index if not exists love_reports_unclaimed on public.love_reports (created_at) where user_id is null;

-- 회원 검사이거나 비회원 열쇠가 있어야 한다
alter table public.love_reports drop constraint if exists love_reports_owner_check;
alter table public.love_reports add constraint love_reports_owner_check check (user_id is not null or guest_hash is not null);

notify pgrst, 'reload schema';
