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

/**
 * 문항 분석. rows는 [사람][문항] (역문항은 뒤집은 값).
 * 문항마다 평균·표준편차, 수정된 문항-총점 상관(그 문항을 뺀 나머지 문항 합과의 상관), 그 문항을 뺐을 때의 α
 */
export function itemAnalysis(rows: number[][]): { mean: number; sd: number; citc: number; alphaIfDeleted: number }[] {
  const k = rows[0]?.length ?? 0;
  return Array.from({ length: k }, (_, j) => {
    const { mean, sd } = meanSd(rows.map((r) => r[j]));
    const rest = rows.map((r) => r.reduce((a, b, i) => (i === j ? a : a + b), 0));
    return {
      mean,
      sd,
      citc: pearson(rows.map((r, p) => [r[j], rest[p]])),
      alphaIfDeleted: k > 2 ? cronbachAlpha(rows.map((r) => r.filter((_, i) => i !== j))) : NaN,
    };
  });
}

/** 상관 행렬. columns는 [변수][사람] (모든 변수의 사람 순서가 같아야 한다) */
export function correlationMatrix(columns: number[][]): number[][] {
  return columns.map((a, i) => columns.map((b, j) => (i === j ? 1 : pearson(a.map((v, p) => [v, b[p]])))));
}

/** 왜도 (표본 보정, SPSS와 같은 식). 3명 미만이거나 분산이 0이면 NaN. LPA 전에 지표가 한쪽으로 몰렸는지 볼 때 */
export function skewness(values: number[]): number {
  const n = values.length;
  if (n < 3) return NaN;
  const m = values.reduce((a, b) => a + b, 0) / n;
  const m2 = values.reduce((a, b) => a + (b - m) ** 2, 0) / n;
  const m3 = values.reduce((a, b) => a + (b - m) ** 3, 0) / n;
  if (m2 === 0) return NaN;
  return ((m3 / m2 ** 1.5) * Math.sqrt(n * (n - 1))) / (n - 2);
}
