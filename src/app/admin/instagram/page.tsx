import type { Metadata } from "next";
import { Suspense } from "react";
import { CopyText } from "@/components/CopyText";
import { requireAdmin } from "@/lib/admin/auth";
import { kstTime } from "@/lib/admin/data";
import { loadIgStatus, type IgStatus } from "@/lib/instagram/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminLoading, AdminShell, AdminTitle, Chip, Panel, Stat } from "../ui";
import { IgButtons } from "./IgButtons";

export const metadata: Metadata = { title: "인스타 인증 | 한결 관리", robots: { index: false, follow: false } };

const SITE = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://hangyeol-match.vercel.app";
const WEBHOOK_URL = `${SITE}/api/instagram/webhook`;

export default function InstagramAdminPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <InstagramGate />
    </Suspense>
  );
}

async function InstagramGate() {
  await requireAdmin();
  return <InstagramView s={await loadIgStatus(createAdminClient())} />;
}

function Row({ label, ok, children }: { label: string; ok: boolean | null; children: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 border-b border-line/60 py-2.5 last:border-0">
      <span className="text-sm text-ink-soft">{label}</span>
      <span className="flex min-w-0 items-center gap-2 text-sm">
        <span className="min-w-0 break-all text-right">{children}</span>
        {ok !== null && <Chip tone={ok ? "moss" : "alert"}>{ok ? "됨" : "필요"}</Chip>}
      </span>
    </li>
  );
}

function InstagramView({ s }: { s: IgStatus }) {
  const accountMatches = Boolean(s.official && s.account?.username && s.account.username.toLowerCase() === s.official);
  const subscribed = s.subscribedFields?.includes("messages") ?? false;
  return (
    <AdminShell current="dashboard" back={{ href: "/admin", label: "대시보드" }}>
      <AdminTitle title="인스타 인증" lead="회원이 한결 공식 인스타에 DM으로 '인증'을 보내면 6자리 코드를 답장하고, 회원이 연락처 화면에 넣으면 추천 카드에 '인스타 인증'이 붙어요." />

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat label="확인한 회원" value={s.verified} />
        <Stat label="최근 7일 보낸 코드" value={s.codes7} />
        <Stat label="그중 확인에 쓴 코드" value={s.used7} />
      </div>

      <Panel className="mt-4" title="설정 상태" lead="모두 '됨'이어야 회원 화면에 확인 칸이 보이고 봇이 답장해요." aside={<IgButtons />}>
        <ul>
          <Row label="DB 표 (0008_instagram_verify.sql)" ok={s.tablesReady}>
            {s.tablesReady ? "있음" : "SQL Editor에서 실행하세요"}
          </Row>
          <Row label="공식 계정 NEXT_PUBLIC_INSTAGRAM_USERNAME" ok={Boolean(s.official)}>
            {s.official ? `@${s.official}` : "없음"}
          </Row>
          <Row label="웹훅 서명 INSTAGRAM_APP_SECRET" ok={s.hasSecret}>
            {s.hasSecret ? "있음" : "없음"}
          </Row>
          <Row label="웹훅 확인 문자열 INSTAGRAM_VERIFY_TOKEN" ok={s.hasVerifyToken}>
            {s.hasVerifyToken ? "있음" : "없음"}
          </Row>
          <Row label="토큰 INSTAGRAM_ACCESS_TOKEN" ok={Boolean(s.token)}>
            {s.token
              ? s.token.source === "db"
                ? `갱신본 사용 · ${kstTime(s.token.refreshedAt)} 갱신${s.token.expiresAt ? ` · ${kstTime(s.token.expiresAt)}까지` : ""}`
                : "환경 변수 사용 (24시간 뒤부터 갱신 가능)"
              : "없음"}
          </Row>
          <Row label="토큰의 계정" ok={s.account ? accountMatches : null}>
            {s.account ? (s.account.username ? `@${s.account.username}${accountMatches ? "" : " (공식 계정과 달라요)"}` : s.account.error) : "토큰 없음"}
          </Row>
          <Row label="DM 알림 연결 (messages)" ok={s.token ? subscribed : null}>
            {s.subscribedFields ? (s.subscribedFields.length ? s.subscribedFields.join(", ") : "연결 안 됨 → '웹훅 연결하기'") : "확인 못 함"}
          </Row>
        </ul>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-mist px-4 py-3 text-sm">
          <span className="min-w-0 break-all">
            <span className="text-muted">웹훅 주소 </span>
            {WEBHOOK_URL}
          </span>
          <CopyText text={WEBHOOK_URL} />
        </div>
      </Panel>

      <Panel className="mt-4" title="설정 순서" lead="한 번만 하면 돼요. 토큰은 크론이 7일마다 갱신해요(60일이 지나면 끊김).">
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-soft">
          <li>한결 공식 인스타를 프로페셔널(비즈니스 또는 크리에이터) 계정으로 바꾸고, 인스타 앱 설정 → 메시지 → 연결된 도구에서 &lsquo;메시지 접근 허용&rsquo;을 켜요.</li>
          <li>메타 개발자 앱에서 &lsquo;Instagram API(인스타그램 로그인)&rsquo;를 추가하고 공식 계정을 연결해 토큰을 만들어요 (권한 instagram_business_basic, instagram_business_manage_messages).</li>
          <li>Vercel 환경 변수에 NEXT_PUBLIC_INSTAGRAM_USERNAME, INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_APP_SECRET, INSTAGRAM_VERIFY_TOKEN을 넣고 다시 배포해요.</li>
          <li>메타 앱의 웹훅에 위 주소와 INSTAGRAM_VERIFY_TOKEN을 넣어 확인하고 messages 필드를 구독한 뒤, 여기서 &lsquo;웹훅 연결하기&rsquo;를 눌러요.</li>
          <li>비즈니스 인증을 마치고 앱을 라이브로 바꿔요. 그 전에는 앱에 역할(테스터)이 있는 인스타 계정의 DM에만 답장해요.</li>
        </ol>
      </Panel>
    </AdminShell>
  );
}
