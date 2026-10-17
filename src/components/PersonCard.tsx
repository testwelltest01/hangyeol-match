import Link from "next/link";
import type { ReactNode } from "react";
import { LikedBadge } from "@/components/LikedBadge";
import type { PersonCard as Card } from "@/lib/match/dashboard";
import { regionLabel } from "@/lib/regions";

export function personLine(c: { birthYear: number; region: string; height: number }) {
  return `${String(c.birthYear).slice(2)}년생 · ${regionLabel(c.region)} · ${c.height}cm`;
}

/** 추천 카드: 실제 사진 없이 검사 요약, 자기소개, 추천 이유와 (회원이 고른 경우) AI 그림 프로필을 보여준다 */
export function PersonCardView({
  card,
  actions,
  detailLabel = "자세히",
}: {
  card: Card;
  actions?: ReactNode;
  detailLabel?: string;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-surface">
      {card.illustrationUrl && (
        <div className="relative aspect-[4/3] bg-mist">
          {/* 10분짜리 서명 주소라 next/image 최적화 대신 그대로 보여준다 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.illustrationUrl} alt={`${card.nickname}님의 그림 프로필`} className="h-full w-full object-cover object-top" />
          <span className="absolute left-3 top-3 rounded-full bg-paper/90 px-2.5 py-1 text-xs font-semibold text-ink-soft">AI 그림</span>
        </div>
      )}
      <div className="px-5 py-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-serif text-xl font-bold">{card.nickname}</h3>
          {card.likedMe && card.stage === "new" && <LikedBadge />}
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
            {detailLabel}
          </Link>
        </div>
      </div>
    </article>
  );
}
