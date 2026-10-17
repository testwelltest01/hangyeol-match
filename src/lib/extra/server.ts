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

/**
 * 한 사람의 추가 검사 결과. 0004 SQL을 실행하기 전이면 available=false (화면에서 '더 알아보기'를 숨긴다).
 */
export async function loadExtraResults(
  admin: SupabaseClient,
  userId: string,
): Promise<{ available: boolean; rows: Partial<Record<ExtraTestId, ExtraRow>> }> {
  const { data, error } = await admin
    .from("extra_results")
    .select("test_id, version, answers, scores, share, completed_at")
    .eq("user_id", userId);
  if (error) return { available: false, rows: {} };
  return { available: true, rows: Object.fromEntries((data as ExtraRow[]).map((r) => [r.test_id, r])) };
}

/** 상대에게 보여주기로 한 결과의 점수만 */
export function sharedScores(rows: Partial<Record<ExtraTestId, ExtraRow>>): Partial<Record<ExtraTestId, ExtraScores>> {
  return Object.fromEntries(Object.values(rows).filter((r) => r?.share).map((r) => [r!.test_id, r!.scores]));
}

/** 관리자 집계용: 모든 회원의 추가 검사 결과 */
export async function loadAllExtra(admin: SupabaseClient): Promise<{ available: boolean; rows: (ExtraRow & { user_id: string })[] }> {
  const out: (ExtraRow & { user_id: string })[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from("extra_results")
      .select("user_id, test_id, version, answers, scores, share, completed_at")
      .order("completed_at")
      .range(from, from + 999);
    if (error) return { available: false, rows: [] };
    out.push(...((data ?? []) as (ExtraRow & { user_id: string })[]));
    if (!data || data.length < 1000) break;
  }
  return { available: true, rows: out };
}
