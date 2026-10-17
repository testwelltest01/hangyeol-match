import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";
import { Shell } from "@/components/Shell";
import type { Answers } from "@/lib/items";
import { extraCards } from "@/lib/extra/cards";
import { loadExtraResults } from "@/lib/extra/server";
import { MIN_FRIEND_RATINGS_TO_SHOW } from "@/lib/match/rules";
import { getProgress, PROGRESS_PATH } from "@/lib/progress";
import { buildReport } from "@/lib/report";
import { aggregateFriendRatings, type Scores } from "@/lib/scoring";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getUserId } from "@/lib/supabase/server";
import { ReportParts } from "./ReportBody";

export default function ReportPage() {
  return (
    <Shell nav="report">
      <Suspense fallback={<Loading />}>
        <ReportGate />
      </Suspense>
    </Shell>
  );
}

async function ReportGate() {
  const userId = await getUserId();
  const progress = await getProgress(userId);
  if (progress !== "report") redirect(PROGRESS_PATH[progress]);

  const supabase = await createClient();
  const [{ data: profile }, { data: scoreRow }, { data: invite }] = await Promise.all([
    supabase.from("profiles").select("nickname").eq("id", userId!).single(),
    supabase.from("test_scores").select("scores").eq("user_id", userId!).single(),
    supabase.from("friend_invites").select("token").eq("user_id", userId!).maybeSingle(),
  ]);

  // 친구 평가는 개별 응답을 사용자에게 주지 않고, 서버에서 평균만 낸다.
  const admin = createAdminClient();
  const [{ data: ratings }, extra] = await Promise.all([
    admin.from("friend_ratings").select("answers").eq("user_id", userId!),
    loadExtraResults(admin, userId!),
  ]);
  const friends = aggregateFriendRatings((ratings ?? []).map((r) => r.answers as Answers));
  const showFriends = friends.count >= MIN_FRIEND_RATINGS_TO_SHOW;

  return (
    <ReportParts
      nickname={profile?.nickname ?? ""}
      report={buildReport(scoreRow!.scores as Scores)}
      friendBigFive={showFriends ? friends.bigFive : null}
      friendCount={friends.count}
      minFriendCount={MIN_FRIEND_RATINGS_TO_SHOW}
      inviteToken={invite?.token ?? null}
      extras={extra.available ? extraCards(extra.rows) : null}
    />
  );
}
