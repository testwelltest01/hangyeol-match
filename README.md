# 한결

가치관 검사로 결이 맞는 사람을 추천하는 소개팅 웹 서비스입니다.

- **0단계**: 검사 → 관계 패턴 리포트 → 친구 평가
- **1단계 (매칭)**: 지역·조건 입력 → 사진 2장과 AI 피드백 → 하루 3명 추천 → 서로 관심이면 사진 공개 → 서로 수락하면 인스타그램·카카오톡 ID 공개 → 만남 후 피드백, 신고·차단

기술: Next.js 16 (App Router) + TypeScript + Tailwind CSS 4, Supabase (서울), Vercel (서울 `icn1`), OpenAI (사진 피드백)

## 화면

| 주소 | 내용 |
| --- | --- |
| `/` | 소개와 시작 버튼 |
| `/login` | 이메일 인증 코드 로그인 (처음이면 계정 자동 생성) |
| `/onboarding` | 닉네임, 성별, 출생연도, 개인정보 동의 |
| `/test` | 검사 13단계. 단계마다 저장돼서 이어하기 가능 |
| `/report` | 리포트, 친구 평가 링크, 매칭 시작 버튼 |
| `/f/[토큰]` | 친구 평가 (로그인 없이 10문항) |
| `/match` | 매칭 준비 체크리스트 또는 오늘의 추천, 진행 중인 연결 |
| `/people/[id]` | 추천된 사람 자세히 보기, 사진(서로 관심 후), 연락처(서로 수락 후), 만남 피드백, 신고·차단 |
| `/me` | 내 정보 메뉴, 매칭 쉬기, 로그아웃, 탈퇴 |
| `/me/profile` | 사는 지역, 키, 자기소개, 종교(선택, 민감정보 동의) |
| `/me/filters` | 원하는 상대 조건 (꼭/되도록), 실시간 맞는 사람 수 |
| `/me/photos` | 얼굴(카메라)·전신(갤러리) 사진과 AI 피드백 |
| `/me/contact` | 인스타그램·카카오톡 ID (암호화 저장) |
| `/privacy` | 개인정보처리방침 |
| `/api/cron/daily` | 매일 자정(한국) 추천 계산과 오래된 사진 파일 삭제. Vercel Cron 전용 |

## 1. Supabase 설정

1. 프로젝트 Region은 **Northeast Asia (Seoul)**.
2. **SQL Editor**에서 순서대로 한 번씩 실행합니다.
   - `supabase/migrations/0001_init.sql` (0단계, 이미 실행함)
   - `supabase/migrations/0002_matching.sql` (1단계 테이블, 사진 저장소, 보안 강화, 요청 횟수 제한)
3. **Authentication > URL Configuration**
   - Site URL: `https://hangyeol-match.vercel.app`
   - Redirect URLs: `http://localhost:3000/**`, `https://hangyeol-match.vercel.app/**`
4. **외부 SMTP**(Gmail 앱 비밀번호)와 **메일 템플릿**(인증 코드 `{{ .Token }}` 포함)은 0단계에서 설정 완료.
5. **Project Settings > API Keys**에서 URL, publishable key, secret key를 복사해둡니다.

## 2. 환경 변수

`.env.example`을 `.env.local`로 복사해 채우고, Vercel **Settings > Environment Variables**에도 똑같이 넣습니다.

| 이름 | 설명 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 브라우저에 보여도 되는 값 |
| `SUPABASE_SECRET_KEY` | 서버 전용. 모든 데이터를 읽고 쓸 수 있으니 절대 공개 금지 |
| `OPENAI_API_KEY`, `OPENAI_VISION_MODEL` | 사진 피드백. 모델은 테스트한 `gpt-6-luna` |
| `CONTACT_ENCRYPTION_KEY` | 연락처 암호화 키. 한 번 정하면 바꾸지 말고 따로 보관 |
| `CRON_SECRET` | 매일 추천 계산 주소를 보호하는 비밀값 |

비밀값 만들기 (Node가 설치된 아무 터미널):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # CONTACT_ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"      # CRON_SECRET
```

## 3. 실행과 배포

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 단위 테스트
```

배포는 GitHub `main`에 push하면 Vercel이 자동으로 합니다. `vercel.json`이 서버 기능을 서울(`icn1`)에 고정하고, 매일 15:00 UTC(한국 자정)에 `/api/cron/daily`를 부릅니다. Hobby 요금제의 Cron은 정해진 시각부터 1시간 안에 실행돼요. Cron이 늦어도 사용자가 `/match`를 열 때 오늘 추천이 없으면 그 자리에서 만듭니다.

## 매칭 규칙 (기획서 '매칭 방식과 필터', '추천 알고리즘')

- **1층 하드 필터** (`src/lib/match/filters.ts`): 나이, 지역(양방향), 키(±2cm 여유), 흡연, 결혼·자녀 정반대, 종교. 조건마다 "꼭/되도록". "꼭"이 하나라도 어긋나면 서로 노출하지 않음.
- **2층 소프트 점수**: 가치관 유사도 조화평균(`scoring.ts`의 `mutualScore`) × "되도록" 조건이 어긋날 때마다 0.85.
- **3층 행동 게이트** (`allocate.ts`의 `gateFactor`): 만남 후 평가가 나쁜 기록(노쇼, 사진 불일치·청결·매너 2점 이하)이 2건이면 노출 0.6배, 4건이면 0.3배.
- **배분**: 후보가 적은 사람부터 한 명씩 고르는 라운드 로빈. 한 사람이 하루에 다른 사람 추천에 들어가는 횟수는 최대 6번. 먼저 관심을 보낸 사람은 우선. 넘긴 사람은 다시 안 나오고, 답하지 않은 사람은 14일 뒤 다시 나올 수 있음.
- **사진**: 처음 등록은 제한 없음, 교체는 한국 날짜 기준 하루 한 번. AI 분석 시도는 하루 10번. 거절된 사진은 저장하지 않음. 피드백을 못 받으면 등록 안 됨. 내부 점수는 추천에 쓰지 않음.

## 보안 설계

**데이터 접근**
- 1단계 테이블(사진, 연락처, 종교, 추천, 관심·수락, 신고, 만남 피드백)은 RLS를 켜고 정책을 두지 않았고, 브라우저 역할(anon, authenticated)의 권한도 뺐습니다. 브라우저에서는 어떤 방법으로도 직접 읽거나 쓸 수 없고, 서버가 로그인 사용자를 확인한 뒤 secret key로만 처리합니다.
- 0단계 테이블(profiles, test_answers, friend_invites)도 브라우저에서 직접 쓰는 권한을 없앴습니다. 직접 쓸 수 있으면 출생연도를 바꿔 나이 확인을 건너뛸 수 있기 때문입니다. 본인 읽기만 남겼습니다.
- 다른 사람 화면(`/people/[id]`)은 추천받았거나 관심·수락으로 이어진 경우에만 열리고, 그 밖에는 존재 여부도 알려주지 않습니다(404). 사진은 서로 관심 후, 연락처는 서로 수락 후에만 서버가 꺼냅니다.

**저장**
- 연락처는 서버에서 AES-256-GCM으로 암호화해 저장합니다(`src/lib/crypto.ts`). DB가 유출돼도 키 없이는 읽을 수 없습니다.
- 사진은 비공개 버킷에 두고, 볼 권한이 있는 사람에게만 10분짜리 서명 주소로 보여줍니다. 업로드 전에 기기에서 다시 그려서 위치 정보(EXIF)를 지우고, 서버는 파일 앞부분(매직 바이트)으로 실제 이미지인지 확인합니다.
- 비밀값(secret key, OpenAI 키, 암호화 키, Cron 비밀값)은 서버 전용 모듈(`server-only`)에서만 읽습니다.

**요청**
- 모든 서버 액션은 공개 주소로 보고 매번 로그인, 입력 타입, 관계를 다시 확인합니다. Next.js가 다른 사이트에서 보낸 요청(CSRF)을 막습니다.
- 요청 횟수 제한(`hit_rate_limit` DB 함수, `src/lib/security.ts`): 친구 평가 IP당 시간 10회·링크당 하루 20회, 조건 인원 세기 분당 40회, 관심·수락 시간당 300회, 신고 하루 20회, 사진 시간당 30회 등.
- 신고 3건(서로 다른 신고자)이 쌓이면 운영자가 확인할 때까지 매칭이 자동으로 멈춥니다(`user_flags`).
- Cron 주소는 `CRON_SECRET`이 없으면 401입니다.

**브라우저**
- 보안 헤더(`next.config.ts`): CSP(불러올 수 있는 곳을 이 사이트, Supabase, 폰트 CDN으로 제한), 다른 사이트 안에 넣기 금지(클릭재킹), HSTS, nosniff, Referrer-Policy, Permissions-Policy.
- 로그인 후 화면과 친구 평가 링크는 검색엔진에 노출하지 않습니다(`X-Robots-Tag`).

**운영자가 할 일**
- [ ] Google, GitHub, Vercel, Supabase, OpenAI 계정 모두 2단계 인증 켜기 (가장 중요)
- [ ] Supabase **Authentication > Providers > Email**: Email OTP Expiration을 `600`(10분)으로 줄이기
- [ ] OpenAI 대시보드에서 월 사용 한도(Usage limits) 정하기
- [ ] GitHub 저장소 Settings > Code security에서 Dependabot alerts 켜기
- [ ] 신고 확인: Supabase Table Editor의 `reports`(처리하면 `resolved_at` 채우기), 정지 해제는 `user_flags`의 `suspended_at` 비우기

## 공개 전에 할 일

- [x] `/privacy` 시행일과 보호책임자 성명
- [x] 외부 SMTP
- [ ] 1단계 처리방침(사진 국외 이전, 종교 민감정보 포함) 전문가 검토
- [ ] 본인인증(휴대폰): 사업자등록과 인증 업체 계약이 필요해서 보류
- [ ] 실제 기기에서 남녀 테스트 계정으로 추천 → 관심 → 사진 → 수락 → 연락처까지 확인

## 개발 메모

- 문항: `src/lib/items.ts` (바꾸면 `TEST_VERSION` 올리기)
- 채점과 상호 점수: `src/lib/scoring.ts`
- 매칭: `src/lib/match/` (filters 조건, explain 추천 이유, allocate 배분, server 후보·추천 생성, dashboard 추천 화면 데이터)
- 지역: `src/lib/regions.ts` (2026-07 광주·전남 통합, 인천 제물포·영종·검단구 반영)
- 사진 피드백 프롬프트: `src/lib/photo/feedback.ts` (파이썬 테스트본과 같은 내용)
- 테스트 계정 여러 개: Gmail 주소에 `+a`, `+b`를 붙이면 같은 받은편지함으로 받으면서 계정을 따로 만들 수 있음
