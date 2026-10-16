import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Progress = "login" | "onboarding" | "test" | "report";

/** 로그인한 사용자가 지금 어느 단계로 가야 하는지 */
export async function getProgress(userId: string | null): Promise<Progress> {
  if (!userId) return "login";
  const supabase = await createClient();

  const { data: profile } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (!profile) return "onboarding";

  const { data: scores } = await supabase.from("test_scores").select("user_id").eq("user_id", userId).maybeSingle();
  return scores ? "report" : "test";
}

export const PROGRESS_PATH: Record<Progress, string> = {
  login: "/login",
  onboarding: "/onboarding",
  test: "/test",
  report: "/report",
};
