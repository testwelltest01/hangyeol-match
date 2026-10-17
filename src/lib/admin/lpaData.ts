import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LpaSet } from "@/lib/admin/lpaSets";
import type { GenderKey } from "@/lib/admin/trends";
import { fetchAll } from "@/lib/match/server";
import type { Scores } from "@/lib/scoring";

export type LpaRow = { userId: string; gender: GenderKey; x: number[] };

/** 검사를 마친 회원의 지표 값. 비어 있는 값이 있으면 뺀다. 순서는 검사를 마친 순서 */
export async function loadLpaRows(admin: SupabaseClient, set: LpaSet): Promise<LpaRow[]> {
  const [scores, profiles] = await Promise.all([
    fetchAll<{ user_id: string; computed_at: string; scores: Scores }>((a, b) =>
      admin.from("test_scores").select("user_id, computed_at, scores").order("computed_at").order("user_id").range(a, b),
    ),
    fetchAll<{ id: string; gender: "male" | "female" }>((a, b) => admin.from("profiles").select("id, gender").range(a, b)),
  ]);
  const genderOf = new Map(profiles.map((p) => [p.id, p.gender]));
  const rows: LpaRow[] = [];
  for (const s of scores) {
    let x: number[];
    try {
      x = set.get(s.scores);
    } catch {
      continue;
    }
    if (x.length !== set.indicators.length || !x.every((v) => typeof v === "number" && Number.isFinite(v))) continue;
    rows.push({ userId: s.user_id, gender: genderOf.get(s.user_id) ?? "unknown", x });
  }
  return rows;
}
