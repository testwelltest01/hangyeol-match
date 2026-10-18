import Link from "next/link";
import type { ReactNode } from "react";

export const fieldClass =
  "mt-2 w-full rounded-xl border border-line bg-surface px-4 py-3.5 text-base text-ink placeholder:text-muted focus:border-indigo focus:outline-none disabled:bg-mist disabled:text-muted";

export function PageTitle({ title, lead }: { title: string; lead?: ReactNode }) {
  return (
    <div>
      <h1 className="font-serif text-[1.65rem] font-bold leading-tight text-ink">{title}</h1>
      {lead && <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{lead}</p>}
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
      className="block w-full rounded-full border border-primary px-6 py-3.5 text-center font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
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
