-- 안전 1단계 (2026-10-31)
-- 1) 재가입 제한: 이용이 정지된 사람이 탈퇴하고 다시 가입해도 이용하지 못하게, 정지된 계정의 신원(지금은 이메일,
--    본인인증을 붙이면 CI)을 되돌릴 수 없는 해시(HMAC-SHA256)로만 남긴다. src/lib/safety/
--    - 정지하는 순간 기록하고(user_id 연결), 정지를 풀면 지운다
--    - 정지된 채 계정이 지워지면 user_id가 null이 되고, 크론이 그날부터 3년 뒤를 expires_at으로 정해 그때 지운다
--    - 같은 신원으로 새로 가입하면 그 계정을 '재가입 제한'으로 정지한다
-- 2) 혼인 중이 아님 확인: consents에 'single'
-- 다시 실행해도 안전하다.

create table if not exists public.identity_bans (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('email', 'ci')),
  hash text not null,                                                  -- HMAC-SHA256(base64url). 원래 값은 남기지 않는다
  user_id uuid references auth.users (id) on delete set null,          -- 정지된 계정. 계정이 지워지면 null
  reason text,
  created_at timestamptz not null default now(),
  expires_at timestamptz,                                              -- 계정이 지워진 뒤에만 정해진다 (3년)
  unique (kind, hash)
);
create index if not exists identity_bans_user on public.identity_bans (user_id);

-- 서버만 쓴다 (정책 없음 + 권한 회수)
alter table public.identity_bans enable row level security;
revoke all on public.identity_bans from anon, authenticated;

alter table public.consents drop constraint if exists consents_kind_check;
alter table public.consents add constraint consents_kind_check
  check (kind in ('religion', 'photo_overseas', 'illustration', 'love_report', 'single'));

-- 이미 정지된 회원의 재가입 제한 기록은 해시 키가 서버에만 있어서 여기서 만들 수 없다.
-- 다음 크론(매일 저녁 8시)이 정지된 회원마다 채운다 (syncIdentityBans).
