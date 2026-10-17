# 한결

가치관 검사로 결이 맞는 사람을 추천하는 소개팅 웹 서비스입니다.

- **0단계**: 검사 → 관계 패턴 리포트 → 친구 평가
- **1단계 (매칭)**: 지역·조건 입력 → 사진 2장과 AI 피드백 → 하루 3명 추천 → 서로 관심이면 사진 공개 → 서로 수락하면 인스타그램·카카오톡 ID 공개 → 만남 후 피드백, 신고·차단

기술: Next.js 16 (App Router) + TypeScript + Tailwind CSS 4, Supabase (서울), Vercel (서울 `icn1`), OpenAI (사진 피드백)

## 화면

| 주소 | 내용 |
| --- | --- |
| `/` | 소개와 시작 버튼 |
| `/signup` | 가입: 이메일 인증 코드로 확인 → 비밀번호 만들기 |
| `/login` | 이메일 + 비밀번호 로그인 |
| `/reset` | 비밀번호 찾기: 이메일 인증 코드로 확인 → 새 비밀번호 |
| `/set-password` | 비밀번호 만들기·바꾸기 (코드로만 가입한 예전 계정도 여기로 와서 한 번 만든다) |
| `/onboarding` | 닉네임, 성별, 출생연도, 개인정보 동의 |
| `/test` | 검사 13단계. 단계마다 저장돼서 이어하기 가능 |
| `/report` | 리포트, 친구 평가 링크, 매칭 시작 버튼 |
| `/extra/[id]` | 더 알아보기(선택): 마음이 전해지는 순간, 위로가 필요할 때, 대화 코드. 한결 자체 시범 문항, 추천 계산에는 안 씀 |
| `/f/[토큰]` | 친구 평가 (로그인 없이 10문항) |
| `/match` | 오늘 탭: 매칭 준비 체크리스트 또는 오늘의 추천 3명 |
| `/match/interest` | 관심 탭: 서로 관심(사진 공개, 수락 차례), 내가 수락한 사람, 내가 관심을 보낸 사람 |
| `/match/connected` | 연결 탭: 연락처가 공개된 사람, 만남 피드백 요청 |
| `/chat/[id]` | 서로 수락한 두 사람의 대화방 (한 사람당 49개), 연락처 전달 (둘 다 누르면 공개) |
| `/people/[id]` | 추천된 사람 자세히 보기, 사진(서로 관심 후), 연락처(서로 수락 후), 만남 피드백, 신고·차단 |
| `/me` | 내 정보 메뉴, 매칭 쉬기, 로그아웃, 탈퇴 |
| `/me/profile` | 사는 지역, 키, 자기소개, 종교(선택, 민감정보 동의) |
| `/me/filters` | 원하는 상대 조건 (꼭/되도록), 실시간 맞는 사람 수 |
| `/me/photos` | 얼굴(카메라 또는 갤러리)·전신(갤러리) 사진과 AI 피드백 |
| `/me/illustration` | 그림 프로필(선택): 사진 2장과 자기소개·성향으로 AI 그림, 보여주기를 켜면 추천 카드에 |
| `/me/contact` | 인스타그램·카카오톡 ID (암호화 저장) |
| `/privacy` | 개인정보처리방침 |
| `/letter` | 만든 사람의 편지 (상단 메뉴 '편지') |
| `/admin` | 관리자 대시보드: 가입·검사·매칭 숫자, 단계별 전환, 최근 14일, 성별·나이대, 신고 처리, 이용 정지 |
| `/admin/users` | 관리자 회원 목록 (닉네임·이메일·ID 검색, 단계로 거르기) |
| `/admin/users/[id]` | 관리자 회원 상세: 기본 정보, 매칭 준비, 자기소개·사진, 관심·수락 기록, 신고, 만남 피드백, 원점수, 회원이 보는 리포트 |
| `/admin/trends` | 관리자 추세: 방문·가입·검사 완료·관심·수락·사진·친구 평가를 성별로 날짜별·시간대별·요일별·요일×시간 |
| `/admin/lpa` | 관리자 잠재프로파일분석: 성격 5요인·영역 중요도·가치관 24문항, 1~6개 프로필 적합도, 프로필 그림, 성별 분포, AvePP, Mplus 파일 |
| `/admin/extra` | 관리자 추가 검사: 하위척도 평균·표준편차(성별), 크론바흐 α, 유형 분포 |
| `/admin/chats/[roomId]` | 관리자 대화 보기: 요약·이벤트·메시지 정보. 내용은 두 사람 사이에 신고가 있을 때만 |
| `/admin/export` | 관리자 엑셀 내려받기 (회원, 검사 점수, 문항 응답, 문항 목록, 친구 평가, 관심·수락, 최근 60일 추천, 만남 피드백, 신고) |
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
   - 이 메일(Magic link 템플릿)은 가입과 비밀번호 찾기에 함께 쓰이므로, 제목은 `한결 인증 코드`, 본문 첫 줄은 `한결 인증 코드`로 바꿔두면 자연스러워요.
5. **Authentication > Providers > Email** (또는 Sign In / Providers)
   - Email 로그인 켜짐 확인
   - Minimum password length: `8`, Password requirements: `Letters and digits`
   - Email OTP Expiration: `600`초(10분)
6. **Project Settings > API Keys**에서 URL, publishable key, secret key를 복사해둡니다.

## 2. 환경 변수

`.env.example`을 `.env.local`로 복사해 채우고, Vercel **Settings > Environment Variables**에도 똑같이 넣습니다.

| 이름 | 설명 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 브라우저에 보여도 되는 값 |
| `SUPABASE_SECRET_KEY` | 서버 전용. 모든 데이터를 읽고 쓸 수 있으니 절대 공개 금지 |
| `OPENAI_API_KEY`, `OPENAI_VISION_MODEL` | 사진 피드백. 모델은 테스트한 `gpt-6-luna` |
| `CONTACT_ENCRYPTION_KEY` | 연락처 암호화 키. 한 번 정하면 바꾸지 말고 따로 보관 |
| `CRON_SECRET` | 매일 추천 계산 주소를 보호하는 비밀값 |
| `OPENAI_IMAGE_MODEL` / `OPENAI_IMAGE_QUALITY` | (선택) 그림 프로필 모델·품질. 기본 `gpt-image-2.5-sunburst`, `medium` |
| `ILLUSTRATION_DAILY_CAP` | (선택) 서비스 전체 하루 그림 상한. 기본 300 |
| `ADMIN_EMAILS` | (선택) 관리자 이메일, 쉼표로 여러 개. 없으면 `testwelltest01@gmail.com` |

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

- **1층 하드 필터** (`src/lib/match/filters.ts`): 나이, 지역(양방향), 키(상관없음/나보다 큼/나보다 작음/직접 범위, ±2cm 여유), 흡연, 결혼·자녀 정반대, 종교. 조건마다 "꼭/되도록". "꼭"이 하나라도 어긋나면 서로 노출하지 않음.
- **2층 소프트 점수**: 가치관 유사도 조화평균(`scoring.ts`의 `mutualScore`) × "되도록" 조건이 어긋날 때마다 0.85.
- **3층 행동 게이트** (`allocate.ts`의 `gateFactor`): 만남 후 평가가 나쁜 기록(노쇼, 사진 불일치·청결·매너 2점 이하)이 2건이면 노출 0.6배, 4건이면 0.3배.
- **배분**: 후보가 적은 사람부터 한 명씩 고르는 라운드 로빈. 한 사람이 하루에 다른 사람 추천에 들어가는 횟수는 최대 6번. 먼저 관심을 보낸 사람은 우선. 넘긴 사람은 다시 안 나오고, 답하지 않은 사람은 14일 뒤 다시 나올 수 있음.
- **사진**: 얼굴·전신 합쳐 계정당 20번까지 올릴 수 있음(등록과 거절 모두 셈, AI 장애로 실패한 시도는 안 셈). 거절된 사진은 저장하지 않음. 피드백을 못 받으면 등록 안 됨. 내부 점수는 추천에 쓰지 않음.

## 보안 설계

**데이터 접근**
- 1단계 테이블(사진, 연락처, 종교, 추천, 관심·수락, 신고, 만남 피드백)은 RLS를 켜고 정책을 두지 않았고, 브라우저 역할(anon, authenticated)의 권한도 뺐습니다. 브라우저에서는 어떤 방법으로도 직접 읽거나 쓸 수 없고, 서버가 로그인 사용자를 확인한 뒤 secret key로만 처리합니다.
- 0단계 테이블(profiles, test_answers, friend_invites)도 브라우저에서 직접 쓰는 권한을 없앴습니다. 직접 쓸 수 있으면 출생연도를 바꿔 나이 확인을 건너뛸 수 있기 때문입니다. 본인 읽기만 남겼습니다.
- 로그인은 이메일 + 비밀번호. 비밀번호는 Supabase가 해시로 저장하고, 틀렸을 때 "이메일이 없는지/비밀번호가 틀렸는지"를 구분해 알려주지 않습니다. 비밀번호 찾기도 가입 여부와 상관없이 같은 화면을 보여줍니다.
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
- 관리자 화면(`/admin`)은 로그인 이메일이 `ADMIN_EMAILS`에 있고 비밀번호까지 만든 계정만 열립니다. 아니면 404처럼 보여서 화면이 있다는 것도 드러내지 않습니다. 관리자 서버 액션도 매번 다시 확인하고 횟수를 제한합니다. 엑셀에는 이메일·연락처·종교·사진을 넣지 않습니다.

**브라우저**
- 보안 헤더(`next.config.ts`): CSP(불러올 수 있는 곳을 이 사이트, Supabase, 폰트 CDN으로 제한), 다른 사이트 안에 넣기 금지(클릭재킹), HSTS, nosniff, Referrer-Policy, Permissions-Policy.
- 로그인 후 화면과 친구 평가 링크는 검색엔진에 노출하지 않습니다(`X-Robots-Tag`).

**운영자가 할 일**
- [ ] Google, GitHub, Vercel, Supabase, OpenAI 계정 모두 2단계 인증 켜기 (가장 중요)
- [ ] Supabase **Authentication > Providers > Email**: 비밀번호 8자 이상·영문과 숫자, Email OTP Expiration `600`(10분)
- [ ] Supabase **Authentication > Rate Limits**: 로그인 시도 제한이 켜져 있는지 확인 (비밀번호 무차별 대입 방지)
- [ ] OpenAI 대시보드에서 월 사용 한도(Usage limits) 정하기
- [ ] GitHub 저장소 Settings > Code security에서 Dependabot alerts 켜기
- [ ] 신고 확인과 정지 해제는 `/admin` 대시보드에서 (확인 완료한 신고는 자동 정지 계산에서 빠짐)
- [ ] 관리자 계정은 회원 전체 정보를 볼 수 있으니 비밀번호를 길고 다른 곳과 겹치지 않게

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
