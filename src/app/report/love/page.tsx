import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";
import { Shell } from "@/components/Shell";
import { loadLoveReport } from "@/lib/love/server";
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

  const row = await loadLoveReport(createAdminClient(), userId!);
  if (!row) return <LoveIntro />;
  if (row.status === "done" && row.report) return <LoveReportView report={row.report} scores={row.scores} completedAt={row.completed_at} />;
  return (
    <div>
      <p className="text-sm font-semibold text-indigo">연애 상황 보고서</p>
      <h1 className="mt-1.5 font-serif text-[1.7rem] font-bold leading-snug text-ink">검사를 마쳤어요</h1>
      <p className="mt-2 mb-6 text-[15px] leading-relaxed text-ink-soft">답과 기본 검사 결과를 엮어 10가지 장면별 보고서를 쓰고 있어요.</p>
      <LoveProgress status={row.status === "done" ? "failed" : row.status} error={row.error} />
    </div>
  );
}
