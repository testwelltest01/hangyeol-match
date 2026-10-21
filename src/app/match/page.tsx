import Link from "next/link";
import type { ReactNode } from "react";
import { Callout, EmptyState, NextStepCard } from "@/components/app-ui";
import { DrinkingQuestion } from "@/components/DrinkingQuestion";
import { IconGrain, IconMoon, IconPause } from "@/components/icons";
import { PersonCardView } from "@/components/PersonCard";
import { ReactButtons } from "@/components/ReactButtons";
import { RefreshCoupon } from "@/components/RefreshCoupon";
import { TourInvite } from "@/components/TourInvite";
import type { PersonCard } from "@/lib/match/dashboard";
import { startAutoIllustration } from "@/lib/illustration/server";
import { needsIllustration, setupSteps } from "@/lib/match/me";
import { loadMatch, MatchFrame, MatchNotices } from "./frame";

// 매칭 준비 중인데 그림 프로필이 없으면 이 화면을 열 때 응답 뒤 after()에서 그린다(1~2분)
export const maxDuration = 300;

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

const secondaryLink = "inline-block rounded-full border border-primary px-5 py-2.5 text-[15px] font-semibold text-primary hover:bg-primary hover:text-white";

async function TodayGate() {
  const data = await loadMatch();
  const { setup, ready, d } = data;

  if (!ready) {
    // 그림 프로필이 아직 없으면(실패했거나 아직 안 그렸으면) 알아서 그린다
    if (needsIllustration(setup) && (await startAutoIllustration(setup.userId))) setup.illustration.drawing = true;
    return (
      <div className="space-y-5">
        <MatchNotices data={data} />
        {data.needsDrinking && <DrinkingQuestion />}
        {/* 검사를 마치면 이 화면으로 온다. 결과는 '내 결' 탭에 있다고 알려준다 */}
        <Callout
          icon={<IconGrain size={22} />}
          action={
            <Link href="/report" className="text-[14px] font-semibold text-indigo underline underline-offset-4">
              내 결 보기
            </Link>
          }
        >
          검사 결과가 나왔어요. &lsquo;내 결&rsquo; 탭에서 나의 연애 결을 볼 수 있어요.
        </Callout>
        <NextStepCard steps={setupSteps(setup)} />
        <TourInvite title="준비를 마치면 이렇게 소개받아요" body="가상 인물과 추천부터 연락처 교환까지 미리 해보세요." />
      </div>
    );
  }

  const stopped = setup.suspended || setup.matchProfile!.paused;
  // 새로고침 쿠폰: 0008 SQL 뒤에, 추천이 멈추지 않았고 오늘 추천이 있을 때. 바꿀 수 있는 사람은 아직 답하지 않았고 나에게 먼저 관심을 보내지 않은 사람
  const coupon =
    data.coupons.available && !stopped && d.today.length > 0 ? (
      <RefreshCoupon
        balance={data.coupons.balance}
        usedToday={data.coupons.usedToday}
        canUse={d.today.some((c) => c.stage === "new" && !c.likedMe)}
      />
    ) : null;
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
      {coupon && <div className="mt-6">{coupon}</div>}
    </>
  );
}
