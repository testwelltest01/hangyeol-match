// 하루 추천 배분과 행동 기반 게이트 (기획서 '추천 알고리즘'의 쏠림 관리, 3층 필터)

export type Edge = {
  viewer: string;
  target: string;
  score: number;
  /** 상대가 먼저 관심을 보낸 경우. 점수와 상관없이 먼저 보여준다 */
  priority: boolean;
};

/** 한 사람이 하루에 받는 추천 수 (2026-10-23 3명 → 1명) */
export const PER_USER = 1;
/** 한 사람이 하루에 다른 사람의 추천에 들어갈 수 있는 최대 횟수 */
export const EXPOSURE_CAP = 6;

/**
 * 라운드 로빈 배분: 후보가 적은 사람부터 한 명씩 고르기를 PER_USER번 반복한다.
 * 점수 순으로 한꺼번에 나누면 "누구에게나 좋은 상대"가 모든 추천을 차지하고, 후보가 적은 사람이 빈손이 된다.
 * keep: 아직 답하지 않아 그대로 이어 보여줄 추천(사람마다, edges 안의 것). 먼저 자리를 채우고 노출에도 센다(상한과 상관없이 남긴다)
 */
export function allocate(
  edges: Edge[],
  opts: { perUser?: number; exposureCap?: number; exposure?: Map<string, number>; keep?: Map<string, Edge[]> } = {},
): Map<string, Edge[]> {
  const perUser = opts.perUser ?? PER_USER;
  const cap = opts.exposureCap ?? EXPOSURE_CAP;
  const exposure = new Map(opts.exposure ?? []);

  const byViewer = new Map<string, Edge[]>();
  for (const e of edges) {
    const list = byViewer.get(e.viewer) ?? [];
    list.push(e);
    byViewer.set(e.viewer, list);
  }
  for (const list of byViewer.values()) {
    list.sort((a, b) => Number(b.priority) - Number(a.priority) || b.score - a.score);
  }

  const order = [...byViewer.keys()].sort((a, b) => byViewer.get(a)!.length - byViewer.get(b)!.length || a.localeCompare(b));
  const picked = new Map<string, Edge[]>(order.map((v) => [v, []]));
  for (const [viewer, list] of opts.keep ?? []) {
    const mine = picked.get(viewer);
    if (!mine) continue;
    for (const e of list.slice(0, perUser)) {
      mine.push(e);
      exposure.set(e.target, (exposure.get(e.target) ?? 0) + 1);
    }
  }

  for (let round = 0; round < perUser; round++) {
    for (const viewer of order) {
      const mine = picked.get(viewer)!;
      if (mine.length > round) continue;
      const next = byViewer
        .get(viewer)!
        .find((e) => !mine.some((m) => m.target === e.target) && (exposure.get(e.target) ?? 0) < cap);
      if (!next) continue;
      mine.push(next);
      exposure.set(next.target, (exposure.get(next.target) ?? 0) + 1);
    }
  }
  return picked;
}

export type FeedbackReceived = {
  outcome: string;
  photo_match: number | null;
  cleanliness: number | null;
  manners: number | null;
};

/**
 * 3층 행동 기반 게이트: 실제로 만난 상대들의 평가가 나쁘게 쌓이면 노출을 줄인다.
 * 한두 번은 오해일 수 있어서 2건부터 반영한다.
 */
export function gateFactor(feedback: FeedbackReceived[]): number {
  const negatives = feedback.filter(
    (f) =>
      f.outcome === "no_show" ||
      (f.outcome === "met" && Math.min(f.photo_match ?? 5, f.cleanliness ?? 5, f.manners ?? 5) <= 2),
  ).length;
  if (negatives >= 4) return 0.3;
  if (negatives >= 2) return 0.6;
  return 1;
}
