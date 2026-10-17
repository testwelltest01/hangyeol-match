import { describe, expect, it } from "vitest";
import { cronbachAlpha, meanSd } from "./stats";

describe("meanSd", () => {
  it("표본 표준편차 (n − 1)", () => {
    const r = meanSd([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(r.mean).toBe(5);
    expect(r.sd).toBeCloseTo(2.138, 3);
    expect(meanSd([]).n).toBe(0);
  });
});

describe("cronbachAlpha", () => {
  it("교과서 예시와 같은 값", () => {
    // 3문항 5명: 문항 분산 합 = 4.5, 총점 분산 = 12.2 → α = 1.5 × (1 − 4.5/12.2) ≈ 0.94672 (numpy로 확인)
    const rows = [
      [1, 2, 2],
      [2, 3, 3],
      [3, 3, 4],
      [4, 4, 4],
      [5, 4, 5],
    ];
    expect(cronbachAlpha(rows)).toBeCloseTo(0.9467213, 6);
  });

  it("문항이 완전히 같으면 1, 사람이 적거나 분산이 없으면 NaN", () => {
    expect(cronbachAlpha([[1, 1], [2, 2], [3, 3]])).toBeCloseTo(1, 10);
    expect(cronbachAlpha([[1, 2], [2, 3]])).toBeNaN();
    expect(cronbachAlpha([[3, 3], [3, 3], [3, 3]])).toBeNaN();
  });
});
