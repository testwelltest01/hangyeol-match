import { describe, expect, it } from "vitest";
import { correlationMatrix, cronbachAlpha, itemAnalysis, meanSd, pearson, skewness } from "./stats";

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

describe("문항 분석·상관 행렬·왜도 (numpy로 확인한 값)", () => {
  const rows = [
    [1, 2, 2],
    [2, 3, 3],
    [3, 3, 4],
    [4, 4, 4],
    [5, 4, 5],
  ];
  it("문항마다 평균·표준편차·수정된 문항-총점 r·뺐을 때 α", () => {
    const a = itemAnalysis(rows);
    expect(a.map((x) => x.mean)).toEqual([3, 3.2, 3.6]);
    expect(a[0].sd).toBeCloseTo(1.581139, 6);
    expect(a.map((x) => x.citc)).toEqual([expect.closeTo(0.986394, 6), expect.closeTo(0.928985, 6), expect.closeTo(0.955134, 6)]);
    expect(a.map((x) => x.alphaIfDeleted)).toEqual([expect.closeTo(0.918919, 6), expect.closeTo(0.958904, 6), expect.closeTo(0.877193, 6)]);
  });
  it("상관 행렬은 대칭, 대각선 1", () => {
    const m = correlationMatrix([0, 1, 2].map((j) => rows.map((r) => r[j])));
    expect(m[0][0]).toBe(1);
    expect(m[0][1]).toBeCloseTo(0.944911, 6);
    expect(m[1][2]).toBeCloseTo(0.891042, 6);
    expect(m[2][0]).toBeCloseTo(m[0][2], 12);
  });
  it("왜도: 오른쪽으로 긴 꼬리는 양수, 3명 미만은 NaN", () => {
    expect(skewness([1, 2, 2, 3, 9])).toBeCloseTo(1.96936, 5);
    expect(skewness([1, 2])).toBeNaN();
  });
});
