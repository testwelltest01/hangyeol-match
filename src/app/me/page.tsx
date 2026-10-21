import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";
import { Shell } from "@/components/Shell";
import { startAutoIllustration } from "@/lib/illustration/server";
import { loadMySetup, needsIllustration, signedPhotoUrls } from "@/lib/match/me";
import { getProgress, PROGRESS_PATH } from "@/lib/progress";
import { getUserId } from "@/lib/supabase/server";
import { MeView } from "./MeView";

// 그림 프로필이 없으면 이 화면을 열 때 응답 뒤 after()에서 그린다(1~2분)
export const maxDuration = 300;

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
  // 그림 프로필이 아직 없으면(실패했거나 아직 안 그렸으면) 알아서 그린다
  if (needsIllustration(setup) && (await startAutoIllustration(userId!))) setup.illustration.drawing = true;
  const facePath = setup.photos.face?.path;
  const faceUrls = await signedPhotoUrls(facePath ? [facePath] : []);
  // 내 동그라미에는 내 얼굴 사진 (없으면 이름 첫 글자)
  return <MeView setup={setup} faceUrl={facePath ? (faceUrls.get(facePath) ?? null) : null} />;
}
