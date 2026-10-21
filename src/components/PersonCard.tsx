import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/app-ui";
import { LikedBadge } from "@/components/LikedBadge";
import type { PersonCard as Card } from "@/lib/match/dashboard";
import { regionLabel } from "@/lib/regions";
import { ZoomImage } from "@/components/ZoomImage";

export function personLine(c: { birthYear: number; region: string; height: number }) {
  return `${String(c.birthYear).slice(2)}년생 · ${regionLabel(c.region)} · ${c.height}cm`;
}

/** 추천 이유 아래에 붙이는 '다를 수 있는 부분' 한 줄 (추천 카드·예시 카드가 같이 쓴다) */
export function TalkingPoint({ text }: { text: string }) {
  return (
    <p className="mt-2 flex gap-2 px-1 text-[14px] leading-relaxed text-ink-soft">
      <span aria-hidden className="mt-[3px] shrink-0 text-[11px] text-indigo">
        ◆
      </span>
      {text}
    </p>
  );
}

/**
 * 추천 카드. 한결은 사진보다 결을 먼저 보여준다: 이름 → 왜 추천했는지 → 어디서 다를 수 있는지 → 성향 → 자기소개.
 * 그림 프로필은 이름 옆 작은 그림(누르면 크게)으로 둔다. 실제 사진은 서로 관심을 보낸 뒤에만
 */
export function PersonCardView({
  card,
  actions,
  detailLabel = "자세히",
  detailButton = false,
}: {
  card: Card;
  actions?: ReactNode;
  detailLabel?: string;
  /** 자세히 보기를 글자 링크 대신 버튼 모양으로 (다음에 할 일이 그 화면에 있을 때) */
  detailButton?: boolean;
}) {
  return (
    <article className="overflow-hidden rounded-[22px] bg-surface ring-1 ring-line/80">
      <div className="px-5 pb-5 pt-5">
        <div className="flex items-center gap-3.5">
          {card.illustrationUrl ? (
            <div className="h-[76px] w-[76px] shrink-0 overflow-hidden rounded-2xl bg-mist">
              <ZoomImage src={card.illustrationUrl} alt={`${card.nickname}님의 그림 프로필`} className="h-full w-full object-cover object-top" />
            </div>
          ) : (
            <Avatar name={card.nickname} size={48} src={card.faceUrl} />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="font-serif text-xl font-bold leading-tight">{card.nickname}</h3>
              {card.likedMe && card.stage === "new" && <LikedBadge />}
            </div>
            <p className="mt-0.5 text-[13px] text-muted">{personLine(card)}</p>
          </div>
        </div>

        <p className="mt-4 rounded-2xl bg-paper px-4 py-3 font-serif text-[15.5px] leading-relaxed text-ink">{card.reason}</p>
        {card.talkingPoint && <TalkingPoint text={card.talkingPoint} />}

        {card.chips.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="성향">
            {card.chips.map((c) => (
              <li key={c} className="rounded-full bg-mist px-3 py-1 text-[13px] text-ink-soft">
                {c}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 line-clamp-3 whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{card.intro}</p>
      </div>
      <div className="flex items-center gap-3 border-t border-line/70 px-5 py-3.5">
        <div className="flex-1">{actions}</div>
        <Link
          href={`/people/${card.id}`}
          className={
            detailButton
              ? "shrink-0 rounded-full bg-primary active:scale-[0.98] active:opacity-80 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-soft"
              : "shrink-0 text-sm text-muted underline underline-offset-4"
          }
        >
          {detailLabel}
        </Link>
      </div>
    </article>
  );
}
