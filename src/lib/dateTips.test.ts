import { describe, expect, it } from "vitest";
import { VALUE_ITEMS } from "@/lib/items";
import { commonGround } from "@/lib/match/explain";
import type { Scores } from "@/lib/scoring";
import { DATE_MYTHS, DATE_TIPS, dateTipsSeenKey } from "./dateTips";

describe("첫 만남 팁", () => {
  it("팁마다 근거 연구가 하나 이상, 링크는 https(가능하면 DOI), id가 겹치지 않는다", () => {
    expect(new Set(DATE_TIPS.map((t) => t.id)).size).toBe(DATE_TIPS.length);
    for (const t of [...DATE_TIPS, ...DATE_MYTHS]) {
      expect(t.sources.length).toBeGreaterThan(0);
      for (const s of t.sources) {
        expect(s.url).toMatch(/^https:\/\//);
        expect(s.cite).toMatch(/\(\d{4}\)$/);
        expect(s.title.length).toBeGreaterThan(10);
        expect(s.journal.length).toBeGreaterThan(5);
      }
    }
    const doi = [...DATE_TIPS, ...DATE_MYTHS].flatMap((t) => t.sources).filter((s) => s.url.startsWith("https://doi.org/10."));
    expect(doi.length).toBeGreaterThanOrEqual(10);
  });

  it("만나는 동안 → 헤어진 뒤 순서, 두 사람 맞춤 한 줄은 공통점·다른 점 하나씩", () => {
    const phases = DATE_TIPS.map((t) => t.phase);
    expect(phases.indexOf("after")).toBeGreaterThan(phases.lastIndexOf("during"));
    expect(DATE_TIPS.filter((t) => t.hint === "common")).toHaveLength(1);
    expect(DATE_TIPS.filter((t) => t.hint === "differ")).toHaveLength(1);
    for (const t of DATE_TIPS) {
      expect(t.body.length).toBeLessThan(160);
      expect(t.basis.length).toBeLessThan(30);
    }
  });

  it("자동으로 한 번 연 기록은 상대마다 따로", () => {
    expect(dateTipsSeenKey("a")).not.toBe(dateTipsSeenKey("b"));
  });
});

const scores = (value: (i: number) => number): Scores =>
  ({
    version: "t",
    values: {
      items: Object.fromEntries(VALUE_ITEMS.map((v, i) => [v.id, value(i)])),
      importance: { marriage: 3, contact: 3, money: 3, leisure: 3, conflict: 3, chores: 3, tidiness: 3, routine: 3 },
    },
    dealbreakers: { marriage: "yes", children: "no", smoking: "none", drinking: "rarely" },
    bigFive: { extraversion: 3, agreeableness: 3, conscientiousness: 3, stability: 3, openness: 3 },
    hygiene: 18,
    grooming: { self: 2, preferred: null, importance: 1 },
  }) as Scores;

describe("공통점 한 줄", () => {
  it("충분히 비슷한 영역이 있으면 그 영역을, 모두 다르면 없음", () => {
    expect(commonGround(scores(() => 2), scores(() => 2))).toMatch(/가장 비슷해요/);
    expect(commonGround(scores(() => 1), scores(() => 6))).toBeNull();
  });
});
