import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";
import { Shell } from "@/components/Shell";
import type { Answers } from "@/lib/items";
import { getProgress, PROGRESS_PATH } from "@/lib/progress";
import { buildReport } from "@/lib/report";
import { aggregateFriendRatings, type Scores } from "@/lib/scoring";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getUserId } from "@/lib/supabase/server";
import { ReportParts } from "./ReportBody";

/** 친구 평가 평균을 보여주는 최소 인원. 한 명의 답이 드러나지 않게 한다. */
const MIN_FRIEND_RATINGS = 3;

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
  const { data: ratings } = await admin.from("friend_ratings").select("answers").eq("user_id", userId!);
  const friends = aggregateFriendRatings((ratings ?? []).map((r) => r.answers as Answers));
  const showFriends = friends.count >= MIN_FRIEND_RATINGS;

  return (
    <ReportParts
      nickname={profile?.nickname ?? ""}
      report={buildReport(scoreRow!.scores as Scores)}
      friendBigFive={showFriends ? friends.bigFive : null}
      friendCount={friends.count}
      minFriendCount={MIN_FRIEND_RATINGS}
      inviteToken={invite?.token ?? null}
    />
  );
}
