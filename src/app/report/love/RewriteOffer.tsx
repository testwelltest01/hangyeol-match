"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PrimaryButton } from "@/components/buttons";

type Result = { ok: true } | { ok: false; error: string };

/**
 * 예전 형식으로 쓴 보고서 위 안내: 같은 답으로 새 보고서를 받는다 (검사 횟수에 세지 않는다).
 * 누르면 그 검사 줄을 '쓰는 중'으로 바꾸고 화면을 새로 그린다 (쓰는 동안 지금 보고서는 아래에 그대로).
 * news: 무엇이 달라졌는지 (prompt.ts PROMPT_NEWS, 지시문이 클라이언트 묶음에 들어가지 않게 서버에서 넘긴다)
 */
export function RewriteOffer({ rewrite, news }: { rewrite: () => Promise<Result>; news: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, start] = useTransition();
  return (
    <section className="mb-8 rounded-[22px] bg-indigo/5 px-5 py-5 ring-1 ring-indigo/15">
      <h2 className="text-[15px] font-semibold text-ink">보고서가 새로워졌어요</h2>
      <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">{news}</p>
      <p className="mt-2 text-[13.5px] leading-relaxed text-muted">같은 답으로 새로 써 드려요. 검사 횟수에는 세지 않아요.</p>
      {message && (
        <p role="alert" className="mt-3 whitespace-pre-line break-words text-[14px] text-alert">
          {message}
        </p>
      )}
      <div className="mt-4">
        <PrimaryButton
          disabled={busy}
          onClick={() =>
            start(async () => {
              setMessage(null);
              const res = await rewrite();
              if (!res.ok) setMessage(res.error);
              else window.scrollTo({ top: 0 });
              router.refresh();
            })
          }
        >
          {busy ? "새로 쓰는 중" : "새 보고서 받기"}
        </PrimaryButton>
      </div>
    </section>
  );
}
