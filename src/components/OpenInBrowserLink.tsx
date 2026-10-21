"use client";

import Link from "next/link";
import { useState, type MouseEvent, type ReactNode } from "react";
import { PendingSpinner } from "@/components/LinkPending";
import { openOutside } from "@/lib/openOutside";

const STYLE = {
  primary:
    "relative block w-full rounded-full bg-primary px-6 py-4 text-center text-base font-semibold text-white transition hover:bg-primary-soft active:scale-[0.98] active:opacity-80",
  secondary:
    "block w-full rounded-full border border-primary px-6 py-3.5 text-center font-semibold text-primary transition-colors hover:bg-primary hover:text-white active:scale-[0.98] active:opacity-80",
  text: "inline-block text-[15px] text-ink underline underline-offset-4",
};

/**
 * 카카오톡 같은 앱 안 브라우저에서 누르면 밖의 브라우저로 넘겨 여는 링크. 가입·로그인·홈 화면 추가가 앱 창에 묶이지 않게 한다.
 * - 아이폰: Safari로 연다(x-safari-https). 홈 화면 추가는 Safari에서 해야 해서 기본 브라우저가 Chrome이어도 Safari로.
 *   앱이 Safari 주소를 막아 화면이 그대로면 잠시 뒤 그 앱의 '기본 브라우저로 열기'(카카오톡·라인)로 넘긴다
 * - 안드로이드: 기본 브라우저로 (카카오톡·라인·intent)
 * safari를 주면 아이폰의 앱 밖 다른 브라우저(Chrome 등)에서도 Safari로 연다 (내 정보 '앱처럼 쓰기').
 * 가입·로그인으로 들어가는 입구(첫 화면 '검사 시작하기'·둘러보기·로그인, 친구 평가를 마친 화면의 '시작하기')에 쓴다.
 * className을 주면 그 모양을 쓰고 안내 문장은 숨긴다(위쪽 바 등)
 */
export function OpenInBrowserLink({
  href,
  children,
  variant = "primary",
  className,
  safari = false,
}: {
  href: string;
  children: ReactNode;
  variant?: keyof typeof STYLE;
  className?: string;
  safari?: boolean;
}) {
  const [handedOff, setHandedOff] = useState(false);

  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    // 보통 브라우저는 그대로 이동, 앱 안 브라우저(·safari면 아이폰의 다른 브라우저)는 밖으로 넘긴다
    if (!openOutside(new URL(href, window.location.origin).toString(), { safari })) return;
    e.preventDefault();
    setHandedOff(true);
  }

  return (
    <>
      <Link href={href} onClick={onClick} className={className ?? STYLE[variant]}>
        {children}
        {!className && variant === "primary" && <PendingSpinner />}
      </Link>
      {handedOff && !className && (
        <p className="mt-3 text-center text-[14px] leading-relaxed text-muted">
          다른 브라우저에서 열었어요. 열리지 않으면 화면의 ⋯ 메뉴에서 &apos;Safari로 열기&apos;나 &apos;다른 브라우저로 열기&apos;를 눌러주세요.
        </p>
      )}
    </>
  );
}
