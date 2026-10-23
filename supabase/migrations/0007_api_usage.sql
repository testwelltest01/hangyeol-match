-- OpenAI API 호출 기록 (관리자 'API 사용량': 용도별 호출 수·토큰·비용 추세). 호출마다 한 줄, 서버만 쓰고 읽는다.
-- 회원을 가리키는 값(사용자ID·검사ID)은 남기지 않는다. 비용은 기록하지 않고 볼 때 가격표(src/lib/usage/prices.ts)로 계산한다.
-- 크론이 400일 지난 기록을 지운다.
-- Supabase SQL Editor에서 실행한다. 0006_love_share.sql 다음에. 다시 실행해도 괜찮다.

create table if not exists public.api_usage (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  purpose text not null,            -- photo_feedback | illustration | love_report | scene_image (src/lib/usage/usage.ts PURPOSES)
  endpoint text not null,           -- chat | image_edit | image_generate
  model text not null,              -- 응답의 model (스냅숏 이름일 수 있다). 응답이 없으면 요청한 model
  ok boolean not null,
  unit boolean not null default true, -- 기능 1건으로 셀 호출 (연애 보고서는 두 번 나눠 부르는 것 중 첫 번째만)
  input_tokens integer,             -- usage가 없으면(실패·시간 초과) null
  cached_tokens integer,
  output_tokens integer,
  input_text_tokens integer,        -- 이미지 모델만: 입력 중 글
  input_image_tokens integer,       -- 이미지 모델만: 입력 중 이미지
  output_image_tokens integer,      -- 이미지 모델만: 출력 중 이미지
  reasoning_tokens integer,         -- 글 모델: 출력 중 추론 (출력에 이미 포함)
  duration_ms integer,
  error text                        -- 실패 이유 (HTTP 상태·오류 코드, 짧게)
);
create index if not exists api_usage_at on public.api_usage (at);

alter table public.api_usage enable row level security;
revoke all on table public.api_usage from anon, authenticated;

notify pgrst, 'reload schema';
