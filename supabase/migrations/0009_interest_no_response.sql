-- 받은 관심 응답 기한 (2026-10-23): 관심을 받고 5일 동안 답하지 않으면 크론이 받은 사람 쪽에 '넘김'을 넣는다.
-- 직접 넘긴 것과 구분하려고 no_response = true로 표시한다 (관리자 통계·엑셀의 '응답 없음').
-- Supabase SQL Editor에서 실행한다. 0008_instagram_verify.sql 다음에. 다시 실행해도 괜찮다.

alter table public.reactions add column if not exists no_response boolean not null default false;
create index if not exists reactions_pending_interest on public.reactions (interest_at) where interest;

notify pgrst, 'reload schema';
