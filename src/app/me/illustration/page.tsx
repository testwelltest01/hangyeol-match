import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";
import { Shell } from "@/components/Shell";
import { PageTitle } from "@/components/ui";
import { ILLUSTRATIONS_PER_ACCOUNT } from "@/lib/illustration/prompt";
import { loadIllustrations, usedByAccount } from "@/lib/illustration/server";
import { loadMySetup, signedPhotoUrls } from "@/lib/match/me";
import { getProgress, PROGRESS_PATH } from "@/lib/progress";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";
import { IllustrationPanel } from "./IllustrationPanel";

export const metadata: Metadata = { title: "그림 프로필 | 한결", robots: { index: false, follow: false } };
// 그림은 응답을 보낸 뒤 after()에서 그린다. Vercel 무료 요금제 최대 300초
export const maxDuration = 300;

export default function IllustrationPage() {
  return (
    <Shell nav="me">
      <PageTitle
        title="그림 프로필"
        lead="실제 사진 2장과 자기소개·검사 결과를 바탕으로 AI가 따뜻한 손그림 애니메이션 풍 그림을 그려요. 마음에 들면 추천 카드에 보여줄 수 있어요."
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

  const admin = createAdminClient();
  const [{ available, rows }, used, consent] = await Promise.all([
    loadIllustrations(admin, userId!),
    usedByAccount(admin, userId!),
    admin.from("consents").select("kind").eq("user_id", userId!).eq("kind", "illustration").maybeSingle(),
  ]);
  const urls = await signedPhotoUrls(rows.flatMap((r) => (r.status === "done" && r.path ? [r.path] : [])));

  return (
    <IllustrationPanel
      available={available}
      ready={Boolean(setup.matchProfile && setup.photos.face && setup.photos.body)}
      consented={Boolean(consent.data)}
      remaining={Math.max(0, ILLUSTRATIONS_PER_ACCOUNT - used)}
      limit={ILLUSTRATIONS_PER_ACCOUNT}
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
