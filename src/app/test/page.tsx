import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";
import { Shell } from "@/components/Shell";
import { firstIncompleteStep, type Answers, type TestGender } from "@/lib/items";
import { getProgress, PROGRESS_PATH } from "@/lib/progress";
import { createClient, getUserId } from "@/lib/supabase/server";
import { TestRunner } from "./TestRunner";

export default function TestPage() {
  return (
    <Shell>
      <Suspense fallback={<Loading />}>
        <TestGate />
      </Suspense>
    </Shell>
  );
}

/** 저장된 답을 불러와 처음으로 덜 끝난 단계부터 이어서 보여준다. */
async function TestGate() {
  const userId = await getUserId();
  const progress = await getProgress(userId);
  if (progress !== "test") redirect(PROGRESS_PATH[progress]);

  const supabase = await createClient();
  const [{ data }, { data: profile }] = await Promise.all([
    supabase.from("test_answers").select("answers").eq("user_id", userId!).maybeSingle(),
    supabase.from("profiles").select("gender").eq("id", userId!).single(),
  ]);
  const answers = (data?.answers as Answers) ?? {};
  const gender: TestGender = profile?.gender === "female" ? "female" : "male";

  return <TestRunner initialAnswers={answers} initialStep={firstIncompleteStep(answers, gender)} gender={gender} />;
}
