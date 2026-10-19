import "server-only";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cache, Suspense, type ReactNode } from "react";
import { Avatar, PageHeader, StatusChip } from "@/components/app-ui";
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
import { PendingChevron } from "@/components/LinkPending";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";

export type MatchTab = "today" | "interest" | "connected";

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

/** 추천 화면 공통 틀: 하단 탭(오늘·관심·대화)과 화면 제목. 제목은 정적이고 본문만 나중에 채운다 */
export function MatchFrame({ current, title, sub, children }: { current: MatchTab; title: string; sub?: string; children: ReactNode }) {
  return (
    <Shell tab={current === "today" ? "today" : current === "interest" ? "interest" : "chat"}>
      <PageHeader title={title} sub={sub} />
      <PushNudge />
      <Suspense fallback={<Loading />}>{children}</Suspense>
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

/** 사람 목록 묶음: 제목과 짧은 설명, 하얀 바탕 안의 줄들 */
export function Section({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="px-1 text-[15px] font-semibold text-ink">{title}</h2>
      {lead && <p className="mt-1 px-1 text-[13.5px] leading-relaxed text-muted">{lead}</p>}
      <div className="mt-3 divide-y divide-line/70 overflow-hidden rounded-2xl bg-surface ring-1 ring-line/80">{children}</div>
    </section>
  );
}

/** 목록 한 줄. 내가 할 일이 있으면 쪽빛 칩, 기다리는 중이면 회색 칩 */
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
    <Link href={href ?? `/people/${card.id}`} className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-mist/60">
      <Avatar name={card.nickname} size={44} src={card.faceUrl ?? card.illustrationUrl} />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">{card.nickname}</span>
        <span className="mt-0.5 block truncate text-[13px] text-muted">{sub ?? personLine(card)}</span>
      </span>
      <StatusChip tone={waiting ? "wait" : "turn"}>{note}</StatusChip>
      <PendingChevron size={18} className="text-muted/70" />
    </Link>
  );
}
