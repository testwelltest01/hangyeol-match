// 잠재프로파일분석(LPA). 지표 사이 공분산이 0인 가우시안 혼합모형을 EM으로 추정한다.
// - equal: 프로필마다 평균이 다르고 분산은 같음 (Mplus 기본 LPA)
// - varying: 평균과 분산 모두 프로필마다 다름
// 여러 시작값(짧게 돌린 뒤 좋은 것만 끝까지)과 고정 시드를 써서 새로 고쳐도 같은 결과가 나온다.

export type LpaModel = "equal" | "varying";

export type LpaResult = {
  k: number;
  n: number;
  d: number;
  model: LpaModel;
  logLik: number;
  params: number;
  aic: number;
  bic: number;
  sabic: number;
  /** 상대 엔트로피 (0~1). k=1이면 null */
  entropy: number | null;
  /** 추정된 프로필 비율 π */
  proportions: number[];
  /** 가장 가능성 높은 프로필로 나눈 인원 */
  counts: number[];
  /** [프로필][지표] */
  means: number[][];
  variances: number[][];
  /** [사람][프로필] 사후확률 */
  posterior: number[][];
  /** 사람마다 가장 가능성 높은 프로필 */
  modal: number[];
  /** [배정된 프로필][프로필] 평균 사후확률 (대각선이 분류 정확도) */
  avePP: number[][];
  iterations: number;
  converged: boolean;
  /** 끝까지 돌린 시작값 중 최고 로그우도와 같은 값을 낸 수 */
  bestReplicated: number;
  finalStarts: number;
};

export type LpaOptions = {
  model?: LpaModel;
  seed?: number;
  /** 짧게 돌려볼 시작값 수 */
  starts?: number;
  /** 그중 끝까지 돌릴 수 */
  finalStarts?: number;
  shortIter?: number;
  maxIter?: number;
  tol?: number;
};

const LOG_2PI = Math.log(2 * Math.PI);

/** 고정 시드 난수 (mulberry32) */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 데이터 크기에 맞춘 시작값 수 (작으면 Mplus의 STARTS 100 20 정도, 크면 줄인다) */
export function defaultStarts(n: number, d: number): { starts: number; finalStarts: number } {
  const work = n * d;
  const starts = work <= 6000 ? 100 : work <= 20000 ? 50 : work <= 80000 ? 20 : 10;
  return { starts, finalStarts: Math.max(2, Math.round(starts / 5)) };
}

export function paramCount(k: number, d: number, model: LpaModel): number {
  return model === "equal" ? k * d + d + (k - 1) : 2 * k * d + (k - 1);
}

type State = { means: number[][]; vars: number[][]; pi: number[] };

function columnStats(X: number[][]) {
  const n = X.length;
  const d = X[0].length;
  const mean = Array(d).fill(0);
  for (const x of X) for (let j = 0; j < d; j++) mean[j] += x[j] / n;
  const v = Array(d).fill(0);
  for (const x of X) for (let j = 0; j < d; j++) v[j] += (x[j] - mean[j]) ** 2 / n;
  return { mean, variance: v };
}

/** E 단계: 사후확률과 로그우도 */
function eStep(X: number[][], s: State, resp: number[][]): number {
  const k = s.pi.length;
  const d = X[0].length;
  const logPi = s.pi.map((p) => Math.log(Math.max(p, 1e-300)));
  const cst = s.vars.map((v) => v.reduce((acc, vj) => acc - 0.5 * (LOG_2PI + Math.log(vj)), 0));
  let ll = 0;
  const lp = new Array<number>(k);
  for (let i = 0; i < X.length; i++) {
    const x = X[i];
    let mx = -Infinity;
    for (let c = 0; c < k; c++) {
      let q = 0;
      const m = s.means[c];
      const v = s.vars[c];
      for (let j = 0; j < d; j++) q += (x[j] - m[j]) ** 2 / v[j];
      lp[c] = logPi[c] + cst[c] - 0.5 * q;
      if (lp[c] > mx) mx = lp[c];
    }
    let sum = 0;
    for (let c = 0; c < k; c++) sum += Math.exp(lp[c] - mx);
    const lse = mx + Math.log(sum);
    ll += lse;
    for (let c = 0; c < k; c++) resp[i][c] = Math.exp(lp[c] - lse);
  }
  return ll;
}

/** M 단계 */
function mStep(X: number[][], resp: number[][], s: State, model: LpaModel, floor: number[]): void {
  const n = X.length;
  const d = X[0].length;
  const k = s.pi.length;
  const nk = Array(k).fill(0);
  for (const r of resp) for (let c = 0; c < k; c++) nk[c] += r[c];
  for (let c = 0; c < k; c++) {
    s.pi[c] = Math.max(nk[c] / n, 1e-12);
    if (nk[c] < 1e-10) continue; // 빈 프로필은 평균을 그대로 둔다
    const m = Array(d).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < d; j++) m[j] += resp[i][c] * X[i][j];
    for (let j = 0; j < d; j++) m[j] /= nk[c];
    s.means[c] = m;
  }
  if (model === "equal") {
    const v = Array(d).fill(0);
    for (let i = 0; i < n; i++)
      for (let c = 0; c < k; c++) for (let j = 0; j < d; j++) v[j] += resp[i][c] * (X[i][j] - s.means[c][j]) ** 2;
    const shared = v.map((x, j) => Math.max(x / n, floor[j]));
    for (let c = 0; c < k; c++) s.vars[c] = [...shared];
  } else {
    for (let c = 0; c < k; c++) {
      if (nk[c] < 1e-10) continue;
      const v = Array(d).fill(0);
      for (let i = 0; i < n; i++) for (let j = 0; j < d; j++) v[j] += resp[i][c] * (X[i][j] - s.means[c][j]) ** 2;
      s.vars[c] = v.map((x, j) => Math.max(x / nk[c], floor[j]));
    }
  }
}

/** k-means++ 방식으로 서로 떨어진 사람들을 처음 평균으로 고른다 */
function initState(X: number[][], k: number, rand: () => number, variance: number[]): State {
  const n = X.length;
  const centers: number[][] = [X[Math.floor(rand() * n)]];
  while (centers.length < k) {
    const dist = X.map((x) => Math.min(...centers.map((c) => c.reduce((a, cj, j) => a + (x[j] - cj) ** 2 / variance[j], 0))));
    const total = dist.reduce((a, b) => a + b, 0);
    let r = rand() * total;
    let pick = 0;
    for (; pick < n - 1; pick++) {
      r -= dist[pick];
      if (r <= 0) break;
    }
    centers.push(X[pick]);
  }
  return { means: centers.map((c) => [...c]), vars: centers.map(() => [...variance]), pi: Array(k).fill(1 / k) };
}

function run(X: number[][], s: State, model: LpaModel, floor: number[], maxIter: number, tol: number) {
  const resp = X.map(() => Array(s.pi.length).fill(0));
  let ll = eStep(X, s, resp);
  let iter = 0;
  let converged = false;
  while (iter < maxIter) {
    iter++;
    mStep(X, resp, s, model, floor);
    const next = eStep(X, s, resp);
    const diff = next - ll;
    ll = next;
    if (Math.abs(diff) < tol * Math.max(1, Math.abs(ll))) {
      converged = true;
      break;
    }
  }
  return { ll, resp, iter, converged };
}

export function fitLpa(X: number[][], k: number, opts: LpaOptions = {}): LpaResult {
  const model = opts.model ?? "equal";
  const n = X.length;
  const d = X[0]?.length ?? 0;
  if (n < 2 || d < 1) throw new Error("데이터가 부족해요");
  const { variance } = columnStats(X);
  const safeVar = variance.map((v) => Math.max(v, 1e-6));
  const floor = safeVar.map((v) => Math.max(v * 1e-3, 1e-6));
  const rand = rng(opts.seed ?? 20261017 + k);
  const auto = defaultStarts(n, d);
  const starts = k === 1 ? 1 : (opts.starts ?? auto.starts);
  const finalStarts = k === 1 ? 1 : Math.min(opts.finalStarts ?? auto.finalStarts, starts);
  const shortIter = opts.shortIter ?? 20;
  const maxIter = opts.maxIter ?? 1000;
  const tol = opts.tol ?? 1e-9;

  // 1) 시작값마다 짧게 돌린다
  const candidates: { s: State; ll: number }[] = [];
  for (let t = 0; t < starts; t++) {
    const s = initState(X, k, rand, safeVar);
    const { ll } = run(X, s, model, floor, k === 1 ? 1 : shortIter, tol);
    candidates.push({ s, ll });
  }
  candidates.sort((a, b) => b.ll - a.ll);

  // 2) 좋은 것만 끝까지 돌린다
  const finals = candidates.slice(0, finalStarts).map(({ s }) => ({ s, ...run(X, s, model, floor, maxIter, tol) }));
  finals.sort((a, b) => b.ll - a.ll);
  const best = finals[0];
  const bestReplicated = finals.filter((f) => Math.abs(f.ll - best.ll) < 0.01).length;

  // 3) 프로필 순서: 큰 프로필부터
  const order = best.s.pi.map((p, c) => ({ p, c })).sort((a, b) => b.p - a.p || best.s.means[a.c][0] - best.s.means[b.c][0]).map((o) => o.c);
  const proportions = order.map((c) => best.s.pi[c]);
  const means = order.map((c) => best.s.means[c]);
  const variances = order.map((c) => best.s.vars[c]);
  const posterior = best.resp.map((r) => order.map((c) => r[c]));
  const modal = posterior.map((r) => r.indexOf(Math.max(...r)));
  const counts = Array(k).fill(0);
  for (const m of modal) counts[m]++;
  const avePP = Array.from({ length: k }, (_, a) => {
    const rows = posterior.filter((_, i) => modal[i] === a);
    return Array.from({ length: k }, (_, b) => (rows.length ? rows.reduce((s, r) => s + r[b], 0) / rows.length : NaN));
  });

  let entropy: number | null = null;
  if (k > 1) {
    let h = 0;
    for (const r of posterior) for (const p of r) if (p > 0) h -= p * Math.log(p);
    entropy = 1 - h / (n * Math.log(k));
  }

  const params = paramCount(k, d, model);
  const ll = best.ll;
  return {
    k,
    n,
    d,
    model,
    logLik: ll,
    params,
    aic: -2 * ll + 2 * params,
    bic: -2 * ll + params * Math.log(n),
    sabic: -2 * ll + params * Math.log((n + 2) / 24),
    entropy,
    proportions,
    counts,
    means,
    variances,
    posterior,
    modal,
    avePP,
    iterations: best.iter,
    converged: best.converged,
    bestReplicated,
    finalStarts,
  };
}

/** 1개부터 kMax개까지. 모수가 사람 수보다 많아지는 k는 건너뛴다 */
export function fitRange(X: number[][], kMax: number, opts: LpaOptions = {}): LpaResult[] {
  const model = opts.model ?? "equal";
  const d = X[0]?.length ?? 0;
  const out: LpaResult[] = [];
  for (let k = 1; k <= kMax; k++) {
    if (paramCount(k, d, model) >= X.length) break;
    out.push(fitLpa(X, k, opts));
  }
  return out;
}

/** 먼저 보여줄 프로필 수: 가장 작은 프로필이 5% 이상인 것 중 BIC가 가장 낮은 k (2개 이상) */
export function suggestK(results: LpaResult[]): number | null {
  const ok = results.filter((r) => r.k >= 2 && Math.min(...r.counts) / r.n >= 0.05);
  const pool = ok.length ? ok : results.filter((r) => r.k >= 2);
  if (!pool.length) return results[0]?.k ?? null;
  return pool.reduce((a, b) => (b.bic < a.bic ? b : a)).k;
}
