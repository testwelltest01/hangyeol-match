// 추가 검사 집계: 평균·표준편차, 크론바흐 알파. 순수 함수.

export function meanSd(values: number[]): { n: number; mean: number; sd: number } {
  const n = values.length;
  if (!n) return { n: 0, mean: NaN, sd: NaN };
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const sd = n > 1 ? Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : NaN;
  return { n, mean, sd };
}

const variance = (xs: number[]) => {
  const n = xs.length;
  const m = xs.reduce((a, b) => a + b, 0) / n;
  return xs.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1);
};

/**
 * 크론바흐 알파. rows는 [사람][문항] (역문항은 뒤집은 값).
 * 사람이 3명 미만이거나 총점 분산이 0이면 NaN.
 */
export function cronbachAlpha(rows: number[][]): number {
  const n = rows.length;
  const k = rows[0]?.length ?? 0;
  if (n < 3 || k < 2) return NaN;
  const itemVar = Array.from({ length: k }, (_, j) => variance(rows.map((r) => r[j]))).reduce((a, b) => a + b, 0);
  const totalVar = variance(rows.map((r) => r.reduce((a, b) => a + b, 0)));
  if (totalVar === 0) return NaN;
  return (k / (k - 1)) * (1 - itemVar / totalVar);
}

/** 피어슨 상관 (재검사 신뢰도용). 짝이 3쌍 미만이거나 한쪽 분산이 0이면 NaN */
export function pearson(pairs: [number, number][]): number {
  const n = pairs.length;
  if (n < 3) return NaN;
  const mx = pairs.reduce((a, [x]) => a + x, 0) / n;
  const my = pairs.reduce((a, [, y]) => a + y, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const [x, y] of pairs) {
    sxy += (x - mx) * (y - my);
    sxx += (x - mx) ** 2;
    syy += (y - my) ** 2;
  }
  return sxx === 0 || syy === 0 ? NaN : sxy / Math.sqrt(sxx * syy);
}
