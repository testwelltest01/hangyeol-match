-- 한결 1단계: 매칭
-- SQL Editor에 통째로 붙여넣고 한 번 실행한다. (0001_init.sql을 먼저 실행해 둔 상태여야 한다)
--
-- 이 파일의 테이블은 모두 RLS를 켜고 사용자용 정책을 두지 않는다.
-- 사용자는 브라우저에서 직접 읽거나 쓸 수 없고, 서버(secret key)가 로그인 사용자를 확인한 뒤에만 접근한다.
-- 종교(민감정보), 연락처, 사진 내부 점수처럼 노출되면 안 되는 값이 섞여 있어서 이렇게 막는다.

-- 매칭용 내 정보와 원하는 상대 조건 -------------------------------------------
create table public.match_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  region text not null,                                   -- 내 지역 '시도|시군구'
  height smallint not null check (height between 130 and 230),
  intro text not null default '' check (char_length(intro) <= 300),
  religion text check (religion in ('none', 'protestant', 'catholic', 'buddhist', 'other')),  -- 선택 입력 (민감정보)
  filters jsonb not null,                                 -- 원하는 상대 조건 (src/lib/match/filters.ts)
  paused boolean not null default false,                  -- 매칭 쉬기
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 별도 동의 기록 (종교 = 민감정보, 사진 = 국외 이전) ----------------------------
create table public.consents (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('religion', 'photo_overseas')),
  agreed_at timestamptz not null default now(),
  primary key (user_id, kind)
);

-- 프로필 사진 ------------------------------------------------------------------
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slot text not null check (slot in ('face', 'body')),
  path text not null,                    -- Storage 'photos' 버킷 안의 경로
  feedback jsonb not null,               -- 사용자에게 보여주는 AI 피드백
  internal jsonb not null,               -- 내부 점수. 사용자에게 보여주지 않고 추천에도 쓰지 않는다
  created_at timestamptz not null default now(),
  replaced_at timestamptz,               -- 새 사진으로 바뀐 시각. 30일 뒤 파일을 지운다
  purged_at timestamptz                  -- 파일을 지운 시각
);
create unique index photos_one_active on public.photos (user_id, slot) where replaced_at is null;
create index photos_to_purge on public.photos (replaced_at) where replaced_at is not null and purged_at is null;

-- AI 사진 분석 시도 기록 (하루 시도 횟수 제한용) -------------------------------
create table public.photo_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  slot text not null,
  result text not null,                  -- 'registered' | 'rejected' | 'error'
  created_at timestamptz not null default now()
);
create index photo_attempts_user_time on public.photo_attempts (user_id, created_at);

-- 연락처 (서버에서 AES-256-GCM으로 암호화한 값만 저장) ---------------------------
create table public.contacts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  instagram text,
  kakao text,
  updated_at timestamptz not null default now(),
  check (instagram is not null or kakao is not null)
);

-- 하루 추천 --------------------------------------------------------------------
create table public.recommendations (
  user_id uuid not null references auth.users (id) on delete cascade,   -- 추천을 받는 사람
  target_id uuid not null references auth.users (id) on delete cascade, -- 추천된 사람
  day date not null,                                                   -- 한국 날짜
  score real not null,
  reason text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day, target_id)
);
create index recommendations_target_day on public.recommendations (target_id, day);

-- 관심·수락 --------------------------------------------------------------------
create table public.reactions (
  from_user uuid not null references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  interest boolean not null,             -- true 관심 있어요 / false 넘기기
  accept boolean,                        -- 사진 공개 뒤 true 수락 / false 거절
  interest_at timestamptz not null default now(),
  accept_at timestamptz,
  primary key (from_user, to_user),
  check (from_user <> to_user)
);
create index reactions_to_user on public.reactions (to_user);

-- 차단·신고 --------------------------------------------------------------------
create table public.blocks (
  blocker uuid not null references auth.users (id) on delete cascade,
  blocked uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked)
);
create index blocks_blocked on public.blocks (blocked);

create table public.reports (
  id bigint generated always as identity primary key,
  reporter uuid references auth.users (id) on delete set null,
  target uuid not null references auth.users (id) on delete cascade,
  reason text not null,
  detail text check (char_length(detail) <= 500),
  created_at timestamptz not null default now(),
  resolved_at timestamptz                -- 운영자가 확인한 시각
);
create index reports_target on public.reports (target);

-- 만남 후 피드백 (행동 기반 게이트) ----------------------------------------------
create table public.meeting_feedback (
  from_user uuid not null references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  outcome text not null check (outcome in ('met', 'not_yet', 'no_contact', 'no_show')),
  photo_match smallint check (photo_match between 1 and 5),   -- 사진과 실제 인상이 비슷했나요
  cleanliness smallint check (cleanliness between 1 and 5),   -- 깔끔한 인상이었나요
  manners smallint check (manners between 1 and 5),           -- 매너가 좋았나요
  again smallint check (again between 1 and 5),               -- 다시 만나고 싶나요
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (from_user, to_user)
);
create index meeting_feedback_to_user on public.meeting_feedback (to_user);

-- 운영자 조치 (이용 정지) -------------------------------------------------------
create table public.user_flags (
  user_id uuid primary key references auth.users (id) on delete cascade,
  suspended_at timestamptz,
  reason text,
  updated_at timestamptz not null default now()
);

-- RLS: 켜기만 하고 정책은 두지 않는다 (서버 전용) ------------------------------
alter table public.match_profiles enable row level security;
alter table public.consents enable row level security;
alter table public.photos enable row level security;
alter table public.photo_attempts enable row level security;
alter table public.contacts enable row level security;
alter table public.recommendations enable row level security;
alter table public.reactions enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.meeting_feedback enable row level security;
alter table public.user_flags enable row level security;

-- 사진 저장소: 비공개 버킷. 사진은 서버가 만든 10분짜리 서명 주소로만 보인다 ---------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- ============================================================================
-- 보안 강화
-- ============================================================================

-- 1) 서버 전용 테이블은 브라우저용 역할(anon, authenticated)의 권한을 아예 뺀다.
--    RLS 정책이 없어서 이미 막혀 있지만, 정책을 실수로 추가해도 열리지 않게 한 겹 더 막는다.
revoke all on table
  public.match_profiles, public.consents, public.photos, public.photo_attempts, public.contacts,
  public.recommendations, public.reactions, public.blocks, public.reports, public.meeting_feedback,
  public.user_flags, public.friend_ratings
from anon, authenticated;

-- 2) 0단계 테이블: 사용자가 브라우저에서 직접 쓰지 못하게 한다. 읽기(본인 것)만 남긴다.
--    직접 쓸 수 있으면 출생연도·성별을 바꿔 나이 확인을 건너뛰거나 검사 응답을 조작할 수 있다.
--    쓰기는 모두 서버가 검증한 뒤 secret key로 한다.
drop policy if exists "profiles: 본인 생성" on public.profiles;
drop policy if exists "profiles: 본인 수정" on public.profiles;
drop policy if exists "test_answers: 본인 생성" on public.test_answers;
drop policy if exists "test_answers: 본인 수정" on public.test_answers;
drop policy if exists "friend_invites: 본인 생성" on public.friend_invites;
revoke insert, update, delete on table public.profiles, public.test_answers, public.test_scores, public.friend_invites
from anon, authenticated;
revoke all on table public.profiles, public.test_answers, public.test_scores, public.friend_invites from anon;

-- 3) 요청 횟수 제한 (서버에서만 호출). 같은 키로 정해진 시간 안에 limit번을 넘으면 false
create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null,
  count integer not null
);
alter table public.rate_limits enable row level security;
revoke all on table public.rate_limits from anon, authenticated;

create or replace function public.hit_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update set
    count = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.count + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning count into v_count;
  return v_count <= p_limit;
end;
$$;
revoke all on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
