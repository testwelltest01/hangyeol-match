import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { BackButton } from "@/components/BackButton";
import { IconBack, IconChat, IconGrain, IconHeart, IconLetter, IconToday, IconUser } from "@/components/icons";
import { HomeLink } from "@/components/HomeLink";
import { PendingFill } from "@/components/LinkPending";
import { ThemeSync } from "@/components/ThemeSync";
import { loadTabBadges, type TabBadges } from "@/lib/match/badges";
import { loadMyTheme } from "@/lib/theme-server";

/** 하단 탭. 로그인 후 검사를 마친 사람의 다섯 화면 */
export type TabId = "today" | "interest" | "chat" | "report" | "me";

const TABS: { id: TabId; href: string; label: string; Icon: typeof IconToday; badge?: keyof TabBadges }[] = [
  { id: "today", href: "/match", label: "오늘", Icon: IconToday, badge: "today" },
  { id: "interest", href: "/match/interest", label: "관심", Icon: IconHeart, badge: "interest" },
  { id: "chat", href: "/match/connected", label: "대화", Icon: IconChat, badge: "chat" },
  { id: "report", href: "/report", label: "내 결", Icon: IconGrain },
  { id: "me", href: "/me", label: "내 정보", Icon: IconUser },
];

/** 위쪽 뒤로가기. href로 정해진 곳에 가거나, history면 브라우저 뒤로(처음 연 화면이면 href) */
export type Back = { href: string; label?: string; history?: boolean };

/**
 * 모든 화면의 공통 틀.
 * - 위: 고정 바. 탭 화면은 워드마크, 하위 화면은 뒤로가기. 오른쪽에 만든 사람의 편지(시험 기간이라 늘 위에 둔다)
 * - 아래: tab을 주면 고정 탭(오늘·관심·대화·내 결·내 정보)과 답할 차례 숫자
 */
export function Shell({
  children,
  tab,
  back,
  right,
  hideLetter = false,
  hideFooter = false,
}: {
  children: ReactNode;
  tab?: TabId;
  back?: Back;
  /** 위쪽 바 오른쪽에 덧붙이는 것 (로그인 전 화면의 '로그인' 등) */
  right?: ReactNode;
  hideLetter?: boolean;
  /** 화면 아래에 고정된 입력창이 있는 화면(대화방)은 처리방침 줄을 두지 않는다 */
  hideFooter?: boolean;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      {/* 위쪽 바는 아래 탭처럼 화면에 고정한다. sticky면 iPhone에서 끝까지 당길 때(튕김) 페이지와 같이 끌려 내려온다 */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-line/70 bg-paper/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex h-[52px] w-full max-w-[560px] items-center justify-between gap-3 px-3">
          {back ? (
            back.history ? (
              <BackButton fallback={back.href} label={back.label ?? "뒤로"} />
            ) : (
              <Link href={back.href} className="-ml-1 flex h-10 items-center gap-0.5 rounded-full pl-1 pr-3 text-[15px] text-ink hover:bg-mist">
                <IconBack size={22} />
                {back.label ?? "뒤로"}
              </Link>
            )
          ) : tab ? (
            <Link href="/match" className="px-2 font-serif text-[1.3rem] font-bold tracking-tight text-ink">
              한결
            </Link>
          ) : (
            // 탭 없는 화면(검사 중·처음 정보·친구 평가 등)은 로그인했으면 내 화면으로, 아니면 첫 화면으로
            <HomeLink className="px-2 font-serif text-[1.3rem] font-bold tracking-tight text-ink" />
          )}
          <div className="flex items-center gap-1 text-[15px]">
            {right}
            {!hideLetter && (
              <Link
                href="/letter"
                className="flex h-10 items-center gap-1.5 rounded-full px-3 text-muted hover:bg-mist hover:text-ink"
                aria-label="만든 사람의 편지"
              >
                <IconLetter size={20} />
                <span className="text-[14px]">편지</span>
              </Link>
            )}
          </div>
        </div>
      </header>
      <div aria-hidden className="h-[calc(52px+env(safe-area-inset-top))] shrink-0" />

      <main className={`mx-auto w-full max-w-[560px] flex-1 px-5 pt-6 ${tab ? "pb-[calc(6rem+env(safe-area-inset-bottom))]" : "pb-16"}`}>
        {children}
      </main>

      {tab ? (
        <>
          <TabBar current={tab} />
          <Suspense fallback={null}>
            <ThemeGate />
          </Suspense>
        </>
      ) : hideFooter ? null : (
        <footer className="mx-auto w-full max-w-[560px] px-5 pb-8 text-sm text-muted">
          <Link href="/privacy" className="underline underline-offset-4">
            개인정보처리방침
          </Link>
        </footer>
      )}
    </div>
  );
}

function TabBar({ current }: { current: TabId }) {
  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-surface/95 pb-[max(env(safe-area-inset-bottom),0.375rem)] backdrop-blur-md"
    >
      <ul className="mx-auto grid max-w-[560px] grid-cols-5">
        {TABS.map((t) => {
          const active = t.id === current;
          return (
            <li key={t.id}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-[60px] flex-col items-center justify-center gap-1 text-[11.5px] ${active ? "font-semibold text-primary" : "text-muted hover:text-ink"}`}
              >
                <span className={`relative flex h-7 w-12 items-center justify-center rounded-full ${active ? "bg-primary/10" : ""}`}>
                  {!active && <PendingFill className="rounded-full bg-primary/10" />}
                  <t.Icon size={22} strong={active} className="relative" />
                  {t.badge && (
                    <Suspense fallback={null}>
                      <TabBadge kind={t.badge} label={t.label} />
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
  );
}

/** 탭 화면마다 내 성별 테마를 확인해 기기에 기억한다 (남자 하늘, 여자 분홍) */
async function ThemeGate() {
  return <ThemeSync theme={await loadMyTheme()} />;
}

async function TabBadge({ kind, label }: { kind: keyof TabBadges; label: string }) {
  const n = (await loadTabBadges())[kind];
  if (!n) return null;
  return (
    <>
      <span
        aria-hidden
        className="absolute -top-1 right-0 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose px-1 text-[10.5px] font-semibold leading-none text-white ring-2 ring-surface"
      >
        {n > 99 ? "99+" : n}
      </span>
      <span className="sr-only">
        ({label} {n}개)
      </span>
    </>
  );
}
