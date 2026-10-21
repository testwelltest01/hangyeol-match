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
  // 계정당 한 번: 이미 냈으면 보고서 화면으로
  const { data } = await createAdminClient().from("love_reports").select("status").eq("user_id", userId!).maybeSingle();
  if (data) redirect("/report/love");
  return <LoveTestForm userId={userId!} />;
}
