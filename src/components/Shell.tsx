import Link from "next/link";
import type { ReactNode } from "react";

/** 모든 화면의 공통 틀: 상단 워드마크 + 좁은 본문 폭 */
export function Shell({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-[560px] items-center justify-between px-5 pt-5">
        <Link href="/" className="font-serif text-xl font-bold tracking-tight text-ink">
          한결
        </Link>
        {right}
      </header>
      <main className="mx-auto w-full max-w-[560px] flex-1 px-5 pb-16 pt-8">{children}</main>
      <footer className="mx-auto w-full max-w-[560px] px-5 pb-8 text-sm text-muted">
        <Link href="/privacy" className="underline underline-offset-4">
          개인정보처리방침
        </Link>
      </footer>
    </div>
  );
}

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
      className="w-full rounded-full bg-ink px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
    >
      {children}
    </button>
  );
}

export function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="block w-full rounded-full bg-ink px-6 py-4 text-center text-base font-semibold text-white transition-colors hover:bg-ink-soft"
    >
      {children}
    </Link>
  );
}
