import Link from "next/link";
import type { ReactNode } from "react";
import { PersonCardView } from "@/components/PersonCard";
import { ReactButtons } from "@/components/ReactButtons";
import { SecondaryLink } from "@/components/ui";
import type { PersonCard } from "@/lib/match/dashboard";
import { setupSteps } from "@/lib/match/me";
import { EmptyText, loadMatch, MatchFrame, MatchNotices } from "./frame";

export default function MatchPage() {
  return (
    <MatchFrame current="today" title="오늘의 추천">
      <TodayGate />
    </MatchFrame>
  );
}

/** 오늘 추천받은 사람은 관심·수락이 진행돼도 하루 동안 카드에 남기고, 지금 단계를 한 줄로 알려준다 */
function todayState(c: PersonCard, chatAvailable: boolean): { actions: ReactNode; detailLabel?: string; detailButton?: boolean } {
  const note = (text: string, strong = false) => (
    <p className={`text-sm ${strong ? "font-semibold text-indigo" : "text-moss"}`}>{text}</p>
  );
  switch (c.stage) {
    case "new":
      return { actions: <ReactButtons targetId={c.id} mode="interest" /> };
    case "waiting_interest":
      return { actions: note("관심을 보냈어요. 상대도 관심을 보내면 사진이 공개돼요.") };
    case "photos":
      return { actions: note("서로 관심을 보냈어요. 사진이 공개됐어요.", true), detailLabel: "사진 보기", detailButton: true };
    case "waiting_accept":
      return { actions: note("수락했어요. 상대의 답을 기다리고 있어요.") };
    case "connected":
      return {
        actions: note(chatAvailable ? "서로 수락했어요. 대화방이 열렸어요." : "서로 수락했어요. 연락처가 공개됐어요.", true),
        detailLabel: "프로필 보기",
        detailButton: true,
      };
    default:
      return { actions: null };
  }
}

async function TodayGate() {
  const data = await loadMatch();
  const { setup, ready, d } = data;

  if (!ready) {
    const steps = setupSteps(setup);
    return (
      <>
        <MatchNotices data={data} />
        <h2 className="font-serif text-2xl font-bold">매칭 준비</h2>
        <p className="mt-2 text-ink-soft">
          아래를 모두 채우면 바로 오늘의 추천이 열려요. 추천 카드에는 사진이 없고, 서로 관심을 보내면 사진이 공개돼요.
        </p>
        <ol className="mt-6 space-y-3">
          {steps.map((s, i) => (
            <li key={s.id}>
              <Link href={s.href} className="flex items-center gap-4 rounded-2xl border border-line bg-surface px-5 py-4">
                <span className={`font-serif text-xl ${s.done ? "text-moss" : "text-indigo"}`}>{s.done ? "✓" : i + 1}</span>
                <span className="flex-1">{s.label}</span>
                <span className="text-sm text-muted">{s.done ? "완료" : "채우기"}</span>
              </Link>
            </li>
          ))}
        </ol>
      </>
    );
  }

  const stopped = setup.suspended || setup.matchProfile!.paused;
  return (
    <>
      <MatchNotices data={data} showPaused />
      <p className="text-ink-soft">매일 자정에 결이 맞는 사람 3명을 새로 골라요. 서로 관심을 보내면 사진이 공개돼요.</p>

      <div className="mt-6 space-y-4">
        {d.today.length === 0 ? (
          <>
            <EmptyText>
              {stopped
                ? "지금은 추천이 멈춰 있어요."
                : "오늘은 조건에 맞는 새 사람이 없어요. 사람이 계속 늘고 있으니 내일 다시 확인해주세요. 조건을 조금 넓히면 더 많이 만날 수 있어요."}
            </EmptyText>
            {!stopped && <SecondaryLink href="/me/filters">조건 살펴보기</SecondaryLink>}
          </>
        ) : (
          d.today.map((c) => {
            const { actions, detailLabel, detailButton } = todayState(c, d.chatAvailable);
            return <PersonCardView key={c.id} card={c} actions={actions} detailLabel={detailLabel} detailButton={detailButton} />;
          })
        )}
      </div>
    </>
  );
}
