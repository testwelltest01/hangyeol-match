import Link from "next/link";
import { IconDoc } from "@/components/icons";
import { PendingChevron } from "@/components/LinkPending";

export type LoveEntryState = { status: "none" | "pending" | "failed" | "done"; headline: string | null };

const TEXT: Record<LoveEntryState["status"], { title: string; sub: string }> = {
  none: { title: "연애 상황 보고서 받기", sub: "다툴 때, 연락이 뜸할 때, 화해할 때의 나를 10가지 장면으로 풀어 드려요. 48문항에 답하면 AI가 써요." },
  pending: { title: "연애 상황 보고서를 쓰고 있어요", sub: "1~2분쯤 걸려요. 눌러서 확인해 보세요." },
  failed: { title: "연애 상황 보고서를 다 쓰지 못했어요", sub: "답은 그대로 있어요. 눌러서 다시 써 보세요." },
  done: { title: "내 연애 상황 보고서", sub: "10가지 장면에서 나는 어떤지 다시 볼 수 있어요." },
};

/** 내 결 맨 위: 연애 상황 보고서 입구 (상태에 따라 문구만 바뀐다) */
export function LoveEntry({ state }: { state: LoveEntryState }) {
  const t = TEXT[state.status];
  return (
    <Link
      href="/report/love"
      className="relative mt-6 flex items-center gap-4 overflow-hidden rounded-[22px] bg-surface px-5 py-5 ring-1 ring-indigo/25 transition-colors hover:bg-mist/50"
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-strand-a to-strand-b" />
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo/10 text-indigo">
        <IconDoc size={22} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15.5px] font-semibold text-ink">{t.title}</span>
        {state.status === "done" && state.headline ? (
          <span className="mt-1 block font-serif text-[15px] leading-snug text-ink-soft">{state.headline}</span>
        ) : (
          <span className="mt-1 block text-[13.5px] leading-snug text-muted">{t.sub}</span>
        )}
      </span>
      <PendingChevron size={18} className="text-muted/70" />
    </Link>
  );
}
