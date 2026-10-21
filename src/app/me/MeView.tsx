import type { ReactNode } from "react";
import { DeleteAccount } from "@/app/report/DeleteAccount";
import { Avatar, ListGroup, ListRow, NextStepCard, StatusChip } from "@/components/app-ui";
import { DrinkingQuestion } from "@/components/DrinkingQuestion";
import {
  IconBrush,
  IconCamera,
  IconDoc,
  IconGrain,
  IconIdCard,
  IconLink,
  IconLock,
  IconSliders,
} from "@/components/icons";
import { personLine } from "@/components/PersonCard";
import { Notice } from "@/components/ui";
import { isReady, setupSteps, type MySetup, type SetupStep } from "@/lib/match/me";
import { AppSettings } from "./AppSettings";
import { PauseToggle } from "./PauseToggle";
import { SignOutButton } from "./SignOutButton";

const STEP_ICON: Record<SetupStep["id"], ReactNode> = {
  profile: <IconIdCard size={20} />,
  filters: <IconSliders size={20} />,
  photos: <IconCamera size={20} />,
  contact: <IconLink size={20} />,
};

/** 완료한 단계의 둘째 줄: 지금 채워진 내용을 짧게 */
function stepSub(s: SetupStep, setup: MySetup): string {
  if (!s.done) {
    return { profile: "지역·키·자기소개", filters: "나이·지역·키 같은 조건", photos: "얼굴·전신 2장", contact: "인스타그램 또는 카카오톡 ID" }[s.id];
  }
  switch (s.id) {
    case "profile":
      return setup.matchProfile ? personLine({ birthYear: setup.birthYear, region: setup.matchProfile.region, height: setup.matchProfile.height }) : "";
    case "filters":
      return "꼭·되도록 조건을 정했어요";
    case "photos":
      return "얼굴·전신 2장을 올렸어요";
    case "contact":
      return [setup.contact?.instagram && "인스타그램", setup.contact?.kakao && "카카오톡"].filter(Boolean).join(", ") + " 등록";
  }
}

/** 내 정보 화면: 나, 매칭 준비, 매칭 정보 목록, 앱·알림, 매칭 쉬기, 계정 */
export function MeView({ setup, needsDrinking, faceUrl }: { setup: MySetup; needsDrinking: boolean; faceUrl: string | null }) {
  const steps = setupSteps(setup);
  const ready = isReady(setup);
  const paused = Boolean(setup.matchProfile?.paused);
  const line = setup.matchProfile
    ? personLine({ birthYear: setup.birthYear, region: setup.matchProfile.region, height: setup.matchProfile.height })
    : `${String(setup.birthYear).slice(2)}년생`;

  return (
    <div className="space-y-8">
      <section className="flex items-center gap-4">
        <Avatar name={setup.nickname} size={60} src={faceUrl} />
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-[1.5rem] font-bold leading-tight">{setup.nickname}</h1>
          <p className="mt-0.5 text-[14px] text-muted">{line}</p>
        </div>
        {setup.suspended ? (
          <StatusChip tone="alert">확인 중</StatusChip>
        ) : !ready ? (
          <StatusChip tone="turn">준비 중</StatusChip>
        ) : paused ? (
          <StatusChip tone="wait">쉬는 중</StatusChip>
        ) : (
          <StatusChip tone="done">매칭 중</StatusChip>
        )}
      </section>

      {setup.suspended && <Notice tone="alert">신고가 접수되어 매칭이 잠시 멈춰 있어요. 운영자가 확인한 뒤 다시 열려요.</Notice>}
      {needsDrinking && <DrinkingQuestion />}
      {!ready && <NextStepCard steps={steps} showList={false} />}

      <ListGroup title="매칭 정보" note={ready ? "언제든 고칠 수 있어요. 바꾼 내용은 다음 추천부터 반영돼요." : undefined}>
        {steps.map((s) => (
          <ListRow
            key={s.id}
            href={s.href}
            icon={STEP_ICON[s.id]}
            label={s.label}
            sub={stepSub(s, setup)}
            right={s.done ? undefined : <StatusChip tone="turn">채우기</StatusChip>}
          />
        ))}
      </ListGroup>

      <ListGroup title="나를 더 보여주기">
        <ListRow href="/me/illustration" icon={<IconBrush size={20} />} label="그림 프로필" sub="사진과 자기소개로 그린 그림을 추천 카드에 보여줘요 (선택)" />
        <ListRow href="/report#extra" icon={<IconGrain size={20} />} label="더 알아보기" sub="짧은 시범 검사로 나를 더 알려요 (선택)" />
      </ListGroup>

      <section id="app" className="scroll-mt-4">
        <h2 className="mb-2 px-1 text-[14px] font-semibold text-ink-soft">앱처럼 쓰기</h2>
        <div className="rounded-2xl bg-surface px-4 py-4 ring-1 ring-line/80">
          <p className="text-[14px] text-muted">홈 화면에 한결을 추가하면 앱처럼 바로 열리고, 알림도 받을 수 있어요.</p>
          <AppSettings />
        </div>
      </section>

      {setup.matchProfile && (
        <section>
          <h2 className="mb-2 px-1 text-[14px] font-semibold text-ink-soft">매칭 쉬기</h2>
          <PauseToggle initial={paused} />
          <p className="mt-2 px-1 text-[13px] leading-relaxed text-muted">
            쉬는 동안에는 새 추천을 받지 않고 다른 사람의 추천에도 나오지 않아요. 이미 연결된 사람은 그대로 보여요.
          </p>
        </section>
      )}

      <ListGroup title="계정">
        <ListRow href="/set-password?mode=change" icon={<IconLock size={20} />} label="비밀번호 바꾸기" />
        <ListRow href="/privacy" icon={<IconDoc size={20} />} label="개인정보처리방침" />
        <SignOutButton />
      </ListGroup>

      <DeleteAccount />
    </div>
  );
}
