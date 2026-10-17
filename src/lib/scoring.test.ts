import { describe, expect, it } from "vitest";
import {
  ALL_ITEMS,
  GENDER_GROOMING_ITEM_ID,
  visibleItems,
  OBSERVER_ITEMS,
  PERSONALITY_ITEMS,
  STEPS,
  VALUE_ITEMS,
  firstIncompleteStep,
  isRequired,
  sanitizeAnswers,
  type Answers,
} from "./items";
import {
  aggregateFriendRatings,
  computeScores,
  dealbreakerConflicts,
  directionalScore,
  domainSimilarity,
  mutualScore,
  scoreBigFive,
} from "./scoring";
import { buildReport, leanOf } from "./report";

/** 필수 문항을 모두 채운 응답을 만든다. overrides로 일부만 바꾼다. */
function fullAnswers(overrides: Answers = {}, valueAll = 3): Answers {
  const a: Answers = {};
  for (const item of ALL_ITEMS) {
    if (!isRequired(item)) continue;
    if (item.kind === "bipolar") a[item.id] = valueAll;
    else if (item.kind === "importance") a[item.id] = 2;
    else if (item.kind === "likert") a[item.id] = 3;
    else a[item.id] = item.options[0].value;
  }
  return { ...a, ...overrides };
}

describe("문항 설정", () => {
  it("관계 가치관 24 + 중요도 8 + 딜브레이커 3 = 35문항", () => {
    const ids = ALL_ITEMS.map((i) => i.id);
    expect(VALUE_ITEMS).toHaveLength(24);
    expect(ids.filter((id) => /^W\d$/.test(id))).toHaveLength(8);
    expect(ids.filter((id) => /^D\d$/.test(id))).toHaveLength(3);
  });

  it("문항 id가 겹치지 않는다", () => {
    const ids = ALL_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("친구 평가는 특성마다 정방향 1개, 역방향 1개", () => {
    expect(OBSERVER_ITEMS).toHaveLength(10);
    for (const trait of ["extraversion", "agreeableness", "conscientiousness", "stability", "openness"]) {
      const items = OBSERVER_ITEMS.filter((i) => i.trait === trait);
      expect(items.map((i) => i.reverse).sort()).toEqual([false, true]);
    }
  });

  it("허용되지 않는 값과 모르는 문항은 저장 전에 걸러진다", () => {
    expect(sanitizeAnswers({ V01: 7, V02: 3, W1: 0, D1: "maybe", D2: "yes", ZZZ: 1, P01: 2.5 })).toEqual({
      V02: 3,
      D2: "yes",
    });
  });

  it("처음으로 덜 끝난 단계를 찾는다", () => {
    expect(firstIncompleteStep({}, "male")).toBe(0);
    expect(firstIncompleteStep(fullAnswers(), "male")).toBe(STEPS.length);
    const partial = fullAnswers();
    delete partial.P15;
    expect(STEPS[firstIncompleteStep(partial, "male")].id).toBe("personality-2");
  });
});

describe("성격 채점", () => {
  it("역문항을 뒤집는다: 모든 문항에 5점이면 특성마다 정방향 5, 역방향 1이 섞인다", () => {
    const all5: Answers = Object.fromEntries(PERSONALITY_ITEMS.map((i) => [i.id, 5]));
    const s = scoreBigFive(all5);
    expect(s.extraversion).toBe(3); // 정 2개(5), 역 2개(1)
    expect(s.openness).toBe(2); // 정 1개(5), 역 3개(1)
    expect(s.stability).toBe(3); // 안정 문항 2개(5), 신경증 문항 2개(1)
  });

  it("외향적으로 답하면 외향성이 5", () => {
    const a: Answers = { P01: 5, P06: 1, P11: 5, P16: 1 };
    expect(scoreBigFive(a).extraversion).toBe(5);
  });

  it("친구 평가 여러 건을 평균낸다", () => {
    const r1: Answers = Object.fromEntries(OBSERVER_ITEMS.map((i) => [i.id, i.reverse ? 1 : 5]));
    const r2: Answers = Object.fromEntries(OBSERVER_ITEMS.map((i) => [i.id, 3]));
    const agg = aggregateFriendRatings([r1, r2]);
    expect(agg.count).toBe(2);
    expect(agg.bigFive.extraversion).toBe(4);
  });
});

describe("전체 채점", () => {
  it("필수 응답이 빠지면 에러", () => {
    const a = fullAnswers();
    delete a.V07;
    expect(() => computeScores(a, "male")).toThrow(/V07/);
  });

  it("위생 총점과 꾸밈 수준을 계산한다", () => {
    const s = computeScores(fullAnswers({ G1: 4, G2: 4, G3: 1, G4: 1, G5: 2, G6: 2, S1: 2, P1: 0 }), "male");
    expect(s.hygiene).toBe(18); // 첫 선택지가 3점
    expect(s.grooming.self).toBe(2.29); // (4+4+1+1+2+2+2) / 7, 남자는 면도·수염 문항 포함
    expect(s.grooming.preferred).toBeNull();
  });
});

describe("매칭 점수", () => {
  it("같은 사람끼리는 1, 정반대면 0", () => {
    const a = computeScores(fullAnswers({ P1: 0 }, 1), "male");
    const b = computeScores(fullAnswers({ P1: 0 }, 6), "male");
    expect(directionalScore(a, a)).toBe(1);
    expect(directionalScore(a, b)).toBe(0);
  });

  it("중요도가 '꼭 맞아야 한다'인 영역만 있으면 그 영역 유사도가 곧 점수", () => {
    const overrides: Answers = { W1: 1, W2: 4, W3: 1, W4: 1, W5: 1, W6: 1, W7: 1, W8: 1, P1: 0 };
    const a = computeScores(fullAnswers({ ...overrides, V04: 1, V05: 1, V06: 1 }), "male");
    const b = computeScores(fullAnswers({ ...overrides, V04: 6, V05: 3, V06: 1 }), "male");
    expect(directionalScore(a, b)).toBeCloseTo(domainSimilarity(a, b, "contact"));
  });

  it("상호 점수는 조화평균이라 두 방향 점수 사이, 낮은 쪽에 가깝다", () => {
    const a = computeScores(fullAnswers({ W2: 4, V04: 1, P1: 0 }), "male");
    const b = computeScores(fullAnswers({ W2: 1, V04: 6, P1: 0 }), "male");
    const p = directionalScore(a, b);
    const q = directionalScore(b, a);
    const m = mutualScore(a, b);
    expect(m).toBeLessThanOrEqual(Math.max(p, q));
    expect(m).toBeGreaterThanOrEqual(Math.min(p, q));
    expect(m).toBeLessThan((p + q) / 2);
  });

  it("'아직 모르겠다'는 충돌하지 않는다", () => {
    const yes = computeScores(fullAnswers({ D1: "yes", D2: "yes" }), "male");
    const no = computeScores(fullAnswers({ D1: "no", D2: "unsure" }), "male");
    expect(dealbreakerConflicts(yes, no)).toEqual(["marriage"]);
  });
});

describe("리포트", () => {
  it("응답 방향을 4단계로 나눈다", () => {
    expect([1, 2, 3, 4, 5, 6].map(leanOf)).toEqual([
      "strong-left",
      "strong-left",
      "left",
      "right",
      "strong-right",
      "strong-right",
    ]);
  });

  it("팁은 뚜렷하게 기운 응답에만, 최대 3개", () => {
    const neutral = buildReport(computeScores(fullAnswers(), "male"));
    expect(neutral.tips).toHaveLength(0);
    const strong = buildReport(computeScores(fullAnswers({}, 6), "male"));
    expect(strong.tips.length).toBeGreaterThan(0);
    expect(strong.tips.length).toBeLessThanOrEqual(3);
  });
});

describe("성별 꾸밈 문항", () => {
  const grooming = STEPS.find((st) => st.id === "grooming")!;

  it("남자는 면도·수염, 여자는 메이크업을 묻고, 모두 필수다", () => {
    const male = visibleItems(grooming, "male").map((i) => i.id);
    const female = visibleItems(grooming, "female").map((i) => i.id);
    expect(male).toContain("S1");
    expect(male).not.toContain("S3");
    expect(female).toContain("S3");
    expect(female).not.toContain("S1");
    expect(grooming.items.every(isRequired)).toBe(true);
  });

  it("성별 문항에 답하지 않으면 단계가 끝나지 않는다", () => {
    const a = fullAnswers();
    delete a[GENDER_GROOMING_ITEM_ID.female];
    expect(firstIncompleteStep(a, "male")).toBe(STEPS.length); // 남자는 메이크업 문항이 없음
    expect(STEPS[firstIncompleteStep(a, "female")].id).toBe("grooming");
  });

  it("꾸밈 수준 점수에 성별 문항이 들어간다", () => {
    const base = { G1: 2, G2: 2, G3: 2, G4: 2, G5: 2, G6: 2 };
    const m = computeScores(fullAnswers({ ...base, S1: 4 }), "male");
    const f = computeScores(fullAnswers({ ...base, S3: 1 }), "female");
    expect(m.grooming.self).toBeCloseTo((2 * 6 + 4) / 7, 2);
    expect(f.grooming.self).toBeCloseTo((2 * 6 + 1) / 7, 2);
  });
});
