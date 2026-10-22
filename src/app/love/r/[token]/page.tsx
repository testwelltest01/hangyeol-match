import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Callout } from "@/components/app-ui";
import { PrimaryLink } from "@/components/buttons";
import { Loading } from "@/components/Loading";
import { Shell } from "@/components/Shell";
import { LoveProgress } from "@/app/report/love/LoveProgress";
import { LoveReportView } from "@/app/report/love/LoveReportView";
import { GUEST_KEEP_DAYS, isGuestToken } from "@/lib/love/guest";
import { loadSceneImageUrls } from "@/lib/love/sceneImages";
import { loadGuestReport } from "@/lib/love/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { retryGuestLoveReport } from "../../actions";
import { ServiceInvite } from "../../ServiceInvite";

// 주소에 비밀 열쇠가 있어서 검색에 걸리지 않게, 밖으로 나가는 링크에 주소를 넘기지 않게
export const metadata: Metadata = { title: "내 연애 상황 보고서 | 한결", robots: { index: false, follow: false }, referrer: "no-referrer" };

// '다시 쓰기'를 누르면 응답 뒤 after()에서 AI가 보고서를 쓴다
export const maxDuration = 300;

/** 가입 전 비회원 검사의 결과 화면 (열쇠를 아는 사람만). 보고서 → 친구에게 공유 → 한결 소개와 가입 */
export default function LoveGuestResultPage({ params }: PageProps<"/love/r/[token]">) {
  return (
    <Shell>
      <Suspense fallback={<Loading />}>
        <GuestResultGate params={params} />
      </Suspense>
    </Shell>
  );
}

const fmtDate = (d: Date) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" }).format(d);

async function GuestResultGate({ params }: { params: PageProps<"/love/r/[token]">["params"] }) {
  const { token } = await params;
  if (!isGuestToken(token)) notFound();
  const admin = createAdminClient();
  const [row, images] = await Promise.all([loadGuestReport(admin, token), loadSceneImageUrls(admin)]);
  if (!row) {
    return (
      <div>
        <h1 className="font-serif text-[1.6rem] font-bold leading-snug text-ink">보고서를 찾지 못했어요</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          가입하지 않은 보고서는 {GUEST_KEEP_DAYS}일이 지나면 지워져요. 다시 검사하면 새 보고서를 받을 수 있어요.
        </p>
        <div className="mt-8">
          <PrimaryLink href="/love/test">다시 검사하기</PrimaryLink>
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          가입했다면{" "}
          <Link href="/login" className="font-semibold text-indigo underline underline-offset-4">
            로그인
          </Link>
          해서 내 결에서 볼 수 있어요.
        </p>
      </div>
    );
  }

  const member = row.user_id !== null;
  const next = member ? (
    <section className="mt-12 rounded-[22px] bg-surface px-5 py-6 ring-1 ring-line/80">
      <p className="text-[15px] font-semibold text-ink">이 보고서는 내 계정에 저장돼 있어요</p>
      <p className="mt-1 text-[14px] leading-relaxed text-muted">기본 검사까지 마치면 내 결 맨 위에서 볼 수 있고, 다시 검사하면 기본 검사 결과까지 엮어 써 드려요.</p>
      <div className="mt-4">
        <PrimaryLink href="/start">한결로 가기</PrimaryLink>
      </div>
    </section>
  ) : (
    <ServiceInvite token={token} />
  );

  if (row.status === "done" && row.report) {
    const until = fmtDate(new Date(new Date(row.created_at).getTime() + GUEST_KEEP_DAYS * 86_400_000));
    return (
      <div>
        {!member && (
          <div className="mb-8">
            <Callout>
              가입하지 않으면 이 보고서는 {until}까지만 볼 수 있어요. 이 주소를 저장해 두거나, 가입하면 내 계정에 계속 남아요.
            </Callout>
          </div>
        )}
        <LoveReportView report={row.report} scores={row.scores} completedAt={row.completed_at} share guest images={images} />
        {next}
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm font-semibold text-indigo">연애 상황 보고서</p>
      <h1 className="mt-1.5 font-serif text-[1.7rem] font-bold leading-snug text-ink">검사를 마쳤어요</h1>
      <p className="mb-6 mt-2 text-[15px] leading-relaxed text-ink-soft">답을 엮어 연애의 장면 10가지로 보고서를 쓰고 있어요.</p>
      <LoveProgress
        status={row.status === "done" ? "failed" : row.status}
        error={row.error}
        retry={retryGuestLoveReport.bind(null, token)}
        doneWhere="다 되면 이 화면에 바로 보여요. 이 주소를 저장해 두면 나중에도 볼 수 있어요."
      />
      {next}
    </div>
  );
}
