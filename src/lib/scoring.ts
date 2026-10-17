import {
  DOMAINS,
  IMPORTANCE_ITEMS,
  IMPORTANCE_WEIGHT,
  OBSERVER_ITEMS,
  PERSONALITY_ITEMS,
  TEST_VERSION,
  TRAITS,
  VALUE_ITEMS,
  GROOMING_ITEMS,
  GENDER_GROOMING_ITEM_ID,
  HYGIENE_ITEMS,
  type Answers,
  type Domain,
  type TestGender,
  type Trait,
} from "./items";

export type Scores = {
  version: string;
  values: {
    /** V01~V24 원점수 (1~6) */
    items: Record<string, number>;
    /** 영역별 중요도 원점수 (1~4) */
    importance: Record<Domain, number>;
  };
  dealbreakers: { marriage: string; children: string; smoking: string };
  /** 특성별 평균 (1~5). 정서 안정성은 높을수록 안정적 */
  bigFive: Record<Trait, number>;
  /** 0~18. 화면에 보여주지 않는다 */
  hygiene: number;
  grooming: {
    /** 본인 꾸밈 수준 (1~4) */
    self: number;
    /** 상대에게 원하는 꾸밈 수준 (1~4). 상관없음이면 null */
    preferred: number | null;
    /** 꾸밈 영역 중요도 원점수 (1~4) */
    importance: number;
  };
};

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const round2 = (x: number) => Math.round(x * 100) / 100;
const num = (answers: Answers, id: string) => Number(answers[id]);

/** 리커트 응답을 역채점까지 반영해 특성별 평균으로 만든다. */
export function scoreBigFive(answers: Answers, items = PERSONALITY_ITEMS): Record<Trait, number> {
  const out = {} as Record<Trait, number>;
  for (const { id: trait } of TRAITS) {
    const vals = items
      .filter((i) => i.trait === trait && answers[i.id] !== undefined)
      .map((i) => (i.reverse ? 6 - num(answers, i.id) : num(answers, i.id)));
    out[trait] = vals.length ? round2(mean(vals)) : NaN;
  }
  return out;
}

/** 전체 응답으로 점수를 계산한다. 필수 문항이 비어 있으면 에러를 던진다. */
export function computeScores(answers: Answers, gender: TestGender): Scores {
  const genderItem = GENDER_GROOMING_ITEM_ID[gender];
  const missing = [
    ...VALUE_ITEMS,
    ...IMPORTANCE_ITEMS,
    ...PERSONALITY_ITEMS,
    ...HYGIENE_ITEMS,
    ...GROOMING_ITEMS,
  ]
    .map((i) => i.id)
    .concat(["D1", "D2", "D3", "P1", "P2", genderItem])
    .filter((id) => answers[id] === undefined);
  if (missing.length) throw new Error(`응답이 빠진 문항: ${missing.join(", ")}`);

  const items: Record<string, number> = {};
  for (const v of VALUE_ITEMS) items[v.id] = num(answers, v.id);

  const importance = {} as Record<Domain, number>;
  for (const w of IMPORTANCE_ITEMS) importance[w.domain as Domain] = num(answers, w.id);

  const preferred = num(answers, "P1");

  return {
    version: TEST_VERSION,
    values: { items, importance },
    dealbreakers: {
      marriage: String(answers.D1),
      children: String(answers.D2),
      smoking: String(answers.D3),
    },
    bigFive: scoreBigFive(answers),
    hygiene: HYGIENE_ITEMS.reduce((sum, i) => sum + num(answers, i.id), 0),
    grooming: {
      // G1~G6과 성별 문항(남 면도·수염, 여 메이크업)의 평균
      self: round2(mean([...GROOMING_ITEMS.map((i) => num(answers, i.id)), num(answers, genderItem)])),
      preferred: preferred === 0 ? null : preferred,
      importance: num(answers, "P2"),
    },
  };
}

/** 친구 평가 여러 건을 특성별 평균으로 합친다. */
export function aggregateFriendRatings(ratings: Answers[]): { count: number; bigFive: Record<Trait, number> } {
  const perRating = ratings.map((r) => scoreBigFive(r, OBSERVER_ITEMS));
  const bigFive = {} as Record<Trait, number>;
  for (const { id } of TRAITS) {
    const vals = perRating.map((p) => p[id]).filter((v) => !Number.isNaN(v));
    bigFive[id] = vals.length ? round2(mean(vals)) : NaN;
  }
  return { count: ratings.length, bigFive };
}

// ---------------------------------------------------------------------------
// 매칭 점수 (1단계에서 사용). 기획서 '척도 문항 초안'의 채점 공식을 그대로 구현한다.
// ---------------------------------------------------------------------------

/** 문항 유사도: 1 − |A − B| ÷ 5 (양극 6점 척도) */
export function itemSimilarity(a: number, b: number): number {
  return 1 - Math.abs(a - b) / 5;
}

/** 영역 유사도: 그 영역 3문항 유사도의 평균 */
export function domainSimilarity(a: Scores, b: Scores, domain: Domain): number {
  const ids = VALUE_ITEMS.filter((v) => v.domain === domain).map((v) => v.id);
  return mean(ids.map((id) => itemSimilarity(a.values.items[id], b.values.items[id])));
}

/**
 * A가 B를 보는 점수 S(A→B).
 * 영역 유사도를 A의 중요도 가중치로 가중평균하고, 꾸밈 영역(A가 원하는 수준 vs B의 본인 수준)을 9번째 영역처럼 더한다.
 * A의 가중치가 모두 0이면 단순 평균을 쓴다.
 */
export function directionalScore(a: Scores, b: Scores): number {
  const parts: { sim: number; weight: number }[] = DOMAINS.map(({ id }) => ({
    sim: domainSimilarity(a, b, id),
    weight: IMPORTANCE_WEIGHT[a.values.importance[id]] ?? 0,
  }));

  if (a.grooming.preferred !== null) {
    parts.push({
      sim: 1 - Math.abs(b.grooming.self - a.grooming.preferred) / 3,
      weight: IMPORTANCE_WEIGHT[a.grooming.importance] ?? 0,
    });
  }

  const totalWeight = parts.reduce((s, p) => s + p.weight, 0);
  if (totalWeight === 0) return mean(parts.map((p) => p.sim));
  return parts.reduce((s, p) => s + p.sim * p.weight, 0) / totalWeight;
}

/** 상호 점수: 두 방향 점수의 조화평균. 한쪽만 높으면 크게 낮아진다. */
export function mutualScore(a: Scores, b: Scores): number {
  const p = directionalScore(a, b);
  const q = directionalScore(b, a);
  return p + q === 0 ? 0 : (2 * p * q) / (p + q);
}

/** 딜브레이커 충돌 여부. "아직 모르겠다"는 어느 쪽과도 충돌하지 않는다. */
export function dealbreakerConflicts(a: Scores, b: Scores): ("marriage" | "children")[] {
  const out: ("marriage" | "children")[] = [];
  const clash = (x: string, y: string) => (x === "yes" && y === "no") || (x === "no" && y === "yes");
  if (clash(a.dealbreakers.marriage, b.dealbreakers.marriage)) out.push("marriage");
  if (clash(a.dealbreakers.children, b.dealbreakers.children)) out.push("children");
  return out;
}
