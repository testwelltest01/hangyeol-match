"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { refreshToday } from "@/app/match/actions";
import { IconTicket } from "@/components/icons";

/**
 * 오늘 탭 아래의 새로고침 쿠폰. 친구 평가 1명당 1장, 하루 한 번, 아직 답하지 않은 사람만 새 사람으로 바꾼다.
 * canUse: 바꿀 수 있는 추천(안 답했고 나에게 먼저 관심을 보내지 않은 사람)이 있는지
 */
export function RefreshCoupon({ balance, usedToday, canUse }: { balance: number; usedToday: boolean; canUse: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function use() {
    if (!window.confirm("쿠폰 1장을 써서 아직 답하지 않은 추천을 새 사람으로 바꿀까요? 바꾼 사람은 한동안 다시 추천되지 않아요.")) return;
    setError(null);
    start(async () => {
      const res = await refreshToday();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(`새로운 ${res.added}명을 골랐어요.`);
      router.refresh();
    });
  }

  const hint = usedToday
    ? "오늘은 새로고침을 썼어요. 저녁 8시 새 추천 뒤에 다시 쓸 수 있어요."
    : balance === 0
      ? "친구가 '친구가 보는 나'를 남길 때마다 1장씩 받아요."
      : canUse
        ? "아직 답하지 않은 추천을 새 사람으로 바꿔요. 하루 한 번 쓸 수 있어요."
        : "지금은 바꿀 추천이 없어요(모두 답했거나, 나에게 먼저 관심을 보낸 사람이에요). 쿠폰은 다음에 쓸 수 있어요.";

  return (
    <section className="rounded-[22px] bg-surface px-5 py-5 ring-1 ring-line/80">
      <div className="flex items-start gap-3.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo/10 text-indigo">
          <IconTicket size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">
            새로고침 쿠폰 <span className="tabular-nums text-indigo">{balance}장</span>
          </p>
          <p className="mt-0.5 text-[14px] leading-relaxed text-muted">{done ?? hint}</p>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-alert">
          {error}
        </p>
      )}
      {!done && balance > 0 && !usedToday && canUse ? (
        <button
          type="button"
          disabled={pending}
          onClick={use}
          className="mt-4 w-full rounded-full border border-primary px-5 py-3 font-semibold text-primary transition active:scale-[0.98] active:opacity-80 disabled:opacity-60"
        >
          {pending ? "새 사람을 찾는 중" : "새 사람 받기 (쿠폰 1장)"}
        </button>
      ) : balance === 0 && !usedToday ? (
        <Link href="/report#friends" className="mt-4 block w-full rounded-full border border-primary px-5 py-3 text-center font-semibold text-primary">
          친구에게 평가 부탁하기
        </Link>
      ) : null}
    </section>
  );
}
