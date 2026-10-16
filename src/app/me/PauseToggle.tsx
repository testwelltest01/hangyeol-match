"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setPaused } from "./actions";

export function PauseToggle({ initial }: { initial: boolean }) {
  const router = useRouter();
  const [paused, setPausedState] = useState(initial);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !paused;
    startTransition(async () => {
      const res = await setPaused(next);
      if (res.ok) {
        setPausedState(next);
        router.refresh();
      }
    });
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={paused}
      onClick={toggle}
      disabled={pending}
      className="flex w-full items-center justify-between rounded-xl border border-line bg-surface px-4 py-3.5 disabled:opacity-60"
    >
      <span>{paused ? "매칭을 쉬는 중이에요" : "매칭 중이에요"}</span>
      <span aria-hidden className={`relative h-7 w-12 rounded-full transition-colors ${paused ? "bg-line" : "bg-indigo"}`}>
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${paused ? "left-1" : "left-6"}`}
        />
      </span>
    </button>
  );
}
