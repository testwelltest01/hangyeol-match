import Link from "next/link";
import type { ReactNode } from "react";

type AdminTab = "dashboard" | "users";

/**
 * 관리자 화면 틀. 관리자 확인이 끝난 뒤에만 그린다(정적 껍데기에 넣지 않는다).
 * 표가 많아서 일반 화면(560px)보다 넓게 쓴다.
 */
export function AdminShell({ current, children }: { current?: AdminTab; children: ReactNode }) {
  const tabs: { id: AdminTab; href: string; label: string }[] = [
    { id: "dashboard", href: "/admin", label: "대시보드" },
    { id: "users", href: "/admin/users", label: "회원" },
  ];
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 pt-5">
        <Link href="/admin" className="font-serif text-xl font-bold tracking-tight text-ink">
          한결 <span className="ml-1 align-middle font-sans text-sm font-semibold text-indigo">관리</span>
        </Link>
        <nav aria-label="관리 메뉴" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px]">
          {tabs.map((t) => (
            <Link
              key={t.id}
              href={t.href}
              aria-current={current === t.id ? "page" : undefined}
              className={current === t.id ? "font-semibold text-ink" : "text-muted hover:text-ink"}
            >
              {t.label}
            </Link>
          ))}
          <Link href="/" className="text-muted hover:text-ink">
            서비스 보기
          </Link>
          {/* 파일을 내려받는 링크라 next/link(미리 불러오기) 대신 a를 쓴다 */}
          <a href="/admin/export" className="rounded-full border border-ink px-3.5 py-1.5 text-sm font-semibold text-ink hover:bg-ink hover:text-white">
            엑셀 받기
          </a>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-16 pt-8">{children}</main>
    </div>
  );
}

export function AdminLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-5 pt-16" aria-busy="true">
      <p className="sr-only">불러오는 중이에요</p>
      <div className="h-8 w-48 rounded-lg bg-mist" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-mist" />
        ))}
      </div>
    </div>
  );
}

export function AdminTitle({ title, lead }: { title: string; lead?: ReactNode }) {
  return (
    <div>
      <h1 className="font-serif text-[1.75rem] font-bold leading-tight">{title}</h1>
      {lead && <p className="mt-2 text-[15px] text-muted">{lead}</p>}
    </div>
  );
}

export function Panel({ title, lead, children, className = "" }: { title: string; lead?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-line bg-surface px-5 py-5 ${className}`}>
      <h2 className="text-lg font-semibold">{title}</h2>
      {lead && <p className="mt-1 text-sm text-muted">{lead}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-4 py-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-serif text-[1.75rem] font-bold leading-none text-ink">{value}</p>
      {sub && <p className="mt-2 text-sm text-ink-soft">{sub}</p>}
    </div>
  );
}

export function Chip({ children, tone = "mist" }: { children: ReactNode; tone?: "mist" | "alert" | "indigo" | "moss" }) {
  const cls = {
    mist: "bg-mist text-ink-soft",
    alert: "bg-alert/10 text-alert",
    indigo: "bg-indigo/10 text-indigo",
    moss: "bg-moss/15 text-moss",
  }[tone];
  return <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{children}</span>;
}

/** 넓은 표는 표 안에서만 가로로 밀리게 한다 (페이지 전체가 밀리지 않게) */
export function TableWrap({ children, wide = true }: { children: ReactNode; /** 칸이 많은 표만 최소 폭을 둔다 */ wide?: boolean }) {
  return (
    <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      <table className={`w-full border-collapse text-left text-sm ${wide ? "min-w-[640px]" : ""}`}>{children}</table>
    </div>
  );
}

export const th = "border-b border-line px-2 py-2 font-semibold text-muted whitespace-nowrap";
export const td = "border-b border-line/70 px-2 py-2.5 align-top";

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-[15px] text-muted">{children}</p>;
}
