"use client";

import Link from "next/link";
import { useState, type MouseEvent, type ReactNode } from "react";
import { PendingSpinner } from "@/components/LinkPending";
import { externalBrowserUrl } from "@/lib/inapp";

const STYLE = {
  primary:
    "relative block w-full rounded-full bg-primary px-6 py-4 text-center text-base font-semibold text-white transition hover:bg-primary-soft active:scale-[0.98] active:opacity-80",
  text: "inline-block text-[15px] text-ink underline underline-offset-4",
};

/**
 * 카카오톡 같은 앱 안 브라우저에서 누르면 휴대폰 기본 브라우저(Safari·Chrome)로 넘겨 여는 링크.
 * 가입·로그인·홈 화면 추가가 카카오톡 창에 묶이지 않게 한다. 가입·로그인으로 들어가는 모든 입구에 쓴다
 * (첫 화면 '검사 시작하기'·둘러보기·로그인, 친구 평가를 마친 화면의 '시작하기'). className을 주면 그 모양을 쓰고 안내 문장은 숨긴다(위쪽 바 등)
 */
export function OpenInBrowserLink({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: keyof typeof STYLE;
  className?: string;
}) {
  const [handedOff, setHandedOff] = useState(false);

  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    const target = externalBrowserUrl(navigator.userAgent, new URL(href, window.location.origin).toString());
    if (!target) return; // 보통 브라우저는 그대로 이동
    e.preventDefault();
    setHandedOff(true);
    window.location.href = target;
  }

  return (
    <>
      <Link href={href} onClick={onClick} className={className ?? STYLE[variant]}>
        {children}
        {!className && variant === "primary" && <PendingSpinner />}
      </Link>
      {handedOff && !className && (
        <p className="mt-3 text-center text-[14px] leading-relaxed text-muted">
          기본 브라우저에서 열었어요. 열리지 않으면 화면의 ⋯ 메뉴에서 &apos;다른 브라우저로 열기&apos;를 눌러주세요.
        </p>
      )}
    </>
  );
}
