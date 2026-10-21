import Link from "next/link";
import { METRICS, PERIODS, WEEKDAYS, peakIndex, shares, type Metric, type Trend } from "@/lib/admin/trends";
import { GenderLegend, GroupedBars, Heatmap, StackedDays } from "../charts";
import { AdminShell, AdminTitle, Panel, Stat } from "../ui";

const href = (metric: Metric, days: number) => `/admin/trends?metric=${metric}&days=${days}`;

function Chips<T extends string | number>({
  items,
  current,
  hrefOf,
  label,
}: {
  items: { id: T; label: string }[];
  current: T;
  hrefOf: (id: T) => string;
  label: string;
}) {
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

const hourLabel = (h: number | null) => (h === null ? "–" : `${h}시`);
const dayLabel = (d: number | null) => (d === null ? "–" : `${WEEKDAYS[d]}요일`);

export function TrendsView({ metric, days, trend }: { metric: Metric; days: number; trend: Trend }) {
  const m = METRICS.find((x) => x.id === metric)!;
  const daily = metric === "visit" ? trend.dailyUsers : trend.daily;
  const hours = Array.from({ length: 24 }, (_, h) => String(h));
  const sum = trend.totals.male + trend.totals.female;

  return (
    <AdminShell current="trends">
      <AdminTitle title="추세" lead="성별로 날짜·시간대·요일별 흐름을 봐요. 모든 시각은 한국 시간이에요." />

      <div className="mt-6 space-y-3">
        <Chips label="지표" items={METRICS.map((x) => ({ id: x.id as Metric, label: x.label }))} current={metric} hrefOf={(id) => href(id, days)} />
        <Chips label="기간" items={PERIODS.map((p) => ({ id: p as number, label: `최근 ${p}일` }))} current={days} hrefOf={(d) => href(metric, d)} />
      </div>
      <p className="mt-3 text-sm text-muted">{m.lead}</p>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={`남 · ${m.label}`} value={trend.totals.male} sub={`${trend.users.male}명`} />
        <Stat label={`여 · ${m.label}`} value={trend.totals.female} sub={`${trend.users.female}명`} />
        <Stat label="하루 평균" value={(sum / days).toFixed(1)} sub={trend.totals.unknown ? `성별 미입력 ${trend.totals.unknown}건 제외` : "남·여 합계"} />
        <Stat
          label="가장 많은 때"
          value={<span className="text-[1.25rem]">{hourLabel(peakIndex(trend.hourly.male.map((v, i) => v + trend.hourly.female[i])))}</span>}
          sub={dayLabel(peakIndex(trend.weekday.male.map((v, i) => v + trend.weekday.female[i])))}
        />
      </div>

      <Panel className="mt-4" title={metric === "visit" ? "날짜별 방문 회원 수" : `날짜별 ${m.label}`} lead={metric === "visit" ? "하루에 한 번 이상 들어온 회원 수" : "하루 건수"}>
        <StackedDays days={trend.days} male={daily.male} female={daily.female} label={`최근 ${days}일 날짜별 막대 그래프`} />
        <div className="mt-3">
          <GenderLegend />
        </div>
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="시간대별" lead={`성별 안에서 차지하는 비율이에요. 가장 많은 시간: 남 ${hourLabel(peakIndex(trend.hourly.male))} · 여 ${hourLabel(peakIndex(trend.hourly.female))}`}>
          <GroupedBars
            label="시간대별 비율 막대 그래프"
            labels={hours}
            male={shares(trend.hourly.male)}
            female={shares(trend.hourly.female)}
            counts={trend.hourly}
            labelEvery={3}
          />
          <div className="mt-3">
            <GenderLegend />
          </div>
        </Panel>
        <Panel title="요일별" lead={`성별 안에서 차지하는 비율이에요. 가장 많은 요일: 남 ${dayLabel(peakIndex(trend.weekday.male))} · 여 ${dayLabel(peakIndex(trend.weekday.female))}`}>
          <GroupedBars
            label="요일별 비율 막대 그래프"
            labels={[...WEEKDAYS]}
            male={shares(trend.weekday.male)}
            female={shares(trend.weekday.female)}
            counts={trend.weekday}
          />
          <div className="mt-3">
            <GenderLegend />
          </div>
        </Panel>
      </div>

      <Panel className="mt-4" title="요일 × 시간" lead="진할수록 많아요. 성별마다 가장 많은 칸을 기준으로 진하기를 맞췄어요. 칸에 마우스를 올리면 건수가 보여요.">
        <div className="grid gap-6 lg:grid-cols-2">
          <Heatmap data={trend.heat.male} gender="male" title={`남 (${trend.totals.male}건)`} />
          <Heatmap data={trend.heat.female} gender="female" title={`여 (${trend.totals.female}건)`} />
        </div>
      </Panel>
    </AdminShell>
  );
}
