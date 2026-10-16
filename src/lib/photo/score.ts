// 사진 피드백 결과 정리 (서버·테스트 공용, 외부 호출 없음)

export type PhotoSlot = "face" | "body";

export type Improvement = { what: string; how: string; why: string };

export type UserView = {
  acknowledged_previous: string | null;
  strength: string;
  improvements: Improvement[];
  suggest_retake: boolean;
};

export type Internal = {
  mood: number;
  photo_quality: number;
  expression_pose: number;
  grooming_style: number;
  overall: number;
  heavy_edit_suspected: boolean;
  model: string;
};

export type FeedbackResult =
  | { ok: true; valid: true; internal: Internal; userView: UserView }
  | { ok: true; valid: false; rejectReason: string }
  | { ok: false; error: string };

const WEIGHTS = { mood: 0.4, photo_quality: 0.25, expression_pose: 0.2, grooming_style: 0.15 } as const;
type ScoreKey = keyof typeof WEIGHTS;

/** 이 점수 미만이면 "한 번 더 찍어보시겠어요?"를 안내한다 */
export const RETAKE_SUGGEST_BELOW = 50;

/** 1~10 점수들의 가중합을 0~100으로 */
export function computeOverall(scores: Record<ScoreKey, number>): number {
  const weighted = (Object.keys(WEIGHTS) as ScoreKey[]).reduce((s, k) => s + scores[k] * WEIGHTS[k], 0);
  return Math.round(((weighted - 1) / 9) * 100);
}

const clamp = (v: unknown) => {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) ? Math.min(10, Math.max(1, n)) : 1;
};
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export type Raw = {
  is_valid?: unknown;
  reject_reason?: unknown;
  heavy_edit_suspected?: unknown;
  scores?: Record<string, unknown>;
  feedback?: { acknowledged_previous?: unknown; strength?: unknown; improvements?: unknown };
};

/** 모델 출력을 검증·정리하고 내부 저장용과 사용자 노출용으로 나눈다 */
export function postprocess(raw: Raw, model: string): Exclude<FeedbackResult, { ok: false }> {
  if (raw.is_valid !== true) {
    return {
      ok: true,
      valid: false,
      rejectReason: str(raw.reject_reason) || "이 사진은 등록 기준에 맞지 않아요. 다른 사진으로 다시 시도해주세요.",
    };
  }
  const scores = Object.fromEntries((Object.keys(WEIGHTS) as ScoreKey[]).map((k) => [k, clamp(raw.scores?.[k])])) as Record<
    ScoreKey,
    number
  >;
  const overall = computeOverall(scores);
  const improvements = (Array.isArray(raw.feedback?.improvements) ? raw.feedback.improvements : [])
    .slice(0, 3)
    .map((i: Record<string, unknown>) => ({ what: str(i?.what), how: str(i?.how), why: str(i?.why) }))
    .filter((i) => i.what);
  return {
    ok: true,
    valid: true,
    internal: { ...scores, overall, heavy_edit_suspected: raw.heavy_edit_suspected === true, model },
    userView: {
      acknowledged_previous: str(raw.feedback?.acknowledged_previous) || null,
      strength: str(raw.feedback?.strength),
      improvements,
      suggest_retake: overall < RETAKE_SUGGEST_BELOW,
    },
  };
}

