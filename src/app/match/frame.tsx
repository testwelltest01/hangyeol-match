import "server-only";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cache, Suspense, type ReactNode } from "react";
import { Loading } from "@/components/Loading";
import { PushNudge } from "@/components/PushNudge";
import { personLine } from "@/components/PersonCard";
import { Shell } from "@/components/Shell";
import { Notice } from "@/components/ui";
import { matchDay } from "@/lib/day";
import { loadDashboard, type Dashboard, type PersonCard } from "@/lib/match/dashboard";
import { isReady, loadMySetup, type MySetup } from "@/lib/match/me";
import { generateRecommendations } from "@/lib/match/server";
import { getProgress, PROGRESS_PATH } from "@/lib/progress";
import type { Scores } from "@/lib/scoring";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";

export type MatchTab = "today" | "interest" | "connected";

const TABS: { id: MatchTab; href: string; label: string }[] = [
  { id: "today", href: "/match", label: "오늘" },
  { id: "interest", href: "/match/interest", label: "관심" },
  { id: "connected", href: "/match/connected", label: "연결" },
];

/** needsDrinking: 음주 문항(2026-10-v3) 전에 검사를 마쳐서 아직 답하지 않음 */
export type MatchData = { setup: MySetup; ready: boolean; d: Dashboard; needsDrinking: boolean };

/**
 * 추천 탭 세 곳이 함께 쓰는 데이터. 탭 숫자와 본문이 같은 요청 안에서 부르므로 cache로 한 번만 읽는다.
 * 준비가 덜 됐어도 관심·연결은 그대로 보여준다(새 추천만 막는다).
 */
export const loadMatch = cache(async (): Promise<MatchData> => {
  const userId = await getUserId();
  const progress = await getProgress(userId);
  if (progress !== "report") redirect(PROGRESS_PATH[progress]);
  const setup = await loadMySetup(userId!);
  if (!setup) redirect("/start");
  const ready = isReady(setup);
  const admin = createAdminClient();

  // 오늘 추천이 아직 없으면(저녁 8시 계산 이후에 준비를 마쳤거나, 크론보다 먼저 들어온 경우) 지금 만든다
  if (ready && !setup.suspended && !setup.matchProfile?.paused) {
    const day = matchDay();
    const { count } = await admin
      .from("recommendations")
      .select("target_id", { count: "exact", head: true })
      .eq("user_id", userId!)
      .eq("day", day);
    if (!count) await generateRecommendations(admin, day, userId!);
  }

  const { data: scoreRow } = await admin.from("test_scores").select("scores").eq("user_id", userId!).single();
  const scores = scoreRow!.scores as Scores;
  const d = await loadDashboard(admin, userId!, scores);
  return { setup, ready, d, needsDrinking: !scores.dealbreakers.drinking };
});

/** 연결 탭에서 내가 봐야 할 사람: 새 메시지, 상대의 연락처 전달 요청, 만남 피드백 */
export function needsAttention(c: Dashboard["connected"][number]): boolean {
  const chat = c.chat;
  return c.needsFeedback || Boolean(chat && !chat.closed && (chat.unread > 0 || (chat.contactTheirs && !chat.contactMine && !chat.exchanged)));
}

/** 탭 옆 숫자: 내가 답해야 할 사람 수 */
async function TabCount({ tab }: { tab: MatchTab }) {
  const { d } = await loadMatch();
  const n = tab === "interest" ? d.photos.length : tab === "connected" ? d.connected.filter(needsAttention).length : 0;
  if (!n) return null;
  return (
    <>
      <span
        aria-hidden
        className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo px-1.5 text-xs font-semibold text-white"
      >
        {n}
      </span>
      <span className="sr-only">(답할 사람 {n}명)</span>
    </>
  );
}

/** 추천 화면 공통 틀: 상단 메뉴, 오늘·관심·연결 탭. 탭은 정적이고 숫자와 본문만 나중에 채운다 */
export function MatchFrame({ current, title, children }: { current: MatchTab; title: string; children: ReactNode }) {
  return (
    <Shell nav="match">
      <h1 className="sr-only">{title}</h1>
      <nav aria-label="추천 보기" className="sticky top-0 z-10 grid grid-cols-3 border-b border-line bg-paper">
        {TABS.map((t) => {
          const active = t.id === current;
          return (
            <Link
              key={t.id}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex items-center justify-center gap-1.5 py-3 text-[16px] ${
                active
                  ? "font-semibold text-ink after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-ink"
                  : "text-muted hover:text-ink"
              }`}
            >
              {t.label}
              {t.id !== "today" && (
                <Suspense fallback={null}>
                  <TabCount tab={t.id} />
                </Suspense>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="pt-7">
        <PushNudge />
        <Suspense fallback={<Loading />}>{children}</Suspense>
      </div>
    </Shell>
  );
}

/** 모든 탭 위에 띄우는 알림. 매칭 쉬기 안내는 오늘 탭에만 */
export function MatchNotices({ data, showPaused = false }: { data: MatchData; showPaused?: boolean }) {
  const { setup, d } = data;
  const paused = showPaused && setup.matchProfile?.paused;
  if (!setup.suspended && !paused && !d.contactNotFound) return null;
  return (
    <div className="mb-6 space-y-3">
      {setup.suspended && <Notice tone="alert">신고가 접수되어 매칭이 잠시 멈춰 있어요. 운영자가 확인한 뒤 다시 열려요.</Notice>}
      {paused && (
        <Notice>
          매칭을 쉬는 중이라 새 추천이 없어요.{" "}
          <Link href="/me" className="underline underline-offset-4">
            다시 시작하기
          </Link>
        </Notice>
      )}
      {d.contactNotFound && (
        <Notice tone="alert">
          상대가 내 아이디로 찾을 수 없다고 알려왔어요.{" "}
          <Link href="/me/contact" className="underline underline-offset-4">
            연락처 확인하기
          </Link>
        </Notice>
      )}
    </div>
  );
}

export function Section({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-serif text-xl font-bold">{title}</h2>
      {lead && <p className="mt-1.5 text-[15px] text-ink-soft">{lead}</p>}
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

/** 목록 한 줄. 내가 할 일이 있으면 쪽빛, 기다리는 중이면 회색으로 적는다 */
export function PairRow({
  card,
  note,
  waiting = false,
  href,
  sub,
}: {
  card: PersonCard;
  note: string;
  waiting?: boolean;
  href?: string;
  /** 둘째 줄. 없으면 나이·지역·키 */
  sub?: string;
}) {
  return (
    <Link
      href={href ?? `/people/${card.id}`}
      className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-5 py-4"
    >
      <span className="min-w-0">
        <span className="font-semibold">{card.nickname}</span>
        <span className="mt-0.5 block text-sm text-muted">{sub ?? personLine(card)}</span>
      </span>
      <span className={`shrink-0 text-sm ${waiting ? "text-muted" : "font-semibold text-indigo"}`}>{note}</span>
    </Link>
  );
}

export function EmptyText({ children }: { children: ReactNode }) {
  return <p className="leading-relaxed text-ink-soft">{children}</p>;
}
