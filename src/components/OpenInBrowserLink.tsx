"use client";

import Link from "next/link";
import { useState, type MouseEvent, type ReactNode } from "react";
import { externalBrowserUrl } from "@/lib/inapp";

const STYLE = {
  primary:
    "block w-full rounded-full bg-primary px-6 py-4 text-center text-base font-semibold text-white transition-colors hover:bg-primary-soft",
  text: "inline-block text-[15px] text-ink underline underline-offset-4",
};

/**
 * 카카오톡 같은 앱 안 브라우저에서 누르면 휴대폰 기본 브라우저(Safari·Chrome)로 넘겨 여는 링크.
 * 가입·로그인·홈 화면 추가가 카카오톡 창에 묶이지 않게 (친구 평가를 마친 친구의 '시작하기')
 */
export function OpenInBrowserLink({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: keyof typeof STYLE }) {
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
      <Link href={href} onClick={onClick} className={STYLE[variant]}>
        {children}
      </Link>
      {handedOff && (
        <p className="mt-3 text-center text-[14px] leading-relaxed text-muted">
          기본 브라우저에서 열었어요. 열리지 않으면 화면의 ⋯ 메뉴에서 &apos;다른 브라우저로 열기&apos;를 눌러주세요.
        </p>
      )}
    </>
  );
}
