import Link from "next/link";
import type { ReactNode } from "react";
import { EmptyState, NextStepCard } from "@/components/app-ui";
import { DrinkingQuestion } from "@/components/DrinkingQuestion";
import { IconMoon, IconPause } from "@/components/icons";
import { PersonCardView } from "@/components/PersonCard";
import { ReactButtons } from "@/components/ReactButtons";
import { TourInvite } from "@/components/TourInvite";
import type { PersonCard } from "@/lib/match/dashboard";
import { setupSteps } from "@/lib/match/me";
import { loadMatch, MatchFrame, MatchNotices } from "./frame";

export default function MatchPage() {
  return (
    <MatchFrame current="today" title="오늘의 추천" sub="매일 저녁 8시에 결이 맞는 3명을 새로 골라요. 서로 관심을 보내면 사진이 공개돼요.">
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

const secondaryLink = "inline-block rounded-full border border-ink px-5 py-2.5 text-[15px] font-semibold text-ink hover:bg-ink hover:text-white";

async function TodayGate() {
  const data = await loadMatch();
  const { setup, ready, d } = data;

  if (!ready) {
    return (
      <div className="space-y-5">
        <MatchNotices data={data} />
        {data.needsDrinking && <DrinkingQuestion />}
        <NextStepCard steps={setupSteps(setup)} />
        <TourInvite title="준비를 마치면 이렇게 소개받아요" body="가상 인물과 추천부터 연락처 교환까지 미리 해보세요." />
      </div>
    );
  }

  const stopped = setup.suspended || setup.matchProfile!.paused;
  return (
    <>
      <MatchNotices data={data} showPaused />
      {data.needsDrinking && <DrinkingQuestion />}
      {d.today.length === 0 ? (
        stopped ? (
          <EmptyState
            icon={<IconPause size={26} />}
            title="지금은 추천이 멈춰 있어요"
            body="매칭을 다시 시작하면 다음 저녁 8시부터 새 추천이 와요."
            action={
              <Link href="/me" className={secondaryLink}>
                내 정보에서 다시 시작하기
              </Link>
            }
          />
        ) : (
          <EmptyState
            icon={<IconMoon size={26} />}
            title="오늘은 새로 소개할 사람이 없어요"
            body="조건에 맞는 사람이 계속 늘고 있어요. 저녁 8시에 다시 골라드릴게요. 조건을 조금 넓히면 더 많이 만날 수 있어요."
            action={
              <Link href="/me/filters" className={secondaryLink}>
                조건 살펴보기
              </Link>
            }
          />
        )
      ) : (
        <div className="space-y-4">
          {d.today.map((c) => {
            const { actions, detailLabel, detailButton } = todayState(c, d.chatAvailable);
            return <PersonCardView key={c.id} card={c} actions={actions} detailLabel={detailLabel} detailButton={detailButton} />;
          })}
        </div>
      )}
    </>
  );
}
