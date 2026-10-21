// 연애 상황 보고서 검사 채점. 순수 함수.
import { LIKERT_OPTIONS } from "@/lib/items";
import { LOVE_ITEMS, LOVE_SCALES, type LoveScaleId } from "@/lib/love/items";

export type LoveAnswers = Record<string, number>;

/** 척도별 문항 평균 (1~5, 역문항은 6 − 응답) */
export type LoveScores = Record<LoveScaleId, number>;

export type LoveLevel = "low" | "mid" | "high";

const VALID = new Set(LIKERT_OPTIONS.map((o) => o.value));

/** 48문항 모두에 1~5 정수로 답했는지. 모르는 문항은 버린다 */
export function validateLove(input: unknown): LoveAnswers | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const out: LoveAnswers = {};
  for (const item of LOVE_ITEMS) {
    const v = raw[item.id];
    if (typeof v !== "number" || !VALID.has(v)) return null;
    out[item.id] = v;
  }
  return out;
}

export function scoreLove(answers: LoveAnswers): LoveScores {
  const out = {} as LoveScores;
  for (const s of LOVE_SCALES) {
    const vals = LOVE_ITEMS.filter((i) => i.scale === s.id).map((i) => (i.reverse ? 6 - answers[i.id] : answers[i.id]));
    out[s.id] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
  }
  return out;
}

/** 기본 검사 성격 수준과 같은 기준 (src/lib/report.ts traitLevel) */
export function loveLevel(score: number): LoveLevel {
  if (score >= 3.67) return "high";
  if (score <= 2.33) return "low";
  return "mid";
}

/** 막대 위 점 위치 0~100 */
export const lovePercent = (score: number) => Math.round(((score - 1) / 4) * 100);
