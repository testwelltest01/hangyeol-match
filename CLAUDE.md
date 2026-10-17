# 한결 (hangyeol-match)

가치관 심리검사 기반 소개팅 웹 서비스. 1인 개발(최현석, 심리학 석사·심리측정). 진지한 연애, 이성 매칭만, 완전 무료, 웹 MVP.
기획서와 결정 이력은 README.md와 이 파일을 기준으로 한다. 사용자와는 한국어로 대화한다.

@AGENTS.md

## 명령

- `npm run dev` / `npm test` (vitest, `src/**/*.test.ts`) / `npx tsc --noEmit` / `npx eslint .` / `npx next build`
- 라우트 타입(`PageProps<"/경로">`)이 없다는 오류가 나면 `npx next typegen`
- 배포: GitHub `main`에 push하면 Vercel이 자동 배포 (https://hangyeol-match.vercel.app, 함수 리전 `icn1`)
- DB 변경은 `supabase/migrations/000N_*.sql`을 새로 만들고, 사용자가 Supabase SQL Editor에서 직접 실행한다 (0001, 0002 실행 완료 기준)

## Next.js 16 주의 (cacheComponents + partialPrefetching 켜짐)

- 세션·DB를 읽는 코드는 페이지 본문이 아니라 `<Suspense>` 안의 async Gate 컴포넌트에서 한다. 페이지 껍데기는 정적으로 남긴다.
- `src/lib/supabase/server.ts`의 `createClient()`는 `await connection()`으로 시작한다 (미리 렌더링 중 Date.now 오류 방지). 지우지 말 것.
- middleware 대신 `src/proxy.ts`. `params`, `searchParams`, `cookies()`는 모두 await.
- 서버 액션 본문 크기 4MB (`next.config.ts`), 사진 페이지는 `maxDuration = 60`.

## 보안 원칙 (바꾸지 말 것)

- 쓰기는 모두 서버 액션에서 검증 후 secret key(`createAdminClient`)로 한다. 0단계 테이블도 브라우저 쓰기 권한을 없앴다 (0002).
- 1단계 테이블(사진, 연락처, 종교, 추천, 관심·수락, 신고 등)은 RLS 정책 없음 + anon/authenticated 권한 회수. 서버만 접근.
- 서버 액션은 공개 주소다: 로그인, 입력 타입, 두 사람의 관계(`pairStage`)를 매번 확인하고, `allow()`로 요청 횟수를 제한한다.
- 연락처는 `src/lib/crypto.ts`(AES-256-GCM, `CONTACT_ENCRYPTION_KEY`)로 암호화. 사진은 비공개 버킷 + 10분 서명 주소.
- 비밀값은 `server-only` 모듈에서만 읽는다. 순수 함수는 테스트할 수 있게 server-only가 아닌 파일로 나눈다(`sniff.ts`, `photo/score.ts`).
- 로그인 실패·비밀번호 찾기에서 가입 여부를 드러내지 않는다.

## 구조

- 검사: `src/lib/items.ts`(문항, 바꾸면 `TEST_VERSION` 올림), `scoring.ts`(채점·상호 점수), `report.ts`
- 매칭: `src/lib/match/` — `filters.ts`(1층 하드 필터, 꼭/되도록), `explain.ts`(추천 이유), `allocate.ts`(하루 3명 라운드 로빈 배분, 노출 상한 6, 3층 게이트), `server.ts`(후보 풀, 추천 생성, 관계 단계), `dashboard.ts`, `me.ts`
- 지역: `src/lib/regions.ts` (2026-07 광주·전남 통합, 인천 제물포·영종·검단구 반영)
- 사진 AI 피드백: `src/lib/photo/feedback.ts` (OpenAI Chat Completions + JSON schema). 내부 점수는 추천에 쓰지 않는다
- 인증: `/signup`(이메일 코드 → 비밀번호), `/login`(비밀번호), `/reset`(코드 → 새 비밀번호), `/set-password`. `user_metadata.password_set`이 없으면 `/start`가 비밀번호 만들기로 보낸다
- 매일 크론: `/api/cron/daily` (`CRON_SECRET`, 15:00 UTC)

## 확정된 기획 결정

- 하루 3명 추천 → 서로 관심이면 사진 공개 → 서로 수락이면 인스타그램/카카오톡 ID 공개. 앱 내 채팅 없음
- 친구 평가가 1명 이상 있어야 매칭에 참여 (리포트의 매칭 시작 버튼, /match 준비 목록, 후보 풀 모두 같은 기준 `src/lib/match/rules.ts`)
- 사진 2장: 얼굴은 화면에서 촬영(`capture="user"`), 전신은 갤러리. 사진 올리기는 사람마다 하루 20번까지(얼굴·전신 합산, 거절 포함, `src/lib/photo/rules.ts`). AI 피드백 없이는 등록 불가, 미리보기 피드백 없음
- 지역은 시·군·구 직접 선택(양방향), 종교는 선택 입력 + 민감정보 별도 동의
- 키 조건: 상관없음 / 나보다 큼 / 나보다 작음 / 직접 범위, ±2cm 여유
- 꾸밈 문항은 모두 필수. 남자에게만 면도·수염(S1), 여자에게만 메이크업(S3)을 묻고, 이 문항은 꾸밈 수준 점수에 들어간다 (`TEST_VERSION` 2026-10-v2)
- ECR 애착 척도 넣지 않음, 파일럿 없음, 오프라인 이벤트 없음
- 개인정보 보호책임자: 최현석, testwelltest01@gmail.com. 교체 사진 30일 보관
- 본인인증(휴대폰)은 사업자등록이 필요해 보류. 공개 전에 초대제 비공개 테스트 권장

## UI 문구

- 친근한 존댓말, 짧고 구체적으로. 같은 행동을 하는 버튼을 한 화면에 두 번 두지 않는다
- 디자인 토큰은 `src/app/globals.css` (paper, ink, indigo, moss). 본문 Pretendard, 제목 Gowun Batang
