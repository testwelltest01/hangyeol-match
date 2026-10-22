-- 연애 상황 보고서의 장면 사진 (장면 10가지마다 한 장, 모든 보고서가 같이 쓴다. 회원 사진이 아니다).
-- 관리자 화면에서 OpenAI 이미지 생성으로 만들어 공개 버킷 'scenes'에 두고, 이 표에 어떤 파일을 쓸지와 상태를 남긴다.
-- Supabase SQL Editor에서 실행한다. 0004_love_guest.sql 다음에. 다시 실행해도 괜찮다.

-- 공개 버킷: 누구나 주소로 읽을 수 있다 (개인정보가 없는 예시 사진만 둔다). 올리기는 서버(secret key)만
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('scenes', 'scenes', true, 3145728, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;

create table if not exists public.love_scene_images (
  scene text primary key,                -- src/lib/love/prompt.ts SITUATIONS의 id
  status text not null check (status in ('pending', 'done', 'failed')),
  path text,                             -- 'scenes' 버킷 안의 파일 (완료 후)
  model text,
  prompt_version text not null,          -- src/lib/love/scenes.ts SCENE_PROMPT_VERSION
  error text,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.love_scene_images enable row level security;
revoke all on table public.love_scene_images from anon, authenticated;

notify pgrst, 'reload schema';
