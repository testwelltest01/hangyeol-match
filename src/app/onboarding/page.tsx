import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";
import { Shell } from "@/components/Shell";
import { TourInvite } from "@/components/TourInvite";
import { getProgress, PROGRESS_PATH } from "@/lib/progress";
import { getUserId } from "@/lib/supabase/server";
import { OnboardingForm } from "./OnboardingForm";

export default function OnboardingPage() {
  return (
    <Shell syncTheme>
      <h1 className="font-serif text-[1.65rem] font-bold leading-tight">기본 정보</h1>
      <p className="mt-3 text-ink-soft">검사 전에 세 가지만 알려주세요. 닉네임은 친구 평가 화면에 보여요.</p>
      <div className="mt-6">
        <TourInvite title="먼저 둘러볼래요?" body="가상 인물과 추천부터 연락처 교환까지 2분 만에 미리 해볼 수 있어요." />
      </div>
      <Suspense fallback={<div className="mt-8"><Loading /></div>}>
        <OnboardingGate />
      </Suspense>
    </Shell>
  );
}

async function OnboardingGate() {
  const progress = await getProgress(await getUserId());
  if (progress !== "onboarding") redirect(PROGRESS_PATH[progress]);

  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 60 }, (_, i) => thisYear - 19 - i);
  return <OnboardingForm years={years} />;
}
