import Link from "next/link";
import type { ReactNode } from "react";

export const fieldClass =
  "mt-2 w-full rounded-xl border border-line bg-surface px-4 py-3.5 text-base text-ink placeholder:text-muted focus:border-indigo focus:outline-none disabled:bg-mist disabled:text-muted";

/** 로그인 후 화면의 상단 메뉴 */
export function AppNav({ current }: { current?: "match" | "report" | "me" }) {
  const items = [
    { id: "match", href: "/match", label: "추천" },
    { id: "report", href: "/report", label: "내 결과" },
    { id: "me", href: "/me", label: "내 정보" },
  ] as const;
  return (
    <nav aria-label="주요 메뉴" className="flex gap-4 text-[15px]">
      {items.map((i) => (
        <Link
          key={i.id}
          href={i.href}
          aria-current={current === i.id ? "page" : undefined}
          className={current === i.id ? "font-semibold text-ink" : "text-muted hover:text-ink"}
        >
          {i.label}
        </Link>
      ))}
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
