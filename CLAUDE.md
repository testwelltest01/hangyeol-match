# 한결 (hangyeol-match)

가치관 심리검사 기반 소개팅 웹 서비스. 1인 개발(최현석, 심리학 석사·심리측정). 진지한 연애, 이성 매칭만, 완전 무료, 웹 MVP.
기획서와 결정 이력은 README.md와 이 파일을 기준으로 한다. 사용자와는 한국어로 대화한다.

@AGENTS.md

## 명령

- `npm run dev` / `npm test` (vitest, `src/**/*.test.ts`) / `npx tsc --noEmit` / `npx eslint .` / `npx next build`
- 라우트 타입(`PageProps<"/경로">`)이 없다는 오류가 나면 `npx next typegen`
- 배포: GitHub `main`에 push하면 Vercel이 자동 배포 (https://hangyeol-match.vercel.app, 함수 리전 `icn1`)
- DB 변경은 `supabase/migrations/000N_*.sql`을 새로 만들고, 사용자가 Supabase SQL Editor에서 직접 실행한다 (0001, 0002 실행 완료 기준. 0003 방문 기록, 0004 추가 검사·사진 거절 사유, 0005 대화방, 0006 그림 프로필, 0007 알림 구독은 작성만 됨)

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
- 관리자 엑셀에는 이메일·연락처·종교·사진을 넣지 않는다. 회원은 사용자ID로 가리킨다.
- 비밀값은 `server-only` 모듈에서만 읽는다. 순수 함수는 테스트할 수 있게 server-only가 아닌 파일로 나눈다(`sniff.ts`, `photo/score.ts`).
- 로그인 실패·비밀번호 찾기에서 가입 여부를 드러내지 않는다.

## 구조

- 검사: `src/lib/items.ts`(문항, 바꾸면 `TEST_VERSION` 올림), `scoring.ts`(채점·상호 점수), `report.ts`
- 매칭: `src/lib/match/` — `filters.ts`(1층 하드 필터, 꼭/되도록), `explain.ts`(추천 이유), `allocate.ts`(하루 3명 라운드 로빈 배분, 노출 상한 6, 3층 게이트), `server.ts`(후보 풀, 추천 생성, 관계 단계), `dashboard.ts`, `me.ts`
- 추천 화면은 탭 3개: `/match`(오늘), `/match/interest`(관심), `/match/connected`(연결). 공통 틀·탭·데이터(`loadMatch`, React `cache`)는 `src/app/match/frame.tsx`. 탭 숫자는 내가 답할 사람 수(관심: 사진 공개 후 수락 차례, 연결: 만남 피드백)
- 지역: `src/lib/regions.ts` (2026-07 광주·전남 통합, 인천 제물포·영종·검단구 반영)
- 사진 AI 피드백: `src/lib/photo/feedback.ts` (OpenAI Chat Completions + JSON schema). 내부 점수는 추천에 쓰지 않는다
- 인증: `/signup`(이메일 코드 → 비밀번호), `/login`(비밀번호), `/reset`(코드 → 새 비밀번호), `/set-password`. `user_metadata.password_set`이 없으면 `/start`가 비밀번호 만들기로 보낸다
- 가상 매칭 둘러보기 `/tour`: 첫 소개까지 길게 느껴지는 걸 덜려고 가입 직후부터(로그인 없이도) 체험. 가상 인물 2명은 `src/lib/tour/personas.ts`(남성에게 여성 '윤슬', 여성에게 남성 '도담'), 사진은 `public/tour/`. 화면 안에서만 진행하고 서버 액션·DB 쓰기 없음. 성별을 모르면(가입 직후·로그인 전) 화면에서 고르고 저장하지 않는다. 끝에 진짜 소개까지 남은 단계(`setupSteps`와 같은 목록)와 다음 단계 버튼. 들어오는 곳은 `TourInvite`(/onboarding, /test, /match 준비 중)와 첫 화면 링크
- PWA: `src/app/manifest.ts`(start_url `/start`), 아이콘 `public/icons/`(결 글자, 고운바탕), 서비스 워커 `public/sw.js`(알림 표시·누르면 열기, 화면 이동이 실패하면 `offline.html`. 로그인 화면·데이터는 캐시하지 않는다. 바꾸면 VERSION 올림), 등록은 `PwaRegister`(루트 레이아웃, 운영에서만). 설치 안내·알림 켜기는 내 정보 `#app`(`AppSettings`)과 추천 화면 위 `PushNudge`
- 알림(웹 푸시, 0007 `push_subscriptions`): `src/lib/push/rules.ts`(순수: 구독 검사, 문구, 대화 알림 판단), `server.ts`(web-push로 보내기, 404·410 구독 정리), `client.ts`(브라우저). 구독 저장은 `src/app/me/push-actions.ts`, 푸시 서버 주소는 FCM·Apple·Mozilla·WNS만 받는다(SSRF 방지). 보내는 때: 매일 저녁 새 추천(크론), 서로 관심, 서로 수락, 새 메시지(상대가 1분 안에 읽고 있었거나 안 읽은 내 메시지가 있으면 건너뜀), 연락처 전달 요청(쌍마다 하루 3번)·교환. 모두 `after()`로 응답 뒤에. 문구에는 상대 닉네임만(대화 내용·사진·연락처 없음). 로그아웃하면 그 기기 구독을 푼다. 키: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`(없으면 알림만 꺼짐)
- 매일 크론: `/api/cron/daily` (`CRON_SECRET`, 11:00 UTC = 한국 저녁 8시, Hobby는 1시간 안에 실행). 추천의 하루는 `matchDay()`(`src/lib/day.ts`, 저녁 8시에 다음 날 이름으로 넘어감). 하루 상한·통계는 `kstDay()`(자정) 그대로. 크론이 새 추천을 받은 사람에게 '오늘의 추천이 도착했어요' 알림(`sendPushMany`). 크론보다 먼저 들어온 사람은 `loadMatch`가 그 자리에서 만들고 알림은 보내지 않는다
- 관리자: `/admin`(대시보드), `/admin/users`(목록), `/admin/users/[id]`(상세·리포트), `/admin/export`(엑셀, exceljs). 판별은 `src/lib/admin/auth.ts`(`ADMIN_EMAILS`, 기본 testwelltest01@gmail.com, `password_set` 필수), 관리자가 아니면 `notFound()`. `/start`는 관리자를 `/admin`으로 보낸다. 관리자 화면 틀은 Suspense 안 Gate에서 확인 뒤에 그린다(정적 껍데기에 메뉴를 넣지 않는다). 계산은 `stats.ts`(순수), 데이터는 `data.ts`, 엑셀은 `workbook.ts`(순수)·`export.ts`
- 관리자 추세 `/admin/trends`: `trends.ts`(순수)·`trendData.ts`. 방문 기록은 `activity_events`(0003)에 `getUserId`/`getAuth`가 `trackVisit`(`after` + `log_visit` RPC, 30분 간격, 관리자 제외)로 남기고 크론이 90일 뒤 지운다
- 관리자 LPA `/admin/lpa`: `lpa.ts`(대각 공분산 가우시안 혼합 EM, 분산 같음=Mplus 기본/분산 다름, 고정 시드, 시작값 100/20을 데이터 크기에 맞춰 줄임, scikit-learn과 로그우도 대조 완료), `lpaSets.ts`(지표 묶음), `mplus.ts`(.dat/.inp/대응표). LMR·BLRT는 계산하지 않고 Mplus 파일로 넘긴다

## 확정된 기획 결정

- 하루 3명 추천 → 서로 관심이면 사진 공개 → 서로 수락이면 대화방(`/chat/[id]`, 한 사람당 49개 = '서로 50회 미만', 500자, `src/lib/chat/rules.ts`) → 둘 다 '연락처 전달'을 누르면 인스타그램/카카오톡 ID 공개 (2026-10-17 변경, 이전엔 수락 즉시 공개)
- 대화: 테이블 서버 전용(0005), 보내기·연락처 전달은 서버 액션 + DB 함수(방 잠금으로 한도·순번 보장), 새 메시지는 `GET /api/chat/[id]?after=` 폴링(서버 액션은 순차 실행이라 받기와 분리, 대화 중 2.5초→조용하면 15초, 화면 가리면 멈춤). 대화창에 연락처·아이디 모양은 막는다. 내용은 마지막 대화 후 90일 뒤 크론이 지우고 메타데이터(순번, 말차례, 글자 수, 응답 초)는 남긴다. 관리자는 신고가 있는 대화만 내용 열람, 엑셀은 메타데이터만. 0005 전에는 예전처럼 수락 즉시 연락처 공개(`getChatRoom().available`)
- 친구 평가가 1명 이상 있어야 매칭에 참여 (리포트의 매칭 시작 버튼, /match 준비 목록, 후보 풀 모두 같은 기준 `src/lib/match/rules.ts`)
- 사진 2장: 얼굴은 바로 찍기(`capture="user"`) 또는 갤러리에서 고르기, 전신은 갤러리. 사진 올리기는 계정당 20번까지(평생, 얼굴·전신 합산, 거절 포함, AI 장애 실패 제외, `PHOTO_UPLOADS_PER_ACCOUNT` in `src/lib/photo/rules.ts`). AI 피드백 없이는 등록 불가, 미리보기 피드백 없음
- 지역은 시·군·구 직접 선택(양방향), 종교는 선택 입력 + 민감정보 별도 동의
- 키 조건: 상관없음 / 나보다 큼 / 나보다 작음 / 직접 범위, ±2cm 여유
- 음주(검사 D4, `TEST_VERSION` 2026-10-v3): 마시지 않음 / 가끔(한 달 1~2번 이하) / 주 1~2번 / 주 3번 이상. 원하는 상대 조건은 상관없음 / 주 3번 이상만 아니면 / 가끔 이하 / 안 마시는 사람만 + 꼭/되도록. v3 전에 검사를 마친 사람은 `/match`·`/me`의 `DrinkingQuestion`으로 한 번 답한다(`saveDrinking`, 이미 답했으면 바꾸지 않음). 답하기 전에는 음주 조건을 건 사람에게 '꼭'이면 안 보이고 '되도록'이면 감점. 저장된 예전 조건에 음주가 없으면 `withFilterDefaults`가 '상관없음'으로 채운다
- 꾸밈 문항은 모두 필수. 남자에게만 면도·수염(S1), 여자에게만 메이크업(S3)을 묻고, 이 문항은 꾸밈 수준 점수에 들어간다 (`TEST_VERSION` 2026-10-v2)
- ECR 애착 척도 넣지 않음, 파일럿 없음, 오프라인 이벤트 없음
- 추가 검사(선택)는 상표·저작권 문제가 없는 한결 자체 문항만 쓴다 (MBTI, 에니어그램, 5가지 사랑의 언어, BFI-2, HEXACO-PI-R은 쓰지 않음. 공개 도메인 IPIP는 가능). `src/lib/extra/tests.ts`(문항 바꾸면 그 검사 version 올림), 결과는 리포트 '더 알아보기'와, 보여주기를 켠 경우 상대 자세히 보기에 요약·공통점으로. 추천 계산에는 쓰지 않는다
- 그림 프로필(선택, `/me/illustration`): 사진 2장 + 성별·나이대·키·자기소개·성향·생활·꾸밈·추가 검사 요약으로 OpenAI Images Edits(`OPENAI_IMAGE_MODEL`, 기본 gpt-image-2.5-sunburst, medium, 1024x1536 webp). 이름·지역·종교·연락처·위생·조건은 넣지 않는다(`src/lib/illustration/prompt.ts`, 바꾸면 PROMPT_VERSION). 특정 스튜디오·작가 이름은 프롬프트에 쓰지 않고 화풍을 묘사한다. 별도 동의(consents 'illustration'), 한 계정당 3번(평생, 실패 제외, 지운 그림 포함 `ILLUSTRATIONS_PER_ACCOUNT`), 서비스 전체 하루 상한, 응답 뒤 after()로 생성(페이지 maxDuration 300). 회원이 '추천 카드에 보여주기'를 켠 그림만 추천 카드·자세히 보기(사진 공개 전)에 보인다
- 사진 시도 기록(`photo_attempts.detail`)에 거절 사유를 남긴다. 거절된 사진 파일은 저장하지 않는다. 관리자 회원 상세에 사진별 피드백·내부 점수 기록
- 개인정보 보호책임자: 최현석, testwelltest01@gmail.com. 교체 사진 1년 보관 (크론 `KEEP_REPLACED_DAYS`)
- 둘러보기의 가상 인물에는 항상 '가상 인물' 표시와 '실제 회원이 아니에요' 안내를 붙인다. 가상 인물을 추천·후보 풀에 섞지 않는다
- 본인인증(휴대폰)은 사업자등록이 필요해 보류. 공개 전에 초대제 비공개 테스트 권장

## UI 문구

- 친근한 존댓말, 짧고 구체적으로. 같은 행동을 하는 버튼을 한 화면에 두 번 두지 않는다
- 상단 메뉴: 로그인 후 `추천 / 내 결 / 내 정보 / 편지`(`<Shell nav="…">` → `AppNav`), 로그인 전 `편지`(+ `right`로 로그인 등). 시험 기간이라 만든 사람의 편지(`/letter`)는 하단이 아니라 상단 메뉴에 둔다
- 디자인 토큰은 `src/app/globals.css` (paper, ink, indigo, moss). 본문 Pretendard, 제목 Gowun Batang
