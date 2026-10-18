-- 한결 0007: 알림(웹 푸시) 구독
-- 홈 화면에 설치한 앱이나 브라우저에서 '알림 켜기'를 누르면 그 기기의 알림 주소를 저장한다.
-- 서로 관심, 대화방 열림, 새 메시지, 연락처 전달을 알린다. 알림을 끄거나 탈퇴하면 지운다.
-- Supabase SQL Editor에서 한 번 실행한다. 여러 번 실행해도 괜찮다.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,     -- 브라우저 회사 푸시 서버의 이 기기 주소 (FCM, Apple, Mozilla 등)
  p256dh text not null,              -- 알림 내용을 암호화하는 기기 공개키
  auth text not null,                -- 암호화 보조 키
  user_agent text,                   -- 어떤 기기·브라우저인지 (문제 확인용)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user on public.push_subscriptions (user_id, updated_at desc);

-- 1단계 테이블과 같이 서버(secret key)만 읽고 쓴다
alter table public.push_subscriptions enable row level security;
revoke all on table public.push_subscriptions from anon, authenticated;
