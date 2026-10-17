-- 한결 0006: 그림 프로필 (선택)
-- 회원이 고르면 실제 사진 2장과 프로필 정보 일부로 AI 그림을 만들고, 회원이 '보여주기'를 켜면 추천 카드에 보인다.
-- 실제 사진은 지금처럼 서로 관심을 보낸 뒤에만 공개된다.
-- Supabase SQL Editor에서 한 번 실행한다. 여러 번 실행해도 괜찮다.

create table if not exists public.illustrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null check (status in ('pending', 'done', 'failed')),
  path text,                                   -- Storage 'photos' 버킷 안의 그림 파일 (완료 후)
  model text not null,                         -- 쓴 이미지 모델
  prompt_version text not null,                -- src/lib/illustration/prompt.ts의 PROMPT_VERSION
  features jsonb not null,                     -- 프롬프트에 넣은 정보 (이름·지역·종교·연락처는 넣지 않는다)
  error text,
  shown boolean not null default false,        -- 회원이 추천 카드에 보여주기로 한 그림
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  deleted_at timestamptz                       -- 회원이 지웠거나 새 그림으로 정리된 시각 (파일도 지움)
);
create index if not exists illustrations_user on public.illustrations (user_id, created_at desc);
create index if not exists illustrations_day on public.illustrations (created_at);
-- 한 사람이 보여주는 그림은 하나
create unique index if not exists illustrations_one_shown on public.illustrations (user_id) where shown and deleted_at is null;

alter table public.illustrations enable row level security;
revoke all on table public.illustrations from anon, authenticated;

-- 그림을 만들려고 사진과 정보를 OpenAI로 보내는 데 대한 동의
alter table public.consents drop constraint if exists consents_kind_check;
alter table public.consents add constraint consents_kind_check check (kind in ('religion', 'photo_overseas', 'illustration'));
