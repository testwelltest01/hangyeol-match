import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";
import { Shell } from "@/components/Shell";
import { LoveTestForm } from "@/app/report/love/test/LoveTestForm";
import { getProgress } from "@/lib/progress";
import { getUserId } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "연애 상황 검사 | 한결", robots: { index: false, follow: false } };

// 내면 응답 뒤 after()에서 AI가 보고서를 쓴다
export const maxDuration = 300;

/** 가입 전(비회원) 연애 상황 검사. 기본 검사까지 마친 회원은 회원 검사로 */
export default function LoveGuestTestPage() {
  return (
    <Shell back={{ href: "/love", label: "소개" }}>
      <Suspense fallback={<Loading />}>
        <GuestTestGate />
      </Suspense>
    </Shell>
  );
}

async function GuestTestGate() {
  const userId = await getUserId();
  if (userId && (await getProgress(userId)) === "report") redirect("/report/love/test");
  return <LoveTestForm draftKey="hg-love-draft:guest" again={false} guest />;
}
