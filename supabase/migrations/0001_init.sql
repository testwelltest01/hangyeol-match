-- 한결 0단계 스키마
-- Supabase 대시보드 > SQL Editor에 그대로 붙여넣고 실행한다.

-- 기본 정보 ------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 12),
  gender text not null check (gender in ('male', 'female')),
  birth_year int not null check (birth_year between 1900 and 2100),
  agreed_privacy_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 검사 응답 원본 (단계마다 저장, 이어하기에 사용) --------------------------
create table if not exists public.test_answers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  version text not null,
  answers jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

-- 검사 점수 (서버가 계산해서 저장. 사용자는 읽기만 가능) -------------------
create table if not exists public.test_scores (
  user_id uuid primary key references auth.users (id) on delete cascade,
  version text not null,
  scores jsonb not null,
  computed_at timestamptz not null default now()
);

-- 친구 평가 초대 링크 --------------------------------------------------------
create table if not exists public.friend_invites (
  token text primary key,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 친구 평가 응답 (평가한 친구의 개인정보는 받지 않는다) --------------------
create table if not exists public.friend_ratings (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  answers jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists friend_ratings_user_id_idx on public.friend_ratings (user_id);

-- RLS -------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.test_answers enable row level security;
alter table public.test_scores enable row level security;
alter table public.friend_invites enable row level security;
alter table public.friend_ratings enable row level security;

-- 본인 기본 정보만 읽고 쓴다
create policy "profiles: 본인 조회" on public.profiles
  for select using ((select auth.uid()) = id);
create policy "profiles: 본인 생성" on public.profiles
  for insert with check ((select auth.uid()) = id);
create policy "profiles: 본인 수정" on public.profiles
  for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- 본인 응답만 읽고 쓴다
create policy "test_answers: 본인 조회" on public.test_answers
  for select using ((select auth.uid()) = user_id);
create policy "test_answers: 본인 생성" on public.test_answers
  for insert with check ((select auth.uid()) = user_id);
create policy "test_answers: 본인 수정" on public.test_answers
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- 점수는 본인이 읽기만 한다 (쓰기는 서버의 secret key로만)
create policy "test_scores: 본인 조회" on public.test_scores
  for select using ((select auth.uid()) = user_id);

-- 초대 링크는 본인 것만 읽고 만든다
create policy "friend_invites: 본인 조회" on public.friend_invites
  for select using ((select auth.uid()) = user_id);
create policy "friend_invites: 본인 생성" on public.friend_invites
  for insert with check ((select auth.uid()) = user_id);

-- friend_ratings에는 사용자 정책을 두지 않는다.
-- 친구 한 명의 응답을 개별로 볼 수 없게 하고, 서버가 3건 이상일 때만 평균을 보여준다.
