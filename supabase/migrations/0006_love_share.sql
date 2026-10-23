-- 연애 상황 보고서를 남에게 보여주는 공유 링크 (/love/s/<열쇠>). 본인이 켤 때만 만들고, 끄면 줄을 지운다.
-- 회원은 사람마다 하나(user_id): 다시 검사해도 같은 링크가 늘 가장 최근 보고서를 보여준다.
-- 가입 전(비회원) 검사는 그 검사 줄마다 하나(report_id): 검사가 지워지면(30일 뒤 크론) 링크도 함께 지워진다.
-- 링크를 아는 사람은 보고서 글만 본다(검사 점수·닉네임은 보여주지 않는다). 서버만 읽고 쓴다.
-- Supabase SQL Editor에서 실행한다. 0005_love_scenes.sql 다음에. 다시 실행해도 괜찮다.

create table if not exists public.love_shares (
  token text primary key,                                                     -- 링크 열쇠 (base64url 32자, 본인이 다시 복사할 수 있게 그대로 둔다)
  user_id uuid unique references auth.users (id) on delete cascade,           -- 회원 공유
  report_id uuid unique references public.love_reports (id) on delete cascade, -- 비회원 검사 공유
  created_at timestamptz not null default now(),
  constraint love_shares_one_owner check (num_nonnulls(user_id, report_id) = 1)
);

alter table public.love_shares enable row level security;
revoke all on table public.love_shares from anon, authenticated;

notify pgrst, 'reload schema';
