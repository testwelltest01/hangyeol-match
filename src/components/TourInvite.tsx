import Link from "next/link";
import { IconChevron, IconPlay } from "@/components/icons";

/** 가상 매칭 둘러보기(/tour)로 가는 카드. 가입 직후·검사 중·매칭 준비 중처럼 첫 소개까지 길게 느껴지는 화면에 둔다 */
export function TourInvite({ title, body }: { title: string; body: string }) {
  return (
    <Link
      href="/tour"
      className="flex items-center gap-3.5 rounded-2xl bg-indigo/5 px-4 py-4 ring-1 ring-indigo/15 transition-colors hover:bg-indigo/10"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-indigo">
        <IconPlay size={22} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-[13.5px] leading-snug text-ink-soft">{body}</span>
      </span>
      <IconChevron size={18} className="-mr-1 shrink-0 text-indigo" />
    </Link>
  );
}
