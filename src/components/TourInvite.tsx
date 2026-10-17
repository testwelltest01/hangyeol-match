import Link from "next/link";

/** 가상 매칭 둘러보기(/tour)로 가는 카드. 가입 직후·검사 중·매칭 준비 중처럼 첫 소개까지 길게 느껴지는 화면에 둔다 */
export function TourInvite({ title, body }: { title: string; body: string }) {
  return (
    <Link
      href="/tour"
      className="flex items-center justify-between gap-4 rounded-2xl border border-indigo/25 bg-indigo/5 px-5 py-4 transition-colors hover:border-indigo/50"
    >
      <span className="min-w-0">
        <span className="block font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-sm text-ink-soft">{body}</span>
      </span>
      <span className="shrink-0 text-sm font-semibold text-indigo">둘러보기 →</span>
    </Link>
  );
}
