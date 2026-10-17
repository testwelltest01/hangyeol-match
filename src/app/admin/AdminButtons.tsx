"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { resolveReport, setSuspended } from "./actions";

function useAction() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: true } | { ok: false; error: string }>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.error);
      router.refresh();
    });
  return { error, pending, run };
}

const small =
  "rounded-full border px-3 py-1.5 text-sm font-semibold whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50";

export function SuspendButton({ userId, suspended, name }: { userId: string; suspended: boolean; name: string }) {
  const { error, pending, run } = useAction();
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        className={`${small} ${suspended ? "border-ink text-ink" : "border-alert/40 text-alert"}`}
        onClick={() => {
          const ask = suspended ? `${name}님의 이용 정지를 풀까요?` : `${name}님을 이용 정지할까요? 추천에서 빠지고 관심·수락을 할 수 없어요.`;
          if (window.confirm(ask)) run(() => setSuspended(userId, !suspended));
        }}
      >
        {suspended ? "정지 해제" : "이용 정지"}
      </button>
      {error && <span className="text-xs text-alert">{error}</span>}
    </span>
  );
}

export function ResolveButton({ reportId }: { reportId: number }) {
  const { error, pending, run } = useAction();
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" disabled={pending} className={`${small} border-line text-ink-soft`} onClick={() => run(() => resolveReport(reportId))}>
        확인 완료
      </button>
      {error && <span className="text-xs text-alert">{error}</span>}
    </span>
  );
}
