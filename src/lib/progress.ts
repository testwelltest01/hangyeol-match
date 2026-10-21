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

/**
 * 단계별로 보낼 화면. 검사를 마친 사람은 오늘 탭(결과는 '내 결' 탭).
 * 검사 마지막 저장 때 로그인 쿠키가 새로 써지면 Next가 /test를 다시 그리는데, 그때 이 주소로 보내므로
 * 여기가 '/report'이면 오늘 탭 대신 내 결로 가 버린다
 */
export const PROGRESS_PATH: Record<Progress, string> = {
  login: "/login",
  onboarding: "/onboarding",
  test: "/test",
  report: "/match",
};
