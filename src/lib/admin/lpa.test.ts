import { describe, expect, it } from "vitest";
import { fitLpa, fitRange, paramCount, suggestK } from "./lpa";
import { LOVE_SCALES, LOVE_VERSION } from "@/lib/love/items";
import { pickLoveSample, retestPairs } from "./loveSample";
import { LPA_SETS, loveMplus } from "./lpaSets";

/** 고정 시드 정규분포 난수 */
function normal(seed: number) {
  let a = seed;
  const u = () => {
    a = (a * 1664525 + 1013904223) % 4294967296;
    return (a + 0.5) / 4294967296;
  };
  return () => Math.sqrt(-2 * Math.log(u())) * Math.cos(2 * Math.PI * u());
}

/** 평균이 다른 두 집단 (분산 0.5², 3개 지표) */
function twoGroups(n1: number, n2: number) {
  const z = normal(7);
  const X: number[][] = [];
  for (let i = 0; i < n1; i++) X.push([2 + 0.5 * z(), 4 + 0.5 * z(), 2 + 0.5 * z()]);
  for (let i = 0; i < n2; i++) X.push([4 + 0.5 * z(), 2 + 0.5 * z(), 4 + 0.5 * z()]);
  return X;
}

describe("paramCount", () => {
  it("Mplus와 같은 모수 수", () => {
    expect(paramCount(3, 5, "equal")).toBe(3 * 5 + 5 + 2); // 평균 15 + 분산 5 + 비율 2
    expect(paramCount(3, 5, "varying")).toBe(2 * 3 * 5 + 2);
  });
});

describe("fitLpa", () => {
  it("1개 프로필은 닫힌 해와 같다", () => {
    const X = twoGroups(50, 50);
    const r = fitLpa(X, 1);
    const n = X.length;
    let expected = 0;
    for (let j = 0; j < 3; j++) {
      const m = X.reduce((a, x) => a + x[j], 0) / n;
      const v = X.reduce((a, x) => a + (x[j] - m) ** 2, 0) / n;
      expected += -0.5 * n * (Math.log(2 * Math.PI * v) + 1);
    }
    expect(r.logLik).toBeCloseTo(expected, 6);
    expect(r.entropy).toBeNull();
  });

  it("두 집단을 찾아내고, BIC는 2개에서 가장 낮다", () => {
    const X = twoGroups(120, 80);
    const results = fitRange(X, 4);
    const bics = results.map((r) => r.bic);
    expect(bics.indexOf(Math.min(...bics))).toBe(1);
    expect(suggestK(results)).toBe(2);

    const r2 = results[1];
    // 큰 프로필이 1번: 평균 (2, 4, 2), 비율 0.6
    expect(r2.proportions[0]).toBeCloseTo(0.6, 1);
    expect(r2.means[0][0]).toBeCloseTo(2, 0);
    expect(r2.means[0][1]).toBeCloseTo(4, 0);
    expect(r2.means[1][0]).toBeCloseTo(4, 0);
    expect(r2.counts).toEqual([120, 80]);
    expect(r2.entropy!).toBeGreaterThan(0.95);
    expect(r2.avePP[0][0]).toBeGreaterThan(0.95);
    expect(r2.bestReplicated).toBeGreaterThanOrEqual(2);
    expect(r2.converged).toBe(true);
    for (const p of r2.posterior) expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    // 분산 같음 모형: 모든 프로필의 분산이 같다
    expect(r2.variances[0]).toEqual(r2.variances[1]);
  });

  it("프로필을 늘리면 로그우도가 줄지 않는다", () => {
    const results = fitRange(twoGroups(60, 60), 4, { model: "varying" });
    for (let i = 1; i < results.length; i++) expect(results[i].logLik).toBeGreaterThanOrEqual(results[i - 1].logLik - 1e-6);
  });

  it("같은 데이터면 같은 결과 (고정 시드)", () => {
    const X = twoGroups(40, 40);
    expect(fitLpa(X, 3).logLik).toBe(fitLpa(X, 3).logLik);
  });

  it("모수가 사람 수보다 많아지는 k는 건너뛴다", () => {
    const X = twoGroups(6, 6); // 12명
    const results = fitRange(X, 6); // 3지표: k=2 → 10개, k=3 → 14개
    expect(results.map((r) => r.k)).toEqual([1, 2]);
  });
});


describe("연애 상황 검사 LPA 표본", () => {
  const a = (id: string, user: string | null, at: string, version = LOVE_VERSION) => ({ id, user_id: user, version, created_at: at });
  const rows = [
    a("r2", "u1", "2026-10-21T00:00:00Z"),
    a("r1", "u1", "2026-10-20T00:00:00Z"),
    a("g1", null, "2026-10-20T05:00:00Z"),
    a("old", "u2", "2026-10-19T00:00:00Z", "2026-09-v1"),
    a("r3", "u3", "2026-10-22T00:00:00Z"),
  ];
  it("사람마다 첫/최근 검사 하나, 지금 문항 버전만, 비회원은 검사 한 번이 한 사람", () => {
    expect(pickLoveSample(rows, { attempt: "first", guests: true }).map((r) => r.id)).toEqual(["r1", "g1", "r3"]);
    expect(pickLoveSample(rows, { attempt: "latest", guests: true }).map((r) => r.id)).toEqual(["r2", "g1", "r3"]);
    expect(pickLoveSample(rows, { attempt: "first", guests: false }).map((r) => r.id)).toEqual(["r1", "r3"]);
    expect(retestPairs(rows).map(([x, y]) => [x.id, y.id])).toEqual([["r1", "r2"]]);
  });
  it("연애 지표 묶음: Mplus 이름이 8자 이하이고 겹치지 않는다", () => {
    const names = LOVE_SCALES.map((s) => loveMplus(s.id));
    expect(new Set(names).size).toBe(names.length);
    expect(names.every((n) => /^[A-Z]{1,8}$/.test(n))).toBe(true);
    const all = LPA_SETS.find((s) => s.id === "love_all")!;
    expect(all.source).toBe("love");
    expect(all.indicators).toHaveLength(19);
    expect(LPA_SETS.find((s) => s.id === "love_relation")!.indicators).toHaveLength(12);
    expect(LPA_SETS.find((s) => s.id === "love_nature")!.indicators).toHaveLength(7);
  });
});
