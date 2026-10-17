// 관리자 차트. 글자가 흐려지지 않게 SVG 대신 HTML 막대로 그린다. 남 = 쪽빛(indigo), 여 = 황토(ochre).
import type { ReactNode } from "react";

export const GENDER_COLOR = { male: "bg-indigo", female: "bg-ochre" } as const;
const GENDER_VAR = { male: "var(--color-indigo)", female: "var(--color-ochre)" } as const;

export function Legend({ items }: { items: { label: string; className: string }[] }) {
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className={`inline-block h-2.5 w-2.5 rounded-sm ${i.className}`} />
          {i.label}
        </span>
      ))}
    </p>
  );
}

export const GenderLegend = () => (
  <Legend
    items={[
      { label: "남", className: GENDER_COLOR.male },
      { label: "여", className: GENDER_COLOR.female },
    ]}
  />
);

function Frame({ max, unit, children, label }: { max: number; unit: string; children: ReactNode; label: string }) {
  return (
    <div className="relative" role="img" aria-label={label}>
      <span className="absolute left-0 top-0 text-[11px] tabular-nums text-muted">
        {Number.isInteger(max) ? max : max.toFixed(1)}
        {unit}
      </span>
      <div className="flex h-40 items-end gap-[2px] border-b border-line pt-5">{children}</div>
    </div>
  );
}

/** 날짜별 막대 (남 아래, 여 위로 쌓기) */
export function StackedDays({ days, male, female, label }: { days: string[]; male: number[]; female: number[]; label: string }) {
  const max = Math.max(1, ...days.map((_, i) => male[i] + female[i]));
  const every = Math.ceil(days.length / 8);
  return (
    <div>
      <Frame max={max} unit="" label={label}>
        {days.map((d, i) => (
          <div key={d} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${d} · 남 ${male[i]} · 여 ${female[i]}`}>
            <span className={`block w-full rounded-t-sm ${GENDER_COLOR.female}`} style={{ height: `${(female[i] / max) * 100}%` }} />
            <span className={`block w-full ${GENDER_COLOR.male}`} style={{ height: `${(male[i] / max) * 100}%` }} />
          </div>
        ))}
      </Frame>
      <div className="mt-1 flex gap-[2px]">
        {days.map((d, i) => (
          <span key={d} className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-[10px] tabular-nums text-muted">
            {i % every === 0 ? `${Number(d.slice(5, 7))}/${Number(d.slice(8))}` : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

/** 칸마다 남·여 막대 두 개. values는 비율(%)이고 counts는 툴팁에 쓴다 */
export function GroupedBars({
  labels,
  male,
  female,
  counts,
  labelEvery = 1,
  label,
}: {
  labels: string[];
  male: number[];
  female: number[];
  counts: { male: number[]; female: number[] };
  labelEvery?: number;
  label: string;
}) {
  const max = Math.max(1, ...male, ...female);
  return (
    <div>
      <Frame max={max} unit="%" label={label}>
        {labels.map((l, i) => (
          <div
            key={l}
            className="flex h-full min-w-0 flex-1 items-end justify-center gap-[1px]"
            title={`${l} · 남 ${counts.male[i]}건 (${male[i].toFixed(0)}%) · 여 ${counts.female[i]}건 (${female[i].toFixed(0)}%)`}
          >
            <span className={`block w-1/2 max-w-4 rounded-t-sm ${GENDER_COLOR.male}`} style={{ height: `${(male[i] / max) * 100}%` }} />
            <span className={`block w-1/2 max-w-4 rounded-t-sm ${GENDER_COLOR.female}`} style={{ height: `${(female[i] / max) * 100}%` }} />
          </div>
        ))}
      </Frame>
      <div className="mt-1 flex gap-[2px]">
        {labels.map((l, i) => (
          <span key={l} className="min-w-0 flex-1 text-center text-[10px] tabular-nums text-muted">
            {i % labelEvery === 0 ? l : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

/** 요일 × 시간 칸. 진할수록 많다 (성별마다 따로 맞춘다) */
export function Heatmap({ data, gender, title }: { data: number[][]; gender: "male" | "female"; title: string }) {
  const max = Math.max(1, ...data.flat());
  const days = ["월", "화", "수", "목", "금", "토", "일"];
  return (
    <figure>
      <figcaption className="mb-2 text-sm font-semibold">{title}</figcaption>
      <div className="grid grid-cols-[1.5rem_repeat(24,minmax(0,1fr))] gap-[2px]" role="img" aria-label={`${title} 요일과 시간대별 기록 칸`}>
        {data.map((row, d) => (
          <div key={d} className="contents">
            <span className="text-[10px] leading-4 text-muted">{days[d]}</span>
            {row.map((v, h) => (
              <span
                key={h}
                className="block h-4 rounded-[2px]"
                title={`${days[d]} ${h}시 · ${v}건`}
                style={{ background: v ? `color-mix(in srgb, ${GENDER_VAR[gender]} ${15 + (v / max) * 85}%, var(--color-surface))` : "var(--color-mist)" }}
              />
            ))}
          </div>
        ))}
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="text-center text-[9px] tabular-nums text-muted">
            {h % 6 === 0 ? h : ""}
          </span>
        ))}
      </div>
    </figure>
  );
}
