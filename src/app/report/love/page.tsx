import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";
import { Shell } from "@/components/Shell";
import { loadSceneImageUrls } from "@/lib/love/sceneImages";
import { canRewrite, loadLoveReports, pickLove } from "@/lib/love/server";
import { getProgress, PROGRESS_PATH } from "@/lib/progress";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";
import { rewriteLoveReport } from "./actions";
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

  const admin = createAdminClient();
  const [rows, images] = await Promise.all([loadLoveReports(admin, userId!), loadSceneImageUrls(admin)]);
  const { latest, lastDone } = pickLove(rows);
  if (!latest) return <LoveIntro />;
  // 가장 최근 시도가 다 쓴 보고서면 그대로 (예전 형식이면 맨 위에 '새 보고서 받기')
  if (latest.status === "done" && latest === lastDone) {
    return (
      <LoveReportView
        report={lastDone.report}
        scores={lastDone.scores}
        completedAt={lastDone.completed_at}
        retest
        share
        images={images}
        rewrite={canRewrite(latest) ? rewriteLoveReport : undefined}
      />
    );
  }
  // 쓰는 중·실패면 진행 상황을 위에, 보고서가 있으면 그 아래에.
  // rewriting: '새 보고서 받기'로 같은 검사를 다시 쓰는 중(또는 실패)이라 아래 보고서는 그 검사의 지금 보고서
  const pending = latest.status === "pending";
  const rewriting = latest === lastDone;
  return (
    <div>
      <p className="text-sm font-semibold text-indigo">연애 상황 보고서</p>
      <h1 className="mt-1.5 font-serif text-[1.7rem] font-bold leading-snug text-ink">{rewriting ? "새 보고서 받기" : lastDone ? "다시 검사했어요" : "검사를 마쳤어요"}</h1>
      <p className="mt-2 mb-6 text-[15px] leading-relaxed text-ink-soft">
        {rewriting
          ? "같은 답으로 보고서를 새로 써요. 다 쓸 때까지 지금 보고서는 아래에 그대로 있어요."
          : lastDone
            ? "새 답과 기본 검사 결과를 엮어 보고서를 새로 쓰고 있어요."
            : "답과 기본 검사 결과를 엮어 10가지 장면별 보고서를 쓰고 있어요."}
      </p>
      <LoveProgress status={pending ? "pending" : "failed"} error={latest.error} />
      {lastDone && (
        <div className="mt-12 border-t border-line/80 pt-8">
          <p className="mb-4 px-1 text-[13px] font-semibold text-muted">{rewriting ? "지금 보고서" : "이전 보고서"}</p>
          <LoveReportView report={lastDone.report} scores={lastDone.scores} completedAt={lastDone.completed_at} retest={!pending} share images={images} />
        </div>
      )}
    </div>
  );
}
