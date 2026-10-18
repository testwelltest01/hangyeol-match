"use client";

import { useState } from "react";
import { signOut } from "@/app/actions";
import { IconExit } from "@/components/icons";
import { disablePush } from "@/lib/push/client";

/** 로그아웃 (내 정보의 계정 목록 한 줄). 이 기기 알림도 함께 끈다 (로그아웃한 기기에 내 알림이 계속 오지 않게) */
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
      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-mist/60 disabled:opacity-60"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mist text-ink">
          <IconExit size={20} />
        </span>
        <span className="text-[15px] text-ink">{pending ? "로그아웃하는 중" : "로그아웃"}</span>
      </button>
    </form>
  );
}
