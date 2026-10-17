import { describe, expect, it } from "vitest";
import { EXTRA_TESTS, extraCommonalities, findExtraTest, scoreExtra, summarizeExtra, topScales, validateExtra, type ExtraAnswers } from "./tests";

const fill = (testId: string, values: Record<string, number>, rest = 3): ExtraAnswers => {
  const t = findExtraTest(testId)!;
  return Object.fromEntries(t.items.map((i) => [i.id, values[i.id] ?? (i.options ? 1 : rest)]));
};

describe("문항 구성", () => {
  it("검사마다 문항 id가 겹치지 않고, 하위척도마다 2문항 이상", () => {
    const ids = EXTRA_TESTS.flatMap((t) => t.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of EXTRA_TESTS) {
      for (const s of t.scales) expect(t.items.filter((i) => i.scale === s.id).length).toBeGreaterThanOrEqual(2);
      for (const i of t.items) expect(Boolean(i.scale) !== Boolean(i.options)).toBe(true);
    }
  });
});

describe("validateExtra", () => {
  it("빠진 문항이나 보기에 없는 값은 받지 않는다", () => {
    const t = findExtraTest("talk")!;
    expect(validateExtra(t, fill("talk", {}))).not.toBeNull();
    expect(validateExtra(t, { ...fill("talk", {}), T01: 6 })).toBeNull();
    expect(validateExtra(t, { ...fill("talk", {}), T01: "5" })).toBeNull();
    const { T08: _drop, ...missing } = fill("talk", {});
    void _drop;
    expect(validateExtra(t, missing)).toBeNull();
    expect(validateExtra(t, null)).toBeNull();
  });
});

describe("채점과 요약", () => {
  it("애정 표현: 가장 높은 방식과 내가 표현하는 방식", () => {
    const t = findExtraTest("affection")!;
    const s = scoreExtra(t, fill("affection", { A02: 5, A07: 5, A11: 5 }));
    expect(s.scales.time).toBe(5);
    expect(s.scales.words).toBe(3);
    expect(s.choice).toBe(5);
    expect(topScales(t, s).map((x) => x.id)).toEqual(["time"]);
    const sum = summarizeExtra(t, s);
    expect(sum.headline).toBe("함께하는 시간에서 마음이 가장 크게 전해지는 편이에요. 내 마음은 주로 행동으로 돕기로 표현해요.");
    expect(sum.chips).toEqual(["마음이 전해지는 순간: 함께하는 시간", "표현은 주로: 행동으로 돕기"]);
  });

  it("위로: 받고 싶은 위로와 주는 위로를 따로 고른다", () => {
    const t = findExtraTest("comfort")!;
    const s = scoreExtra(t, fill("comfort", { C01: 5, C06: 5, C05: 5, C10: 4 }));
    expect(topScales(t, s, "want").map((x) => x.id)).toEqual(["want_empathy"]);
    expect(topScales(t, s, "give").map((x) => x.id)).toEqual(["give_solution"]);
    expect(summarizeExtra(t, s).headline).toBe("힘들 땐 누군가 들어주는 것이 가장 위로가 되고, 위로할 땐 해결 방법을 찾아 주는 편이에요.");
  });

  it("대화 코드: 역문항을 뒤집어 말하기·듣기를 낸다", () => {
    const t = findExtraTest("talk")!;
    const s = scoreExtra(t, fill("talk", { T04: 1, T08: 5, T03: 5, T07: 4 }));
    expect(s.scales.talker).toBe(1);
    expect(s.scales.deep).toBe(4.5);
    expect(summarizeExtra(t, s).chips).toEqual(["깊은 대화를 좋아해요", "듣는 쪽이 편해요"]);
  });
});

describe("extraCommonalities", () => {
  it("같은 방식, 잘 맞는 위로, 둘 다 깊은 대화", () => {
    const aff = findExtraTest("affection")!;
    const com = findExtraTest("comfort")!;
    const talk = findExtraTest("talk")!;
    const mine = {
      affection: scoreExtra(aff, fill("affection", { A02: 5, A07: 5, A04: 5, A09: 5 })), // 시간·스킨십
      comfort: scoreExtra(com, fill("comfort", { C01: 5, C06: 5 })), // 들어주기를 원함
      talk: scoreExtra(talk, fill("talk", { T03: 5, T07: 5 })),
    };
    const theirs = {
      affection: scoreExtra(aff, fill("affection", { A04: 5, A09: 5, A11: 2 })), // 스킨십, 표현은 시간
      comfort: scoreExtra(com, fill("comfort", { C04: 5, C09: 5 })), // 공감하며 들어줌
      talk: scoreExtra(talk, fill("talk", { T03: 4, T07: 4 })),
    };
    expect(extraCommonalities(mine, theirs, "하늘")).toEqual([
      "두 분 다 스킨십에서 마음을 크게 느껴요.",
      "하늘님은 주로 함께하는 시간으로 마음을 표현해요. 내가 마음을 크게 느끼는 방식이에요.",
      "하늘님이 위로하는 방식이 내가 받고 싶은 위로와 잘 맞아요.",
      "두 분 다 깊은 대화를 좋아해요.",
    ]);
    expect(extraCommonalities({}, theirs, "하늘")).toEqual([]);
  });
});
