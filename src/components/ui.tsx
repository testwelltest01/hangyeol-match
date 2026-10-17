import Link from "next/link";
import type { ReactNode } from "react";

export const fieldClass =
  "mt-2 w-full rounded-xl border border-line bg-surface px-4 py-3.5 text-base text-ink placeholder:text-muted focus:border-indigo focus:outline-none disabled:bg-mist disabled:text-muted";

export type NavId = "match" | "report" | "me" | "letter";

const navLinkClass = (active: boolean) => (active ? "font-semibold text-ink" : "text-muted hover:text-ink");

/** 로그인 후 화면의 상단 메뉴. 시험 기간이라 만든 사람의 편지도 메뉴에 둔다 */
export function AppNav({ current }: { current?: NavId }) {
  const items = [
    { id: "match", href: "/match", label: "추천" },
    { id: "report", href: "/report", label: "내 결" },
    { id: "me", href: "/me", label: "내 정보" },
    { id: "letter", href: "/letter", label: "편지" },
  ] as const;
  return (
    <nav aria-label="주요 메뉴" className="flex gap-4 text-[15px]">
      {items.map((i) => (
        <Link
          key={i.id}
          href={i.href}
          aria-current={current === i.id ? "page" : undefined}
          className={navLinkClass(current === i.id)}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

/** 로그인 전 화면의 상단 메뉴: 편지 + 화면마다 덧붙이는 링크(로그인 등) */
export function PublicNav({ current, children }: { current?: "letter"; children?: ReactNode }) {
  return (
    <nav aria-label="주요 메뉴" className="flex items-center gap-4 text-[15px]">
      <Link
        href="/letter"
        aria-current={current === "letter" ? "page" : undefined}
        className={navLinkClass(current === "letter")}
      >
        편지
      </Link>
      {children}
    </nav>
  );
}

export function PageTitle({ title, lead }: { title: string; lead?: ReactNode }) {
  return (
    <div>
      <h1 className="font-serif text-[1.85rem] font-bold leading-tight">{title}</h1>
      {lead && <p className="mt-3 text-ink-soft">{lead}</p>}
    </div>
  );
}

export function Notice({ children, tone = "mist" }: { children: ReactNode; tone?: "mist" | "alert" }) {
  return (
    <div
      className={`rounded-xl px-4 py-3.5 text-[15px] ${tone === "alert" ? "border border-alert/30 bg-alert/5 text-alert" : "bg-mist text-ink-soft"}`}
    >
      {children}
    </div>
  );
}

export function SecondaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="block w-full rounded-full border border-ink px-6 py-3.5 text-center font-semibold text-ink transition-colors hover:bg-ink hover:text-white"
    >
      {children}
    </Link>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-alert">
      {children}
    </p>
  );
}
