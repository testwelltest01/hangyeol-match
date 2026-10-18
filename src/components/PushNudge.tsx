"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { currentSubscription, enablePush, isStandalone, pushSupport } from "@/lib/push/client";

const DISMISS_KEY = "hangyeol:push-nudge-dismissed";

type Mode = "hidden" | "enable" | "ios";

/** 알림 권유를 보여줄지: 알림을 켤 수 있는데 아직 안 켰고 닫은 적이 없을 때 (아이폰 브라우저면 설치 안내) */
async function decide(): Promise<Mode> {
  try {
    if (localStorage.getItem(DISMISS_KEY) === "1") return "hidden";
  } catch {
    return "hidden";
  }
  const support = pushSupport();
  if (support === "ios-install" && !isStandalone()) return "ios";
  if (support !== "ok" || Notification.permission !== "default") return "hidden";
  const sub = await currentSubscription().catch(() => null);
  return sub ? "hidden" : "enable";
}

/** 추천 화면 위쪽의 작은 알림 권유 */
export function PushNudge() {
  const [mode, setMode] = useState<Mode>("hidden");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    decide().then((m) => {
      if (alive) setMode(m);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (mode === "hidden") return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // 괜찮다
    }
    setMode("hidden");
  }

  async function turnOn() {
    setBusy(true);
    setError(null);
    const res = await enablePush();
    setBusy(false);
    if (res.ok) setMode("hidden");
    else setError(res.error);
  }

  return (
    <div className="mb-6 rounded-2xl border border-indigo/25 bg-indigo/5 px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[15px] text-ink">
          {mode === "ios" ? "홈 화면에 추가하면 서로 관심이나 새 메시지를 알림으로 받을 수 있어요." : "서로 관심이나 새 메시지가 오면 알려드릴까요?"}
        </p>
        <button type="button" onClick={dismiss} aria-label="닫기" className="-mr-1 -mt-0.5 shrink-0 px-1 text-lg leading-none text-muted hover:text-ink">
          ×
        </button>
      </div>
      <div className="mt-2.5">
        {mode === "ios" ? (
          <Link href="/me#app" className="text-sm font-semibold text-indigo underline underline-offset-4">
            추가하는 방법 보기
          </Link>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={turnOn}
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white disabled:bg-line disabled:text-muted"
          >
            {busy ? "켜는 중" : "알림 켜기"}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-alert">
          {error}
        </p>
      )}
    </div>
  );
}
