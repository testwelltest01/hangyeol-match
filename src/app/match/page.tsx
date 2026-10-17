import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { Loading } from "@/components/Loading";
import { PersonCardView, personLine } from "@/components/PersonCard";
import { ReactButtons } from "@/components/ReactButtons";
import { Shell } from "@/components/Shell";
import { AppNav, Notice, PageTitle, SecondaryLink } from "@/components/ui";
import { kstDay } from "@/lib/day";
import { loadDashboard, type PersonCard } from "@/lib/match/dashboard";
import { isReady, loadMySetup, setupSteps } from "@/lib/match/me";
import { generateRecommendations } from "@/lib/match/server";
import { getProgress, PROGRESS_PATH } from "@/lib/progress";
import type { Scores } from "@/lib/scoring";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";

export default function MatchPage() {
  return (
    <Shell right={<AppNav current="match" />}>
      <Suspense fallback={<Loading />}>
        <MatchGate />
      </Suspense>
    </Shell>
  );
}

function Section({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="font-serif text-2xl font-bold">{title}</h2>
      {lead && <p className="mt-2 text-ink-soft">{lead}</p>}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function PairRow({ card, note }: { card: PersonCard; note: string }) {
  return (
    <Link
      href={`/people/${card.id}`}
      className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-5 py-4"
    >
      <span>
        <span className="font-semibold">{card.nickname}</span>
        <span className="mt-0.5 block text-sm text-muted">{personLine(card)}</span>
      </span>
      <span className="shrink-0 text-sm font-semibold text-indigo">{note}</span>
    </Link>
  );
}

async function MatchGate() {
  const userId = await getUserId();
  const progress = await getProgress(userId);
  if (progress !== "report") redirect(PROGRESS_PATH[progress]);
  const setup = await loadMySetup(userId!);
  if (!setup) redirect("/start");

  if (!isReady(setup)) {
    const steps = setupSteps(setup);
    return (
      <>
        <PageTitle
          title="매칭 준비"
          lead="아래를 모두 채우면 바로 오늘의 추천이 열려요. 추천 카드에는 사진이 없고, 서로 관심을 보내면 사진이 공개돼요."
        />
        <ol className="mt-8 space-y-3">
          {steps.map((s, i) => (
            <li key={s.id}>
              <Link
                href={s.href}
                className="flex items-center gap-4 rounded-2xl border border-line bg-surface px-5 py-4"
              >
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

  const admin = createAdminClient();
  const day = kstDay();

  // 오늘 추천이 아직 없으면(매일 밤 계산 이후에 준비를 마친 경우 등) 지금 만든다
  if (!setup.suspended && !setup.matchProfile!.paused) {
    const { count } = await admin
      .from("recommendations")
      .select("target_id", { count: "exact", head: true })
      .eq("user_id", userId!)
      .eq("day", day);
    if (!count) await generateRecommendations(admin, day, userId!);
  }

  const { data: scoreRow } = await admin.from("test_scores").select("scores").eq("user_id", userId!).single();
  const d = await loadDashboard(admin, userId!, scoreRow!.scores as Scores);

  return (
    <>
      <PageTitle title="오늘의 추천" lead="매일 자정에 결이 맞는 사람 3명을 새로 골라요. 서로 관심을 보내면 사진이 공개돼요." />

      <div className="mt-6 space-y-3">
        {setup.suspended && <Notice tone="alert">신고가 접수되어 매칭이 잠시 멈춰 있어요. 운영자가 확인한 뒤 다시 열려요.</Notice>}
        {setup.matchProfile!.paused && (
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

      {d.connected.some((c) => c.needsFeedback) && (
        <Section title="만나보셨나요?" lead="짧은 답이 다음 추천을 더 정확하게 만들어요. 답은 상대에게 보이지 않아요.">
          {d.connected
            .filter((c) => c.needsFeedback)
            .map((c) => (
              <PairRow key={c.id} card={c} note="답하기" />
            ))}
        </Section>
      )}

      {d.photos.length > 0 && (
        <Section title="서로 관심을 보냈어요" lead="사진이 공개됐어요. 보고 마음에 들면 수락해주세요. 서로 수락하면 연락처가 공개돼요.">
          {d.photos.map((c) => (
            <PairRow key={c.id} card={c} note="사진 보기" />
          ))}
        </Section>
      )}

      <Section title="오늘">
        {d.today.length === 0 ? (
          <p className="text-ink-soft">
            {setup.matchProfile!.paused || setup.suspended
              ? "지금은 추천이 멈춰 있어요."
              : "오늘은 조건에 맞는 새 사람이 없어요. 사람이 계속 늘고 있으니 내일 다시 확인해주세요. 조건을 조금 넓히면 더 많이 만날 수 있어요."}
          </p>
        ) : (
          d.today.map((c) => (
            <PersonCardView
              key={c.id}
              card={c}
              actions={
                c.stage === "new" ? (
                  <ReactButtons targetId={c.id} mode="interest" />
                ) : (
                  <p className="text-sm text-moss">관심을 보냈어요. 상대도 관심을 보내면 사진이 공개돼요.</p>
                )
              }
            />
          ))
        )}
        {d.today.length === 0 && !setup.matchProfile!.paused && <SecondaryLink href="/me/filters">조건 살펴보기</SecondaryLink>}
      </Section>

      {(d.waitingAccept.length > 0 || d.connected.length > 0) && (
        <Section title="연결">
          {d.connected.map((c) => (
            <PairRow key={c.id} card={c} note="연락처 보기" />
          ))}
          {d.waitingAccept.map((c) => (
            <PairRow key={c.id} card={c} note="상대 답 기다리는 중" />
          ))}
        </Section>
      )}

      {d.waitingInterest > 0 && (
        <p className="mt-10 text-center text-sm text-muted">이전에 관심을 보낸 {d.waitingInterest}명이 답을 기다리고 있어요.</p>
      )}
    </>
  );
}
