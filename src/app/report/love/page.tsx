import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";
import { Shell } from "@/components/Shell";
import { loadLoveReports, pickLove } from "@/lib/love/server";
import { getProgress, PROGRESS_PATH } from "@/lib/progress";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";
import { LoveIntro } from "./LoveIntro";
import { LoveProgress } from "./LoveProgress";
import { LoveReportView } from "./LoveReportView";

export const metadata: Metadata = { title: "연애 상황 보고서 | 한결", robots: { index: false, follow: false } };

// '다시 쓰기'를 누르면 응답 뒤 after()에서 AI가 보고서를 쓴다
export const maxDuration = 300;

export default function LoveReportPage() {
  return (
    <Shell back={{ href: "/report", label: "내 결" }}>
      <Suspense fallback={<Loading />}>
        <LoveGate />
      </Suspense>
    </Shell>
  );
}

async function LoveGate() {
  const userId = await getUserId();
  const progress = await getProgress(userId);
  if (progress !== "report") redirect(PROGRESS_PATH[progress]);

  const { latest, lastDone } = pickLove(await loadLoveReports(createAdminClient(), userId!));
  if (!latest) return <LoveIntro />;
  // 가장 최근 시도가 다 쓴 보고서면 그대로. 쓰는 중·실패면 진행 상황을 위에, 이전 보고서가 있으면 그 아래에
  if (latest === lastDone) return <LoveReportView report={lastDone.report} scores={lastDone.scores} completedAt={lastDone.completed_at} retest share />;
  const pending = latest.status === "pending";
  return (
    <div>
      <p className="text-sm font-semibold text-indigo">연애 상황 보고서</p>
      <h1 className="mt-1.5 font-serif text-[1.7rem] font-bold leading-snug text-ink">{lastDone ? "다시 검사했어요" : "검사를 마쳤어요"}</h1>
      <p className="mt-2 mb-6 text-[15px] leading-relaxed text-ink-soft">
        {lastDone ? "새 답과 기본 검사 결과를 엮어 보고서를 새로 쓰고 있어요." : "답과 기본 검사 결과를 엮어 10가지 장면별 보고서를 쓰고 있어요."}
      </p>
      <LoveProgress status={pending ? "pending" : "failed"} error={latest.error} />
      {lastDone && (
        <div className="mt-12 border-t border-line/80 pt-8">
          <p className="mb-4 px-1 text-[13px] font-semibold text-muted">이전 보고서</p>
          <LoveReportView report={lastDone.report} scores={lastDone.scores} completedAt={lastDone.completed_at} retest={!pending} share />
        </div>
      )}
    </div>
  );
}
