import Link from "next/link";
import { PendingSpinner } from "@/components/LinkPending";
import type { ReactNode } from "react";

// 화면 전체 폭의 주요 버튼. 한 화면에 하나만 두는 것이 원칙이다

export function PrimaryButton({
  children,
  disabled,
  type = "button",
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="w-full rounded-full bg-primary px-6 py-4 text-base font-semibold text-white transition hover:bg-primary-soft active:scale-[0.98] active:opacity-80 disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
    >
      {children}
    </button>
  );
}

export function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="relative block w-full rounded-full bg-primary px-6 py-4 text-center text-base font-semibold text-white transition hover:bg-primary-soft active:scale-[0.98] active:opacity-80"
    >
      {children}
      <PendingSpinner />
    </Link>
  );
}
