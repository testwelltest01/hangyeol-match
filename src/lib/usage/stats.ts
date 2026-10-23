// 관리자 'API 사용량' 계산: 용도별·모델별 합계, 날짜·시간대·요일별 추세(비용·호출 수·토큰). 순수 함수(테스트용).
import { kstParts } from "@/lib/admin/trends";
import { daysBefore, kstDay } from "@/lib/day";
import { priceKey } from "@/lib/usage/prices";
import { costOf, isPurpose, PURPOSES, type Purpose, type Usage } from "@/lib/usage/usage";

/** api_usage 한 줄 (DB 0007_api_usage.sql) */
export type UsageRow = {
  at: string;
  purpose: string;
  endpoint: string;
  model: string;
  ok: boolean;
  unit: boolean;
  input_tokens: number | null;
  cached_tokens: number | null;
  output_tokens: number | null;
  input_text_tokens: number | null;
  input_image_tokens: number | null;
  output_image_tokens: number | null;
  reasoning_tokens: number | null;
  duration_ms: number | null;
};

export const USAGE_METRICS = [
  { id: "cost", label: "비용" },
  { id: "calls", label: "호출 수" },
  { id: "tokens", label: "토큰" },
] as const;
export type UsageMetric = (typeof USAGE_METRICS)[number]["id"];

export const USAGE_PERIODS = [7, 30, 90] as const;

type PerPurpose<T> = Record<Purpose, T>;
const perPurpose = <T>(make: () => T): PerPurpose<T> => Object.fromEntries(PURPOSES.map((p) => [p.id, make()])) as PerPurpose<T>;

export type PurposeSummary = {
  purpose: Purpose;
  calls: number;
  fails: number;
  /** 기능 1건으로 센 성공 호출 (연애 보고서는 두 번 중 첫 번째만) */
  units: number;
  input: number;
  cached: number;
  output: number;
  cost: number;
  /** 가격표에 없는 모델로 부른 호출 (비용에서 빠짐) */
  unpriced: number;
  avgMs: number | null;
  perUnit: number | null;
};

export type ModelSummary = {
  model: string;
  priceKey: string | null;
  purposes: Purpose[];
  calls: number;
  input: number;
  cached: number;
  output: number;
  cost: number;
};

type Series = { daily: PerPurpose<number[]>; hourly: PerPurpose<number[]>; weekday: PerPurpose<number[]> };

export type UsageStats = {
  days: string[];
  totals: { calls: number; fails: number; input: number; cached: number; output: number; cost: number; unpriced: number };
  byPurpose: PurposeSummary[];
  byModel: ModelSummary[];
  series: Record<UsageMetric, Series>;
  /** [요일 0=월][시] */
  heat: Record<UsageMetric, number[][]>;
  /** 최근 7일(오늘 포함) 비용 */
  last7Cost: number;
  /** 최근 7일 하루 평균 × 30 */
  monthEstimate: number;
};

export function rowUsage(r: UsageRow): Usage | null {
  if (r.input_tokens === null || r.output_tokens === null) return null;
  return {
    inputTokens: r.input_tokens,
    cachedTokens: r.cached_tokens ?? 0,
    outputTokens: r.output_tokens,
    inputTextTokens: r.input_text_tokens,
    inputImageTokens: r.input_image_tokens,
    outputImageTokens: r.output_image_tokens,
    reasoningTokens: r.reasoning_tokens,
  };
}

/** 최근 days일(한국 날짜, 오늘 포함) 안의 기록만 센다 */
export function buildUsage(rows: UsageRow[], days: number, today: string = kstDay()): UsageStats {
  const dayList = Array.from({ length: days }, (_, i) => daysBefore(today, days - 1 - i));
  const dayIndex = new Map(dayList.map((d, i) => [d, i]));
  const recent7 = new Set(dayList.slice(-7));
  const makeSeries = (): Series => ({
    daily: perPurpose(() => Array(days).fill(0)),
    hourly: perPurpose(() => Array(24).fill(0)),
    weekday: perPurpose(() => Array(7).fill(0)),
  });
  const series: Record<UsageMetric, Series> = { cost: makeSeries(), calls: makeSeries(), tokens: makeSeries() };
  const makeHeat = () => Array.from({ length: 7 }, () => Array(24).fill(0) as number[]);
  const heat: Record<UsageMetric, number[][]> = { cost: makeHeat(), calls: makeHeat(), tokens: makeHeat() };

  const purposeAcc = perPurpose(() => ({ calls: 0, fails: 0, units: 0, input: 0, cached: 0, output: 0, cost: 0, unpriced: 0, ms: 0, msN: 0 }));
  const models = new Map<string, ModelSummary & { purposeSet: Set<Purpose> }>();
  const totals = { calls: 0, fails: 0, input: 0, cached: 0, output: 0, cost: 0, unpriced: 0 };
  let last7Cost = 0;

  for (const r of rows) {
    if (!isPurpose(r.purpose)) continue;
    const p = kstParts(r.at);
    const di = dayIndex.get(p.day);
    if (di === undefined) continue;
    const usage = rowUsage(r);
    const cost = usage ? costOf(r.model, usage) : null;
    const tokens = usage ? usage.inputTokens + usage.outputTokens : 0;
    const add: Record<UsageMetric, number> = { cost: cost ?? 0, calls: 1, tokens };
    for (const m of USAGE_METRICS) {
      const s = series[m.id];
      s.daily[r.purpose][di] += add[m.id];
      s.hourly[r.purpose][p.hour] += add[m.id];
      s.weekday[r.purpose][p.weekday] += add[m.id];
      heat[m.id][p.weekday][p.hour] += add[m.id];
    }

    const a = purposeAcc[r.purpose];
    a.calls += 1;
    if (!r.ok) a.fails += 1;
    if (r.ok && r.unit) a.units += 1;
    if (usage) {
      a.input += usage.inputTokens;
      a.cached += usage.cachedTokens;
      a.output += usage.outputTokens;
      if (cost === null) a.unpriced += 1;
    }
    a.cost += cost ?? 0;
    if (r.ok && r.duration_ms !== null) {
      a.ms += r.duration_ms;
      a.msN += 1;
    }

    const m = models.get(r.model) ?? {
      model: r.model,
      priceKey: priceKey(r.model),
      purposes: [],
      purposeSet: new Set<Purpose>(),
      calls: 0,
      input: 0,
      cached: 0,
      output: 0,
      cost: 0,
    };
    m.purposeSet.add(r.purpose);
    m.calls += 1;
    if (usage) {
      m.input += usage.inputTokens;
      m.cached += usage.cachedTokens;
      m.output += usage.outputTokens;
    }
    m.cost += cost ?? 0;
    models.set(r.model, m);

    totals.calls += 1;
    if (!r.ok) totals.fails += 1;
    if (usage) {
      totals.input += usage.inputTokens;
      totals.cached += usage.cachedTokens;
      totals.output += usage.outputTokens;
      if (cost === null) totals.unpriced += 1;
    }
    totals.cost += cost ?? 0;
    if (recent7.has(p.day)) last7Cost += cost ?? 0;
  }

  const byPurpose: PurposeSummary[] = PURPOSES.map(({ id }) => {
    const a = purposeAcc[id];
    return {
      purpose: id,
      calls: a.calls,
      fails: a.fails,
      units: a.units,
      input: a.input,
      cached: a.cached,
      output: a.output,
      cost: a.cost,
      unpriced: a.unpriced,
      avgMs: a.msN ? a.ms / a.msN : null,
      perUnit: a.units ? a.cost / a.units : null,
    };
  });
  const byModel = [...models.values()]
    .map(({ purposeSet, ...m }) => ({ ...m, purposes: PURPOSES.map((p) => p.id).filter((id) => purposeSet.has(id)) }))
    .sort((x, y) => y.cost - x.cost || y.calls - x.calls);

  const recentDays = Math.min(7, days);
  return { days: dayList, totals, byPurpose, byModel, series, heat, last7Cost, monthEstimate: (last7Cost / recentDays) * 30 };
}

/** 여러 용도를 더한 값 (차트 위 숫자·가장 많은 때) */
export const sumSeries = (s: PerPurpose<number[]>): number[] => {
  const first = s[PURPOSES[0].id];
  return first.map((_, i) => PURPOSES.reduce((acc, p) => acc + s[p.id][i], 0));
};
