import Link from "next/link";
import { peakIndex, WEEKDAYS } from "@/lib/admin/trends";
import { fmtKrw, fmtPercent, fmtSeconds, fmtTokens, fmtUsd } from "@/lib/usage/format";
import { PRICE_CHECKED, PRICES, SOURCE_LABEL, type Price } from "@/lib/usage/prices";
import { sumSeries, USAGE_METRICS, USAGE_PERIODS, type UsageMetric, type UsageStats } from "@/lib/usage/stats";
import { isPurpose, PURPOSES, type Purpose } from "@/lib/usage/usage";
import { Heatmap, Legend, StackedSeries } from "../charts";
import { AdminShell, AdminTitle, Chip, Empty, Panel, Stat, TableWrap, td, th } from "../ui";

const href = (metric: UsageMetric, days: number) => `/admin/usage?metric=${metric}&days=${days}`;

/** 용도별 색 (관리자 화면은 성별 테마를 떼서 indigo = 쪽빛) */
const PURPOSE_COLOR: Record<Purpose, string> = {
  photo_feedback: "bg-indigo",
  illustration: "bg-ochre",
  love_report: "bg-moss",
  scene_image: "bg-rose",
};
const purposeLabel = (p: string) => PURPOSES.find((x) => x.id === p)?.label ?? p;

function Chips<T extends string | number>({ items, current, hrefOf, label }: { items: { id: T; label: string }[]; current: T; hrefOf: (id: T) => string; label: string }) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-2">
      {items.map((i) => (
        <Link
          key={String(i.id)}
          href={hrefOf(i.id)}
          aria-current={i.id === current ? "page" : undefined}
          className={`rounded-full px-3.5 py-1.5 text-[13.5px] ${i.id === current ? "bg-ink font-semibold text-white" : "bg-surface text-ink-soft ring-1 ring-line/80 hover:text-ink"}`}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

const priceText = (p: Price) =>
  p.kind === "text"
    ? `입력 $${p.input} · 캐시 $${p.cached} · 출력 $${p.output}`
    : `글 입력 $${p.textInput} · 이미지 입력 $${p.imageInput} · 이미지 출력 $${p.imageOutput}${p.textOutput ? ` · 글 출력 $${p.textOutput}` : ""}`;

const MORE: Record<UsageMetric, string> = { cost: "비용이", calls: "호출이", tokens: "토큰이" };
const dayTick = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8))}`;
const kstTime = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

export function UsageView({
  metric,
  days,
  stats,
  rate,
  missing,
  failures,
}: {
  metric: UsageMetric;
  days: number;
  stats: UsageStats;
  rate: number;
  missing: boolean;
  failures: { at: string; purpose: string; model: string; error: string | null }[];
}) {
  const fmt = metric === "cost" ? fmtUsd : metric === "tokens" ? fmtTokens : (v: number) => `${Math.round(v)}번`;
  const m = USAGE_METRICS.find((x) => x.id === metric)!;
  const t = stats.totals;
  const seriesOf = (part: "daily" | "hourly" | "weekday") =>
    PURPOSES.map((p) => ({ key: p.id, label: p.label, className: PURPOSE_COLOR[p.id], values: stats.series[metric][part][p.id] }));
  const legend = <Legend items={PURPOSES.map((p) => ({ label: p.label, className: PURPOSE_COLOR[p.id] }))} />;
  const peakHour = peakIndex(sumSeries(stats.series[metric].hourly));
  const peakDay = peakIndex(sumSeries(stats.series[metric].weekday));
  const usedKeys = new Set(stats.byModel.map((x) => x.priceKey).filter((k): k is string => Boolean(k)));
  const priceRows = Object.entries(PRICES).sort(([a], [b]) => Number(usedKeys.has(b)) - Number(usedKeys.has(a)));

  return (
    <AdminShell current="usage">
      <AdminTitle
        title="API 사용량"
        lead="OpenAI API를 어디에 얼마나 쓰는지 봐요. 비용은 기록된 토큰 수에 아래 가격표를 곱한 추정이고 세금은 빠져 있어요. 시각은 한국 시간이에요."
      />

      {missing && (
        <div className="mt-5 rounded-[20px] bg-rose/5 px-5 py-4 text-[14.5px] text-ink ring-1 ring-rose/25">
          기록할 표가 아직 없어요. Supabase SQL Editor에서 <code className="font-semibold">0007_api_usage.sql</code>을 실행하면 그때부터 호출마다 기록돼요.
        </div>
      )}

      <div className="mt-6 space-y-3">
        <Chips label="기간" items={USAGE_PERIODS.map((p) => ({ id: p as number, label: `최근 ${p}일` }))} current={days} hrefOf={(d) => href(metric, d)} />
        <Chips label="차트 지표" items={USAGE_METRICS.map((x) => ({ id: x.id as UsageMetric, label: x.label }))} current={metric} hrefOf={(id) => href(id, days)} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={`최근 ${days}일 비용`} value={fmtUsd(t.cost)} sub={`약 ${fmtKrw(t.cost, rate)}`} />
        <Stat label="호출" value={t.calls.toLocaleString("ko-KR")} sub={`실패 ${t.fails}번 (${fmtPercent(t.fails, t.calls)})`} alert={t.calls > 0 && t.fails / t.calls > 0.2} />
        <Stat label="토큰" value={fmtTokens(t.input + t.output)} sub={`입력 ${fmtTokens(t.input)} · 출력 ${fmtTokens(t.output)}`} />
        <Stat label="한 달 예상" value={fmtUsd(stats.monthEstimate)} sub={`최근 7일 평균 × 30 · 약 ${fmtKrw(stats.monthEstimate, rate)}`} />
      </div>
      {t.unpriced > 0 && (
        <p className="mt-3 text-[13.5px] text-alert">가격표에 없는 모델로 부른 호출 {t.unpriced}번은 비용에 빠져 있어요. 아래 모델별 표를 보고 가격표(src/lib/usage/prices.ts)에 더해 주세요.</p>
      )}

      <Panel className="mt-4" title="용도별" lead="1건당 비용은 성공한 기능 1건(연애 보고서는 두 번 부르는 호출을 묶어 1건) 기준이에요.">
        {t.calls === 0 ? (
          <Empty>이 기간에 기록된 호출이 없어요.</Empty>
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <th className={th}>용도</th>
                <th className={`${th} text-right`}>호출</th>
                <th className={`${th} text-right`}>성공 건수</th>
                <th className={`${th} text-right`}>입력 토큰</th>
                <th className={`${th} text-right`}>출력 토큰</th>
                <th className={`${th} text-right`}>비용</th>
                <th className={`${th} text-right`}>1건당</th>
                <th className={`${th} text-right`}>평균 시간</th>
              </tr>
            </thead>
            <tbody>
              {stats.byPurpose.map((p) => (
                <tr key={p.purpose}>
                  <td className={td}>
                    <span className="inline-flex items-center gap-2 font-semibold text-ink">
                      <span className={`inline-block h-2.5 w-2.5 rounded-sm ${PURPOSE_COLOR[p.purpose]}`} />
                      {purposeLabel(p.purpose)}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">{PURPOSES.find((x) => x.id === p.purpose)?.unit}</span>
                  </td>
                  <td className={`${td} text-right tabular-nums`}>
                    {p.calls}
                    {p.fails > 0 && <span className="block text-xs text-alert">실패 {p.fails}</span>}
                  </td>
                  <td className={`${td} text-right tabular-nums`}>{p.units}</td>
                  <td className={`${td} text-right tabular-nums`}>
                    {fmtTokens(p.input)}
                    {p.cached > 0 && <span className="block text-xs text-muted">캐시 {fmtTokens(p.cached)}</span>}
                  </td>
                  <td className={`${td} text-right tabular-nums`}>{fmtTokens(p.output)}</td>
                  <td className={`${td} text-right tabular-nums`}>
                    <span className="font-semibold text-ink">{fmtUsd(p.cost)}</span>
                    <span className="block text-xs text-muted">{fmtKrw(p.cost, rate)}</span>
                  </td>
                  <td className={`${td} text-right tabular-nums`}>
                    {p.perUnit === null ? "–" : fmtUsd(p.perUnit)}
                    {p.perUnit !== null && <span className="block text-xs text-muted">{fmtKrw(p.perUnit, rate)}</span>}
                  </td>
                  <td className={`${td} text-right tabular-nums`}>{fmtSeconds(p.avgMs)}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Panel>

      <Panel className="mt-4" title={`날짜별 ${m.label}`} lead={metric === "cost" ? "하루 비용(USD)을 용도별로 쌓았어요." : metric === "tokens" ? "하루 토큰(입력+출력)을 용도별로 쌓았어요." : "하루 호출 수를 용도별로 쌓았어요."}>
        <StackedSeries labels={stats.days} series={seriesOf("daily")} label={`최근 ${days}일 날짜별 ${m.label}`} format={fmt} tick={dayTick} labelEvery={Math.ceil(days / 8)} />
        <div className="mt-3">{legend}</div>
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title={`시간대별 ${m.label}`} lead={`가장 많은 시간: ${peakHour === null ? "–" : `${peakHour}시`}`}>
          <StackedSeries
            labels={Array.from({ length: 24 }, (_, h) => String(h))}
            series={seriesOf("hourly")}
            label={`시간대별 ${m.label}`}
            format={fmt}
            labelEvery={3}
          />
          <div className="mt-3">{legend}</div>
        </Panel>
        <Panel title={`요일별 ${m.label}`} lead={`가장 많은 요일: ${peakDay === null ? "–" : `${WEEKDAYS[peakDay]}요일`}`}>
          <StackedSeries labels={[...WEEKDAYS]} series={seriesOf("weekday")} label={`요일별 ${m.label}`} format={fmt} />
          <div className="mt-3">{legend}</div>
        </Panel>
      </div>

      <Panel className="mt-4" title="요일 × 시간" lead={`진할수록 ${MORE[metric]} 많아요. 칸에 마우스를 올리면 값이 보여요.`}>
        <Heatmap data={stats.heat[metric]} color="var(--color-indigo)" format={fmt} title={`모든 용도 (${fmt(stats.heat[metric].flat().reduce((a, b) => a + b, 0))})`} />
      </Panel>

      <Panel className="mt-4" title="모델별" lead="응답에 적힌 모델 이름 그대로예요. 가격표 이름이 비어 있으면 비용에서 빠져요.">
        {stats.byModel.length === 0 ? (
          <Empty>이 기간에 기록된 호출이 없어요.</Empty>
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <th className={th}>모델</th>
                <th className={th}>용도</th>
                <th className={`${th} text-right`}>호출</th>
                <th className={`${th} text-right`}>입력</th>
                <th className={`${th} text-right`}>출력</th>
                <th className={`${th} text-right`}>비용</th>
                <th className={th}>가격표</th>
              </tr>
            </thead>
            <tbody>
              {stats.byModel.map((x) => (
                <tr key={x.model}>
                  <td className={`${td} font-mono text-[13px] text-ink`}>{x.model}</td>
                  <td className={`${td} text-ink-soft`}>{x.purposes.map(purposeLabel).join(", ")}</td>
                  <td className={`${td} text-right tabular-nums`}>{x.calls}</td>
                  <td className={`${td} text-right tabular-nums`}>
                    {fmtTokens(x.input)}
                    {x.cached > 0 && <span className="block text-xs text-muted">캐시 {fmtTokens(x.cached)}</span>}
                  </td>
                  <td className={`${td} text-right tabular-nums`}>{fmtTokens(x.output)}</td>
                  <td className={`${td} text-right tabular-nums font-semibold text-ink`}>{x.priceKey ? fmtUsd(x.cost) : "–"}</td>
                  <td className={td}>{x.priceKey ? <span className="text-xs text-muted">{x.priceKey}</span> : <Chip tone="alert">가격표에 없음</Chip>}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Panel>

      {failures.length > 0 && (
        <Panel className="mt-4" title="최근 실패" lead="실패한 호출은 보통 청구되지 않아요. 시간 초과는 OpenAI 쪽에서 끝까지 처리돼 청구될 수도 있어요.">
          <ul className="space-y-2 text-[14px]">
            {failures.map((f, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <span className="tabular-nums text-muted">{kstTime.format(new Date(f.at))}</span>
                <span className="font-semibold text-ink">{isPurpose(f.purpose) ? purposeLabel(f.purpose) : f.purpose}</span>
                <span className="font-mono text-[12.5px] text-ink-soft">{f.model}</span>
                <span className="text-alert">{f.error ?? "이유 없음"}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel
        className="mt-4"
        title="가격표"
        lead={`Standard 처리 기준, 100만 토큰당 USD (${PRICE_CHECKED} 확인). 환율 1달러 = ${rate.toLocaleString("ko-KR")}원 (환경 변수 USD_KRW로 바꿀 수 있어요).`}
      >
        <details className="group">
          <summary className="cursor-pointer text-[14px] font-semibold text-indigo">가격표 펼치기 ({priceRows.length}개 모델)</summary>
          <TableWrap>
            <thead>
              <tr>
                <th className={th}>모델</th>
                <th className={th}>가격 (100만 토큰당)</th>
                <th className={th}>출처</th>
              </tr>
            </thead>
            <tbody>
              {priceRows.map(([key, p]) => (
                <tr key={key}>
                  <td className={`${td} font-mono text-[13px]`}>
                    {key} {usedKeys.has(key) && <Chip tone="moss">쓰는 중</Chip>}
                  </td>
                  <td className={`${td} text-ink-soft`}>{priceText(p)}</td>
                  <td className={`${td} text-xs text-muted`}>{SOURCE_LABEL[p.source]}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </details>
        <p className="mt-3 text-[13px] leading-relaxed text-muted">
          실제 청구 금액은 OpenAI 대시보드의 Usage에서 확인하세요. 이 화면은 0007_api_usage.sql을 실행한 뒤부터의 호출만 세요. 가격이 바뀌면 src/lib/usage/prices.ts를 고치면 지난 기록에도 새
          가격이 적용돼요.{" "}
          <a href="https://developers.openai.com/api/docs/pricing" target="_blank" rel="noopener noreferrer" className="text-indigo underline underline-offset-2">
            OpenAI 가격 페이지
          </a>
        </p>
      </Panel>
    </AdminShell>
  );
}
