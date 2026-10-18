import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DeleteAccount } from "@/app/report/DeleteAccount";
import { DrinkingQuestion } from "@/components/DrinkingQuestion";
import { Loading } from "@/components/Loading";
import { Shell } from "@/components/Shell";
import { Notice, PageTitle } from "@/components/ui";
import { loadMySetup, setupSteps } from "@/lib/match/me";
import { getProgress, PROGRESS_PATH } from "@/lib/progress";
import type { Scores } from "@/lib/scoring";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";
import { AppSettings } from "./AppSettings";
import { PauseToggle } from "./PauseToggle";
import { SignOutButton } from "./SignOutButton";

export default function MePage() {
  return (
    <Shell nav="me">
      <Suspense fallback={<Loading />}>
        <MeGate />
      </Suspense>
    </Shell>
  );
}

async function MeGate() {
  const userId = await getUserId();
  const progress = await getProgress(userId);
  if (progress !== "report") redirect(PROGRESS_PATH[progress]);
  const setup = await loadMySetup(userId!);
  if (!setup) redirect("/start");

  const steps = setupSteps(setup);
  const { data: scoreRow } = await createAdminClient().from("test_scores").select("scores").eq("user_id", userId!).maybeSingle();
  const needsDrinking = Boolean(scoreRow) && !(scoreRow!.scores as Scores).dealbreakers.drinking;
  return (
    <>
      <PageTitle title="내 정보" lead={`${setup.nickname}님의 매칭 정보예요. 언제든 고칠 수 있어요.`} />
      {needsDrinking && (
        <div className="mt-6">
          <DrinkingQuestion />
        </div>
      )}

      {setup.suspended && (
        <div className="mt-6">
          <Notice tone="alert">신고가 접수되어 매칭이 잠시 멈춰 있어요. 운영자가 확인한 뒤 다시 열려요.</Notice>
        </div>
      )}

      <ul className="mt-8 divide-y divide-line border-y border-line">
        {steps.map((s) => (
          <li key={s.id}>
            <Link href={s.href} className="flex items-center justify-between gap-4 py-4">
              <span>{s.label}</span>
              <span className={`shrink-0 text-sm ${s.done ? "text-moss" : "font-semibold text-indigo"}`}>
                {s.done ? "수정" : "채우기"}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <Link href="/me/illustration" className="mt-4 flex items-center justify-between gap-4 border-b border-line pb-4">
        <span>
          그림 프로필 <span className="ml-1 text-sm text-muted">선택</span>
          <span className="mt-0.5 block text-sm text-muted">사진과 자기소개로 그린 그림을 추천 카드에 보여줘요</span>
        </span>
        <span className="shrink-0 text-sm text-indigo">보기</span>
      </Link>

      <section id="app" className="mt-10 scroll-mt-6">
        <h2 className="font-serif text-xl font-bold">앱처럼 쓰기</h2>
        <p className="mt-2 text-ink-soft">홈 화면에 한결을 추가하면 앱처럼 바로 열리고, 알림도 받을 수 있어요.</p>
        <AppSettings />
      </section>

      {setup.matchProfile && (
        <section className="mt-10">
          <h2 className="font-serif text-xl font-bold">매칭 쉬기</h2>
          <p className="mt-2 text-ink-soft">쉬는 동안에는 새 추천을 받지 않고 다른 사람의 추천에도 나오지 않아요. 이미 연결된 사람은 그대로 보여요.</p>
          <div className="mt-4">
            <PauseToggle initial={setup.matchProfile.paused} />
          </div>
        </section>
      )}

      <section className="mt-12 border-t border-line pt-8 text-center">
        <Link href="/set-password?mode=change" className="mb-5 block text-ink underline underline-offset-4">
          비밀번호 바꾸기
        </Link>
        <SignOutButton />
        <DeleteAccount />
      </section>
    </>
  );
}
