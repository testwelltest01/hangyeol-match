import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";
import { Shell } from "@/components/Shell";
import { getProgress, PROGRESS_PATH } from "@/lib/progress";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";
import { LoveTestForm } from "./LoveTestForm";

export const metadata: Metadata = { title: "연애 상황 검사 | 한결", robots: { index: false, follow: false } };

// 제출하면 응답 뒤 after()에서 AI가 보고서를 쓴다
export const maxDuration = 300;

export default function LoveTestPage() {
  return (
    <Shell back={{ href: "/report/love", label: "보고서" }}>
      <Suspense fallback={<Loading />}>
        <LoveTestGate />
      </Suspense>
    </Shell>
  );
}

async function LoveTestGate() {
  const userId = await getUserId();
  const progress = await getProgress(userId);
  if (progress !== "report") redirect(PROGRESS_PATH[progress]);
  // 보고서를 쓰는 중이면 다 쓸 때까지 다시 검사하지 않는다. 다시 검사는 처음처럼 빈 답에서 시작한다 (이전 답에 끌리지 않게)
  const { data } = await createAdminClient().from("love_reports").select("id").eq("user_id", userId!).eq("status", "pending").limit(1);
  if (data?.length) redirect("/report/love");
  const { count } = await createAdminClient().from("love_reports").select("id", { count: "exact", head: true }).eq("user_id", userId!);
  return <LoveTestForm draftKey={`hg-love-draft:${userId}`} again={(count ?? 0) > 0} />;
}
