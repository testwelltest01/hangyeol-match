# 한결 0단계 웹

검사 → 관계 패턴 리포트 → 친구 평가까지 되는 첫 버전입니다. 매칭, 사진, 본인인증은 1단계에서 붙입니다.

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- Supabase (이메일 인증 코드 로그인, Postgres, RLS)
- Vercel 배포 (함수 리전: 서울 `icn1`)

## 화면

| 주소 | 내용 |
| --- | --- |
| `/` | 소개와 시작 버튼 |
| `/login` | 이메일로 인증 코드 받아 로그인 (처음이면 계정 자동 생성) |
| `/onboarding` | 닉네임, 성별, 출생연도, 개인정보 동의 |
| `/test` | 검사 13단계 (가치관 8, 조건 1, 성격 2, 생활 습관 1, 꾸밈 1). 단계마다 저장돼서 이어하기 가능 |
| `/report` | 가치관, 오해가 생기기 쉬운 순간, 성격, 친구가 보는 나, 꾸밈과 조건, 탈퇴 |
| `/f/[토큰]` | 친구 평가 (로그인 없이 10문항) |
| `/privacy` | 0단계용 개인정보처리방침 |
| `/start` | 로그인·진행 상황을 보고 맞는 화면으로 보내는 주소 |

## 1. Supabase 설정 (처음 한 번)

1. 프로젝트를 만들 때 Region은 **Northeast Asia (Seoul)** 로 고릅니다.
2. **SQL Editor**에 `supabase/migrations/0001_init.sql` 내용을 붙여넣고 실행합니다.
3. **Authentication > URL Configuration**
   - Site URL: `https://hangyeol-match.vercel.app`
   - Redirect URLs: `http://localhost:3000/**`, `https://hangyeol-match.vercel.app/**`
4. **Authentication > Emails > Templates**에서 **Magic Link**와 **Confirm signup** 두 템플릿 본문을 아래로 바꿉니다. 인증 코드를 메일에 넣어야 앱에서 코드로 로그인할 수 있습니다.

   ```html
   <h2>한결 로그인</h2>
   <p>아래 인증 코드를 한결 화면에 입력해주세요.</p>
   <p style="font-size:28px;font-weight:700;letter-spacing:6px">{{ .Token }}</p>
   <p>또는 이 링크를 눌러 로그인할 수 있어요:
     <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">한결 로그인</a></p>
   ```

5. **Project Settings > API Keys**에서 Project URL, publishable key, secret key를 복사해둡니다.
6. 공개 전에 **Authentication > Emails > SMTP Settings**에서 외부 메일 서비스를 연결하세요. Supabase 기본 메일 서버는 테스트용이라 시간당 보낼 수 있는 메일 수가 적습니다.

## 2. 내 컴퓨터에서 실행

Node.js 20 이상(22 권장)이 필요합니다.

```bash
npm install
cp .env.example .env.local   # Windows PowerShell: Copy-Item .env.example .env.local
# .env.local에 Supabase 값 3개를 채운다
npm run dev
```

브라우저에서 http://localhost:3000 을 엽니다.

## 3. Vercel 배포

1. 이 폴더를 GitHub 저장소에 올리고 Vercel에서 **Import**합니다. 프로젝트 이름은 `hangyeol-match`로 하면 주소가 `hangyeol-match.vercel.app`이 됩니다.
   - Git 없이 올리려면 폴더에서 `npx vercel`을 실행해도 됩니다.
2. **Settings > Environment Variables**에 `.env.example`의 세 값을 넣습니다. `SUPABASE_SECRET_KEY`는 절대 공개하지 마세요.
3. `vercel.json`이 서버 기능을 서울 리전(`icn1`)에서 돌게 고정합니다.

## 개발 메모

- **문항 수정**: `src/lib/items.ts` 한 곳만 고치면 됩니다. 문항을 바꾸면 `TEST_VERSION`을 올려서 어떤 버전으로 응답했는지 구분하세요.
- **채점**: `src/lib/scoring.ts`. 매칭용 상호 점수(조화평균)와 딜브레이커 충돌 계산도 미리 들어 있습니다.
- **리포트 문구**: `src/lib/report.ts`
- **테스트**: `npm test` (채점·문항 설정 16개)
- **보안**
  - 점수(`test_scores`)는 서버만 씁니다. 사용자는 자기 점수를 읽기만 할 수 있습니다.
  - 친구 평가(`friend_ratings`)는 사용자가 직접 읽을 수 없고, 서버가 3건 이상일 때 평균만 보여줍니다.
  - 탈퇴하면 `auth.users`를 cascade로 참조하는 모든 데이터가 함께 지워집니다.
- **로그인 판정**: `getClaims()`로 서버에서 JWT를 검증합니다. 세션 갱신은 `src/proxy.ts`(Next.js 16에서 middleware 대신 쓰는 파일)가 맡습니다.

## 공개 전에 할 일

- [ ] `/privacy`의 시행일과 보호책임자 성명 채우기
- [ ] 외부 SMTP 연결
- [ ] 실제 기기(아이폰 사파리, 안드로이드 크롬)에서 검사 끝까지 진행해보기
