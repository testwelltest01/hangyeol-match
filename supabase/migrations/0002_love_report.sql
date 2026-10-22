-- 연애 상황 보고서 (선택): 검사 + AI(OpenAI)가 쓰는 장면별 보고서.
-- Supabase SQL Editor에서 실행한다. 0001_init.sql 다음에, 이어서 0003_love_retest.sql.
-- 이미 실행했어도 다시 실행해도 괜찮다 (있는 것은 건너뛴다).

-- 보고서용 국외 이전 동의 (검사 마지막 화면에서 따로 받는다)
alter table public.consents drop constraint if exists consents_kind_check;
alter table public.consents add constraint consents_kind_check
  check (kind in ('religion', 'photo_overseas', 'illustration', 'love_report'));

-- 처음 만들 때는 한 사람에 한 줄이었다 (0003에서 검사마다 한 줄로 바꾼다).
-- 실패(failed)하면 같은 답으로 다시 쓴다 (횟수에 세지 않음)
create table if not exists public.love_reports (
  user_id uuid primary key references auth.users (id) on delete cascade,
  version text not null,                 -- 문항 버전 (src/lib/love/items.ts LOVE_VERSION)
  answers jsonb not null,                -- 문항 응답 (1~5)
  scores jsonb not null,                 -- 척도 평균 (1~5)
  status text not null check (status in ('pending', 'done', 'failed')),
  report jsonb,                          -- AI가 쓴 보고서 (src/lib/love/prompt.ts LoveReport)
  model text,                            -- 쓴 모델
  prompt_version text,                   -- src/lib/love/prompt.ts PROMPT_VERSION
  error text,                            -- 실패 사유 (회원에게 보여주는 문장)
  tries integer not null default 1,      -- 쓰기 시도 수 (실패 포함)
  created_at timestamptz not null default now(),    -- 검사를 마친 시각
  started_at timestamptz not null default now(),    -- 마지막으로 쓰기 시작한 시각
  completed_at timestamptz
);
create index if not exists love_reports_started on public.love_reports (started_at);

alter table public.love_reports enable row level security;
revoke all on table public.love_reports from anon, authenticated;

-- API(PostgREST)가 새 표를 바로 알게 한다
notify pgrst, 'reload schema';
