"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PendingChevron } from "@/components/LinkPending";
import { GUEST_LOCAL_KEY } from "@/lib/love/guest-keys";

/** 이 기기에서 전에 가입 없이 검사했으면 '지난번 보고서 다시 보기' (열쇠는 localStorage에만 있다) */
export function GuestResume() {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const read = () => {
      try {
        const t = localStorage.getItem(GUEST_LOCAL_KEY);
        if (t && /^[A-Za-z0-9_-]{32}$/.test(t)) setToken(t);
      } catch {
        // 저장소를 못 쓰면 보여주지 않는다
      }
    };
    read();
  }, []);
  if (!token) return null;
  return (
    <Link
      href={`/love/r/${token}`}
      className="mt-6 flex items-center gap-3 rounded-2xl bg-indigo/5 px-4 py-3.5 text-[15px] text-ink ring-1 ring-indigo/15 hover:bg-indigo/10"
    >
      <span className="flex-1">지난번에 받은 보고서 다시 보기</span>
      <PendingChevron size={18} className="text-muted/70" />
    </Link>
  );
}
