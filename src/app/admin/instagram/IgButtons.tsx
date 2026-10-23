"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { refreshInstagramToken, subscribeInstagram } from "../actions";

const small = "rounded-full border border-line px-3.5 py-2 text-sm font-semibold text-ink whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50";

/** 웹훅 연결·토큰 갱신 버튼. 결과 문구를 옆에 보여주고 상태를 다시 불러온다 */
export function IgButtons() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState<{ ok: boolean; message: string } | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      setNote(null);
      setNote(await fn());
      router.refresh();
    });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={pending} className={small} onClick={() => run(subscribeInstagram)}>
        웹훅 연결하기
      </button>
      <button type="button" disabled={pending} className={small} onClick={() => run(refreshInstagramToken)}>
        토큰 지금 갱신
      </button>
      {note && <span className={`text-sm ${note.ok ? "text-moss" : "text-alert"}`}>{note.message}</span>}
    </div>
  );
}
