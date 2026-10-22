import { describe, expect, it } from "vitest";
import { cronbachAlpha, meanSd, pearson } from "./stats";

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

describe("pearson", () => {
  it("완전 정적·부적 상관과 계산 불가", () => {
    expect(pearson([[1, 2], [2, 4], [3, 6]])).toBeCloseTo(1, 10);
    expect(pearson([[1, 3], [2, 2], [3, 1]])).toBeCloseTo(-1, 10);
    // numpy.corrcoef([1,2,3,4,5],[2,1,4,3,5]) = 0.8
    expect(pearson([[1, 2], [2, 1], [3, 4], [4, 3], [5, 5]])).toBeCloseTo(0.8, 10);
    expect(pearson([[1, 2], [2, 2], [3, 2]])).toBeNaN();
    expect(pearson([[1, 2], [2, 3]])).toBeNaN();
  });
});
