import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";
import { Shell } from "@/components/Shell";
import { loadMySetup, signedPhotoUrls } from "@/lib/match/me";
import { getProgress, PROGRESS_PATH } from "@/lib/progress";
import type { Scores } from "@/lib/scoring";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";
import { MeView } from "./MeView";

export default function MePage() {
  return (
    <Shell tab="me">
      <Suspense fallback={<Loading />}>
        <MeGate />
      </Suspense>
    </Shell>
  );
}

async function MeGate() {
  const userId = await getUserId();
  const progress = await getProgress(userId);
  if (progress !== "report") redirect(PROGRESS_PATH[progress]);
  const setup = await loadMySetup(userId!);
  if (!setup) redirect("/start");
  const facePath = setup.photos.face?.path;
  const [{ data: scoreRow }, faceUrls] = await Promise.all([
    createAdminClient().from("test_scores").select("scores").eq("user_id", userId!).maybeSingle(),
    signedPhotoUrls(facePath ? [facePath] : []),
  ]);
  const needsDrinking = Boolean(scoreRow) && !(scoreRow!.scores as Scores).dealbreakers.drinking;
  // 내 동그라미에는 내 얼굴 사진 (없으면 이름 첫 글자)
  return <MeView setup={setup} needsDrinking={needsDrinking} faceUrl={facePath ? (faceUrls.get(facePath) ?? null) : null} />;
}
