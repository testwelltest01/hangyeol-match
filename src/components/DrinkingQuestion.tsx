"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveDrinking } from "@/app/me/actions";
import { DRINKING_OPTIONS } from "@/lib/items";

/** 음주 문항이 생기기 전에 검사를 마친 사람에게 한 번만 묻는 카드 */
export function DrinkingQuestion() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function choose(value: string) {
    setError(null);
    start(async () => {
      const res = await saveDrinking(value);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <section className="mb-6 rounded-2xl border border-indigo/25 bg-indigo/5 px-5 py-4">
      <h2 className="font-semibold">질문이 하나 새로 생겼어요</h2>
      <p className="mt-1 text-[15px] text-ink-soft">
        술은 얼마나 자주 드세요? 원하는 상대 조건에 음주가 추가됐어요. 답하지 않으면 음주 조건을 건 사람에게는 추천되지 않을 수 있어요.
      </p>
      <div className="mt-3 grid gap-2" role="group" aria-label="음주">
        {DRINKING_OPTIONS.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            disabled={pending}
            onClick={() => choose(String(o.value))}
            className="rounded-xl border border-line bg-surface px-4 py-3 text-left text-[15px] hover:border-indigo disabled:opacity-60"
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">상대에게 그대로 보이지 않고, 조건 비교에만 써요.</p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-alert">
          {error}
        </p>
      )}
    </section>
  );
}
