import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";
import { Shell } from "@/components/Shell";
import { loadMySetup } from "@/lib/match/me";
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
  const { data: scoreRow } = await createAdminClient().from("test_scores").select("scores").eq("user_id", userId!).maybeSingle();
  const needsDrinking = Boolean(scoreRow) && !(scoreRow!.scores as Scores).dealbreakers.drinking;
  return <MeView setup={setup} needsDrinking={needsDrinking} />;
}
