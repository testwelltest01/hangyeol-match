import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";
import { Shell } from "@/components/Shell";
import { PageTitle } from "@/components/ui";
import { ILLUSTRATIONS_PER_ACCOUNT } from "@/lib/illustration/prompt";
import { loadIllustrations, startAutoIllustration, usedByAccount } from "@/lib/illustration/server";
import { isReady, loadMySetup, needsIllustration, signedPhotoUrls } from "@/lib/match/me";
import { getProgress, PROGRESS_PATH } from "@/lib/progress";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";
import { IllustrationPanel } from "./IllustrationPanel";

export const metadata: Metadata = { title: "그림 프로필 | 한결", robots: { index: false, follow: false } };
// 그림은 응답을 보낸 뒤 after()에서 그린다. Vercel 무료 요금제 최대 300초
export const maxDuration = 300;

export default function IllustrationPage() {
  return (
    <Shell back={{ href: "/me", label: "내 정보" }}>
      <PageTitle
        title="그림 프로필"
        lead="추천 카드에는 실제 사진 대신 이 그림이 보여요. 사진 2장과 자기소개·검사 결과를 바탕으로 AI가 따뜻한 손그림 풍으로 그리고, 그림 프로필이 있어야 추천을 주고받을 수 있어요."
      />
      <Suspense fallback={<Loading />}>
        <IllustrationGate />
      </Suspense>
    </Shell>
  );
}

async function IllustrationGate() {
  const userId = await getUserId();
  const progress = await getProgress(userId);
  if (progress !== "report") redirect(PROGRESS_PATH[progress]);
  const setup = await loadMySetup(userId!);
  if (!setup) redirect("/start");
  // 그림이 없으면(아직 안 그렸거나 실패했으면) 이 화면을 열 때 알아서 그린다 (30분 간격, 하루 실패 3번까지)
  if (needsIllustration(setup)) await startAutoIllustration(userId!);

  const admin = createAdminClient();
  const [rows, used] = await Promise.all([loadIllustrations(admin, userId!), usedByAccount(admin, userId!)]);
  const urls = await signedPhotoUrls(rows.flatMap((r) => (r.status === "done" && r.path ? [r.path] : [])));

  return (
    <IllustrationPanel
      missing={!setup.photos.face || !setup.photos.body ? "photos" : !setup.matchProfile ? "profile" : null}
      remaining={Math.max(0, ILLUSTRATIONS_PER_ACCOUNT - used)}
      limit={ILLUSTRATIONS_PER_ACCOUNT}
      ready={isReady(setup)}
      rows={rows.map((r) => ({
        id: r.id,
        status: r.status,
        url: r.path ? (urls.get(r.path) ?? null) : null,
        error: r.error,
        shown: r.shown,
        createdAt: r.created_at,
      }))}
    />
  );
}
