import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_LOVE_SAMPLE, pickLoveSample, type LoveSampleOptions } from "@/lib/admin/loveSample";
import type { LpaSet } from "@/lib/admin/lpaSets";
import type { GenderKey } from "@/lib/admin/trends";
import { loadAllLove } from "@/lib/love/server";
import { fetchAll } from "@/lib/match/server";
import type { Scores } from "@/lib/scoring";

/** userId: 회원은 사용자ID, 가입 전 비회원 연애 상황 검사는 guest-<검사ID> */
export type LpaRow = { userId: string; gender: GenderKey; x: number[] };

const finite = (x: number[], d: number) => x.length === d && x.every((v) => typeof v === "number" && Number.isFinite(v));

async function genders(admin: SupabaseClient): Promise<Map<string, "male" | "female">> {
  const profiles = await fetchAll<{ id: string; gender: "male" | "female" }>((a, b) => admin.from("profiles").select("id, gender").range(a, b));
  return new Map(profiles.map((p) => [p.id, p.gender]));
}

/**
 * 지표 값. 비어 있는 값이 있으면 뺀다.
 * 기본 검사(main)는 검사를 마친 회원마다 하나(마친 순서), 연애 상황 검사(love)는 지금 문항 버전에서 사람마다 한 번(love 옵션, 검사 순서)
 */
export async function loadLpaRows(admin: SupabaseClient, set: LpaSet, love: LoveSampleOptions = DEFAULT_LOVE_SAMPLE): Promise<LpaRow[]> {
  const d = set.indicators.length;
  if (set.source === "love") {
    const [all, genderOf] = await Promise.all([loadAllLove(admin), genders(admin)]);
    return pickLoveSample(all, love)
      .map((r): LpaRow => ({ userId: r.user_id ?? `guest-${r.id}`, gender: (r.user_id ? genderOf.get(r.user_id) : undefined) ?? "unknown", x: set.get(r.scores) }))
      .filter((r) => finite(r.x, d));
  }
  const [scores, genderOf] = await Promise.all([
    fetchAll<{ user_id: string; computed_at: string; scores: Scores }>((a, b) =>
      admin.from("test_scores").select("user_id, computed_at, scores").order("computed_at").order("user_id").range(a, b),
    ),
    genders(admin),
  ]);
  const rows: LpaRow[] = [];
  for (const s of scores) {
    let x: number[];
    try {
      x = set.get(s.scores);
    } catch {
      continue;
    }
    if (!finite(x, d)) continue;
    rows.push({ userId: s.user_id, gender: genderOf.get(s.user_id) ?? "unknown", x });
  }
  return rows;
}
