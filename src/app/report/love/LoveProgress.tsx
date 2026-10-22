"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { PrimaryButton } from "@/components/buttons";
import { retryLoveReport } from "./actions";

type Result = { ok: true } | { ok: false; error: string };

/**
 * 쓰는 중이면 몇 초마다 새로 확인하고, 실패했으면 '다시 쓰기'를 보여준다.
 * retry: 다시 쓰기 서버 액션 (회원은 기본값, 비회원은 열쇠를 묶은 retryGuestLoveReport). doneWhere: 다 쓰면 어디서 보는지 안내
 */
export function LoveProgress({
  status,
  error,
  retry = retryLoveReport,
  doneWhere = "다 되면 내 결 맨 위에서 볼 수 있어요.",
}: {
  status: "pending" | "failed";
  error: string | null;
  retry?: () => Promise<Result>;
  doneWhere?: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, start] = useTransition();

  // 쓰는 동안 4초마다 확인 (화면을 가리면 쉬었다가 돌아오면 바로 확인)
  useEffect(() => {
    if (status !== "pending") return;
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const t = setInterval(tick, 4000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [status, router]);

  if (status === "pending") {
    return (
      <div className="rounded-[22px] bg-surface px-5 py-8 text-center ring-1 ring-line/80" aria-live="polite">
        <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-2 border-line border-t-indigo" aria-hidden />
        <p className="mt-5 text-[1.1rem] font-semibold text-ink">보고서를 쓰고 있어요</p>
        <p className="mx-auto mt-2 max-w-[30ch] text-[15px] leading-relaxed text-ink-soft">
          1~2분쯤 걸려요. 이 화면을 나가도 계속 쓰니, {doneWhere}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[22px] bg-surface px-5 py-6 ring-1 ring-line/80">
        <p className="text-[1.05rem] font-semibold text-ink">보고서를 다 쓰지 못했어요</p>
        <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{error ?? "잠시 후 다시 시도해주세요."}</p>
        <p className="mt-3 text-[13.5px] text-muted">답은 그대로 남아 있어요. 다시 써도 검사 횟수에 세지 않아요.</p>
      </div>
      {message && (
        <p role="alert" className="whitespace-pre-line break-words text-alert">
          {message}
        </p>
      )}
      <PrimaryButton
        disabled={busy}
        onClick={() =>
          start(async () => {
            setMessage(null);
            const res = await retry();
            if (!res.ok) setMessage(res.error);
            router.refresh();
          })
        }
      >
        {busy ? "다시 쓰는 중" : "다시 쓰기"}
      </PrimaryButton>
    </div>
  );
}
