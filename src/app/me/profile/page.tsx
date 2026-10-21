import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";
import { Shell } from "@/components/Shell";
import { PageTitle } from "@/components/ui";
import { loadMySetup } from "@/lib/match/me";
import { getProgress, PROGRESS_PATH } from "@/lib/progress";
import { getUserId } from "@/lib/supabase/server";
import { ProfileForm } from "./ProfileForm";

// 저장하면서 조건이 갖춰지면 응답 뒤에 그림 프로필을 자동으로 그린다(1~2분)
export const maxDuration = 300;

export default function ProfilePage() {
  return (
    <Shell back={{ href: "/me", label: "내 정보" }}>
      <PageTitle
        title="내 정보와 자기소개"
        lead="추천 카드에는 사진 없이 이 정보와 검사 결과만 보여요. 사진은 서로 관심을 보낸 뒤에 공개돼요."
      />
      <Suspense fallback={<Loading />}>
        <ProfileGate />
      </Suspense>
    </Shell>
  );
}

async function ProfileGate() {
  const userId = await getUserId();
  const progress = await getProgress(userId);
  if (progress !== "report") redirect(PROGRESS_PATH[progress]);
  const setup = await loadMySetup(userId!);
  if (!setup) redirect("/start");

  return (
    <ProfileForm
      initial={setup.matchProfile ? { ...setup.matchProfile } : null}
      hasReligionConsent={setup.consents.religion}
    />
  );
}
