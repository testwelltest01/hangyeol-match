"use client";

import { useState } from "react";
import { signOut } from "@/app/actions";
import { disablePush } from "@/lib/push/client";

/** 로그아웃. 이 기기 알림도 함께 끈다 (로그아웃한 기기에 내 알림이 계속 오지 않게) */
export function SignOutButton() {
  const [pending, setPending] = useState(false);
  return (
    <form
      action={async () => {
        setPending(true);
        // 알림 끄기가 늦어져도 로그아웃은 2초 안에 진행한다
        await Promise.race([disablePush().catch(() => null), new Promise((r) => setTimeout(r, 2000))]);
        await signOut();
      }}
    >
      <button type="submit" disabled={pending} className="text-ink underline underline-offset-4 disabled:opacity-60">
        {pending ? "로그아웃하는 중" : "로그아웃"}
      </button>
    </form>
  );
}
