import Link from "next/link";
import type { ReactNode } from "react";
import type { PersonCard as Card } from "@/lib/match/dashboard";
import { regionLabel } from "@/lib/regions";

export function personLine(c: { birthYear: number; region: string; height: number }) {
  return `${String(c.birthYear).slice(2)}년생 · ${regionLabel(c.region)} · ${c.height}cm`;
}

/** 추천 카드: 사진 없이 검사 요약, 자기소개, 추천 이유만 보여준다 */
export function PersonCardView({ card, actions }: { card: Card; actions?: ReactNode }) {
  return (
    <article className="rounded-2xl border border-line bg-surface px-5 py-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-serif text-xl font-bold">{card.nickname}</h3>
        {card.likedMe && card.stage === "new" && (
          <span className="shrink-0 rounded-full bg-moss/10 px-2.5 py-1 text-xs font-semibold text-moss">먼저 관심을 보냈어요</span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">{personLine(card)}</p>

      <p className="mt-4 border-l-2 border-indigo pl-3 font-serif leading-relaxed">{card.reason}</p>

      {card.chips.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="성향">
          {card.chips.map((c) => (
            <li key={c} className="rounded-full bg-mist px-3 py-1 text-sm text-ink-soft">
              {c}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 line-clamp-4 whitespace-pre-line text-[15px] text-ink-soft">{card.intro}</p>

      <div className="mt-5 flex items-center gap-3">
        <div className="flex-1">{actions}</div>
        <Link href={`/people/${card.id}`} className="shrink-0 text-sm text-muted underline underline-offset-4">
          자세히
        </Link>
      </div>
    </article>
  );
}
