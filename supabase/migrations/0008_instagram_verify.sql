-- 인스타그램 계정 확인 (선택). 회원이 한결 공식 인스타에 DM으로 '인증'을 보내면 웹훅(/api/instagram/webhook)이
-- 6자리 코드를 답장하고, 회원이 그 코드를 연락처 화면에 넣으면 DM을 보낸 계정이 한결 계정에 연결된다.
-- 연결된 아이디는 연락처의 인스타 아이디가 되고, 추천 카드에 '인스타 확인됨'이 붙는다.
-- 표는 모두 서버 전용 (브라우저 권한 없음). 아이디와 토큰은 연락처처럼 AES-256-GCM으로 암호화한 값만 넣는다.
-- Supabase SQL Editor에서 실행한다. 0007_api_usage.sql 다음에. 다시 실행해도 괜찮다.

-- 봇이 보낸 코드. 크론이 하루 지난 줄을 지운다
create table if not exists public.instagram_codes (
  id bigint generated always as identity primary key,
  code text not null check (code ~ '^[0-9]{6}$'),
  ig_user_id text not null,             -- 인스타가 한결 계정 기준으로 매긴 보낸 사람 번호(IGSID)
  username text not null,               -- 보낸 계정의 아이디 (암호화)
  mid text,                             -- 웹훅 메시지 ID (같은 알림이 다시 와도 코드를 두 번 보내지 않게)
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);
create unique index if not exists instagram_codes_active on public.instagram_codes (code) where used_at is null;
create unique index if not exists instagram_codes_mid on public.instagram_codes (mid) where mid is not null;
create index if not exists instagram_codes_sender on public.instagram_codes (ig_user_id);
create index if not exists instagram_codes_created on public.instagram_codes (created_at);

-- 확인을 마친 회원. 한 인스타 계정은 한 한결 계정에만. 연락처의 인스타 아이디를 다른 값으로 바꾸면 서버가 이 줄을 지운다
create table if not exists public.instagram_verifications (
  user_id uuid primary key references auth.users (id) on delete cascade,
  ig_user_id text not null unique,
  username text not null,               -- 확인한 아이디 (암호화)
  verified_at timestamptz not null default now()
);

-- 한결 공식 인스타의 장기 토큰 (60일). 크론이 7일마다 갱신해 여기에 둔다
create table if not exists public.instagram_tokens (
  id smallint primary key default 1 check (id = 1),
  token text not null,                  -- 암호화
  seed text not null,                   -- 환경 변수 INSTAGRAM_ACCESS_TOKEN의 지문. 환경 변수를 새 토큰으로 바꾸면 그걸 쓴다
  refreshed_at timestamptz not null default now(),
  expires_at timestamptz
);

alter table public.instagram_codes enable row level security;
alter table public.instagram_verifications enable row level security;
alter table public.instagram_tokens enable row level security;
revoke all on table public.instagram_codes, public.instagram_verifications, public.instagram_tokens from anon, authenticated;

notify pgrst, 'reload schema';
