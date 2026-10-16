import type { DomainReport, TraitReport } from "@/lib/report";
import { toPercent } from "@/lib/report";

/** 양극 응답 하나를 6칸 결 위의 점으로 보여준다. 고른 쪽 이름을 진하게 쓴다. */
export function ValueTrack({ item }: { item: DomainReport["items"][number] }) {
  const leftChosen = item.lean.endsWith("left");
  const pos = ((item.value - 1) / 5) * 100;
  return (
    <div>
      <div className="flex justify-between gap-4 text-[15px]">
        <span className={leftChosen ? "font-semibold text-ink" : "text-muted"}>{item.left}</span>
        <span className={`text-right ${leftChosen ? "text-muted" : "font-semibold text-ink"}`}>{item.right}</span>
      </div>
      <div className="relative mx-2 mt-2 h-4" aria-hidden>
        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className="absolute top-1/2 h-1.5 w-px -translate-y-1/2 bg-line"
            style={{ left: `${(i / 5) * 100}%` }}
          />
        ))}
        <span
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo"
          style={{ left: `${pos}%` }}
        />
      </div>
      <p className="sr-only">
        {item.left}와 {item.right} 중 {item.chosen} 쪽, 6점 중 {item.value}점
      </p>
    </div>
  );
}

const LEVEL_LABEL = { high: "높은 편", mid: "중간", low: "낮은 편" } as const;

/** 성격 특성 막대. 친구 평균이 있으면 이끼색 점을 함께 찍는다. */
export function TraitBar({ trait, friendScore }: { trait: TraitReport; friendScore?: number }) {
  const self = toPercent(trait.score);
  const friend = friendScore !== undefined && !Number.isNaN(friendScore) ? toPercent(friendScore) : null;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="font-semibold">{trait.label}</span>
        <span className="text-sm text-muted">{LEVEL_LABEL[trait.level]}</span>
      </div>
      <div className="relative mx-2 mt-2 h-4" aria-hidden>
        <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-line" />
        <span
          className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-indigo/70"
          style={{ width: `${self}%` }}
        />
        <span
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo"
          style={{ left: `${self}%` }}
        />
        {friend !== null && (
          <span
            className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-moss"
            style={{ left: `${friend}%` }}
          />
        )}
      </div>
      <p className="sr-only">
        내 점수 100점 중 {self}점{friend !== null ? `, 친구들이 본 점수 ${friend}점` : ""}
      </p>
      <p className="mt-2 text-ink-soft">{trait.text}</p>
    </div>
  );
}
