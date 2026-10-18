"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { react } from "@/app/match/actions";
import { IconHeart } from "@/components/icons";

/** 관심 있어요/넘기기, 수락/넘기기 버튼 */
export function ReactButtons({ targetId, mode }: { targetId: string; mode: "interest" | "accept" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send(kind: "interest" | "pass" | "accept" | "decline") {
    if (kind === "decline" && !window.confirm("넘기면 다시 볼 수 없어요. 넘길까요?")) return;
    setError(null);
    startTransition(async () => {
      const res = await react(targetId, kind);
      if (!res.ok) setError(res.error);
      router.refresh();
    });
  }

  const yes = mode === "interest" ? "interest" : "accept";
  const no = mode === "interest" ? "pass" : "decline";
  return (
    <div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => send(yes)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-ink px-4 py-3 font-semibold text-white disabled:bg-line disabled:text-muted"
        >
          {mode === "interest" && <IconHeart size={18} strong />}
          {mode === "interest" ? "관심 있어요" : "수락하기"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => send(no)}
          className="rounded-full border border-line px-4 py-3 text-ink-soft disabled:opacity-60"
        >
          {mode === "interest" ? "넘기기" : "이번엔 넘길게요"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-alert">
          {error}
        </p>
      )}
    </div>
  );
}
