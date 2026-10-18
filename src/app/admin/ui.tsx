import "server-only";
import Link from "next/link";
import { cache, Suspense, type ReactNode } from "react";
import {
  IconBack,
  IconClusters,
  IconDownload,
  IconExternal,
  IconFlask,
  IconFriends,
  IconGrid,
  IconTrend,
} from "@/components/icons";
import { PendingFill } from "@/components/LinkPending";
import { ClearTheme } from "@/components/ThemeSync";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminTab = "dashboard" | "users" | "trends" | "lpa" | "extra";

const TABS: { id: AdminTab; href: string; label: string; Icon: typeof IconGrid }[] = [
  { id: "dashboard", href: "/admin", label: "대시보드", Icon: IconGrid },
  { id: "users", href: "/admin/users", label: "회원", Icon: IconFriends },
  { id: "trends", href: "/admin/trends", label: "추세", Icon: IconTrend },
  { id: "lpa", href: "/admin/lpa", label: "LPA", Icon: IconClusters },
  { id: "extra", href: "/admin/extra", label: "추가 검사", Icon: IconFlask },
];

/** 처리하지 않은 신고 수 (대시보드 메뉴 옆 숫자). 넓은 화면·좁은 화면 메뉴가 함께 쓰므로 한 번만 읽는다 */
const openReportCount = cache(async (): Promise<number> => {
  const { count } = await createAdminClient().from("reports").select("id", { count: "exact", head: true }).is("resolved_at", null);
  return count ?? 0;
});

async function ReportBadge({ compact = false }: { compact?: boolean }) {
  const n = await openReportCount();
  if (!n) return null;
  return compact ? (
    <span className="absolute -top-1 right-0 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose px-1 text-[10.5px] font-semibold text-white ring-2 ring-surface">
      {n}
      <span className="sr-only">건의 처리할 신고</span>
    </span>
  ) : (
    <span className="relative ml-auto inline-flex items-center rounded-full bg-rose/10 px-2 py-0.5 text-[12px] font-semibold text-rose">신고 {n}</span>
  );
}

const brand = (
  <>
    한결 <span className="ml-1 align-middle font-sans text-[13px] font-semibold text-indigo">관리</span>
  </>
);

/**
 * 관리자 화면 틀. 관리자 확인이 끝난 뒤에만 그린다(정적 껍데기에 넣지 않는다).
 * 넓은 화면은 왼쪽 메뉴, 좁은 화면은 위쪽 바 + 아래쪽 탭. 표가 많아서 회원 화면(560px)보다 넓게 쓴다.
 */
export function AdminShell({ current, back, children }: { current?: AdminTab; back?: { href: string; label: string }; children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1">
      <ClearTheme />
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line/80 bg-mist/40 px-3 py-6 lg:flex">
        <Link href="/admin" className="px-3 font-serif text-xl font-bold tracking-tight text-ink">
          {brand}
        </Link>
        <nav aria-label="관리 메뉴" className="mt-7 space-y-1">
          {TABS.map((t) => {
            const active = t.id === current;
            return (
              <Link
                key={t.id}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors ${
                  active ? "bg-surface font-semibold text-ink ring-1 ring-line/80" : "text-muted hover:bg-surface/70 hover:text-ink"
                }`}
              >
                {!active && <PendingFill className="rounded-xl bg-surface ring-1 ring-line/80" />}
                <span className="relative flex items-center gap-3">
                  <t.Icon size={20} strong={active} />
                  {t.label}
                </span>
                {t.id === "dashboard" && (
                  <Suspense fallback={null}>
                    <ReportBadge />
                  </Suspense>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-1 border-t border-line/80 pt-4">
          {/* 파일을 내려받는 링크라 next/link(미리 불러오기) 대신 a를 쓴다 */}
          <a href="/admin/export" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold text-ink hover:bg-surface/70">
            <IconDownload size={20} />
            엑셀 받기
          </a>
          <Link href="/match" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] text-muted hover:bg-surface/70 hover:text-ink">
            <IconExternal size={20} />
            서비스 보기
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* 좁은 화면의 위쪽 바는 화면에 고정 (당겨서 튕길 때 같이 끌려 내려오지 않게) */}
        <header className="fixed inset-x-0 top-0 z-40 border-b border-line/70 bg-paper/85 pt-[env(safe-area-inset-top)] backdrop-blur-md lg:hidden">
          <div className="flex h-[52px] items-center justify-between gap-3 px-4">
            <Link href="/admin" className="font-serif text-[1.2rem] font-bold tracking-tight text-ink">
              {brand}
            </Link>
            <div className="flex items-center gap-1">
              <Link href="/match" className="flex h-10 items-center rounded-full px-3 text-[14px] text-muted hover:bg-mist hover:text-ink">
                서비스 보기
              </Link>
              <a href="/admin/export" className="flex h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[13.5px] font-semibold text-white">
                <IconDownload size={17} />
                엑셀
              </a>
            </div>
          </div>
        </header>
        <div aria-hidden className="h-[calc(52px+env(safe-area-inset-top))] shrink-0 lg:hidden" />

        <main className="mx-auto w-full max-w-[1120px] flex-1 px-5 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 lg:px-10 lg:pb-16 lg:pt-9">
          {back && (
            <Link
              href={back.href}
              className="mb-5 inline-flex items-center gap-1 rounded-full bg-surface py-1.5 pl-2 pr-3.5 text-sm text-ink-soft ring-1 ring-line/80 hover:text-ink"
            >
              <IconBack size={16} />
              {back.label}
            </Link>
          )}
          {children}
        </main>

        <nav
          aria-label="관리 메뉴"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-surface/95 pb-[max(env(safe-area-inset-bottom),0.375rem)] backdrop-blur-md lg:hidden"
        >
          <ul className="grid grid-cols-5">
            {TABS.map((t) => {
              const active = t.id === current;
              return (
                <li key={t.id}>
                  <Link
                    href={t.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-[60px] flex-col items-center justify-center gap-1 text-[11.5px] ${active ? "font-semibold text-ink" : "text-muted"}`}
                  >
                    <span className={`relative flex h-7 w-12 items-center justify-center rounded-full ${active ? "bg-mist" : ""}`}>
                      {!active && <PendingFill className="rounded-full bg-mist" />}
                      <t.Icon size={22} strong={active} className="relative" />
                      {t.id === "dashboard" && (
                        <Suspense fallback={null}>
                          <ReportBadge compact />
                        </Suspense>
                      )}
                    </span>
                    {t.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}

export function AdminLoading() {
  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-4 px-5 pt-16 lg:px-10" aria-busy="true">
      <p className="sr-only">불러오는 중이에요</p>
      <div className="h-8 w-48 rounded-lg bg-mist" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 rounded-[20px] bg-mist" />
        ))}
      </div>
    </div>
  );
}

export function AdminTitle({ title, lead, aside }: { title: string; lead?: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-serif text-[1.65rem] font-bold leading-tight text-ink">{title}</h1>
        {lead && <p className="mt-1.5 text-[14.5px] text-muted">{lead}</p>}
      </div>
      {aside}
    </div>
  );
}

/** 대시보드처럼 패널이 많은 화면의 묶음 제목 */
export function GroupTitle({ icon, children, id }: { icon?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="mb-3 mt-10 flex scroll-mt-4 items-center gap-2 text-[15px] font-semibold text-ink-soft">
      {icon && <span className="text-indigo">{icon}</span>}
      {children}
    </h2>
  );
}

export function Panel({
  title,
  lead,
  children,
  className = "",
  id,
  icon,
  aside,
}: {
  title: string;
  lead?: string;
  children: ReactNode;
  className?: string;
  id?: string;
  icon?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section id={id} className={`min-w-0 scroll-mt-4 rounded-[20px] bg-surface px-5 py-5 ring-1 ring-line/80 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[16px] font-semibold text-ink">
          {icon && <span className="text-indigo">{icon}</span>}
          {title}
        </h2>
        {aside}
      </div>
      {lead && <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{lead}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** 숫자 칸. alert면 바로 손봐야 할 숫자(처리할 신고 등) */
export function Stat({ label, value, sub, icon, alert = false }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode; alert?: boolean }) {
  return (
    <div className={`rounded-[20px] px-4 py-4 ring-1 ${alert ? "bg-rose/5 ring-rose/25" : "bg-surface ring-line/80"}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13.5px] text-muted">{label}</p>
        {icon && <span className={alert ? "text-rose" : "text-muted/70"}>{icon}</span>}
      </div>
      <p className={`mt-2 font-serif text-[1.85rem] font-bold leading-none tabular-nums ${alert ? "text-rose" : "text-ink"}`}>{value}</p>
      {sub && <p className="mt-2 text-[13px] text-ink-soft">{sub}</p>}
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
    <div className="-mx-5 overflow-x-auto px-5">
      <table className={`w-full border-collapse text-left text-sm ${wide ? "min-w-[640px]" : ""}`}>{children}</table>
    </div>
  );
}

export const th = "border-b border-line px-2 py-2 font-semibold text-muted whitespace-nowrap";
export const td = "border-b border-line/70 px-2 py-2.5 align-top";

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-[15px] text-muted">{children}</p>;
}

/** 화면 안 바로가기 (긴 화면의 섹션으로) */
export function JumpLinks({ links }: { links: { href: string; label: string }[] }) {
  return (
    <nav aria-label="바로가기" className="-mx-5 mt-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
      {links.map((l) => (
        <a key={l.href} href={l.href} className="shrink-0 rounded-full bg-surface px-3.5 py-1.5 text-[13.5px] text-ink-soft ring-1 ring-line/80 hover:text-ink">
          {l.label}
        </a>
      ))}
    </nav>
  );
}
