import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExtraAnswers, ExtraScores, ExtraTestId } from "@/lib/extra/tests";

export type ExtraRow = {
  test_id: ExtraTestId;
  version: string;
  answers: ExtraAnswers;
  scores: ExtraScores;
  share: boolean;
  completed_at: string;
};

export type ExtraRows = Partial<Record<ExtraTestId, ExtraRow>>;

/** 한 사람의 추가 검사 결과 (검사 id → 결과) */
export async function loadExtraResults(admin: SupabaseClient, userId: string): Promise<ExtraRows> {
  const { data } = await admin
    .from("extra_results")
    .select("test_id, version, answers, scores, share, completed_at")
    .eq("user_id", userId);
  return Object.fromEntries(((data ?? []) as ExtraRow[]).map((r) => [r.test_id, r]));
}

/** 상대에게 보여주기로 한 결과의 점수만 */
export function sharedScores(rows: ExtraRows): Partial<Record<ExtraTestId, ExtraScores>> {
  return Object.fromEntries(Object.values(rows).filter((r) => r?.share).map((r) => [r!.test_id, r!.scores]));
}

/** 관리자 집계용: 모든 회원의 추가 검사 결과 */
export async function loadAllExtra(admin: SupabaseClient): Promise<(ExtraRow & { user_id: string })[]> {
  const out: (ExtraRow & { user_id: string })[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await admin
      .from("extra_results")
      .select("user_id, test_id, version, answers, scores, share, completed_at")
      .order("completed_at")
      .range(from, from + 999);
    out.push(...((data ?? []) as (ExtraRow & { user_id: string })[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}
