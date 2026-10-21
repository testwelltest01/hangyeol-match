import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";
import { Shell } from "@/components/Shell";
import { PageTitle } from "@/components/ui";
import { loadMySetup, setupSteps, type MySetup } from "@/lib/match/me";
import { getProgress, type Progress } from "@/lib/progress";
import { createClient, getUserId } from "@/lib/supabase/server";
import type { TourGender } from "@/lib/tour/personas";
import { TourClient, type JourneyStep } from "./TourClient";

export const metadata: Metadata = {
  title: "가상 매칭 둘러보기 | 한결",
  description: "체험용 가상 인물과 추천부터 연락처 교환까지 미리 해보세요.",
};

function Heading() {
  return (
    <PageTitle
      title="가상 매칭 둘러보기"
      lead="체험용 가상 인물과 추천부터 대화, 연락처 교환까지 미리 해봐요. 2분이면 끝나요."
    />
  );
}

export default function TourPage() {
  return (
    <Suspense
      fallback={
        <Shell>
          <Heading />
          <div className="mt-8">
            <Loading />
          </div>
        </Shell>
      }
    >
      <TourGate />
    </Suspense>
  );
}

/** 각 단계 설명과 걸리는 시간(분) */
const STEP_INFO: Record<string, { detail: string; minutes: number | null }> = {
  basic: { detail: "닉네임·성별·출생연도", minutes: 1 },
  test: { detail: "연락·갈등·돈·주말 같은 가치관 검사. 끝나면 연애 리포트가 나와요", minutes: 11 },
  profile: { detail: "지역·키·자기소개", minutes: 3 },
  filters: { detail: "나이·지역·키처럼 꼭 맞았으면 하는 조건", minutes: 2 },
  photos: { detail: "얼굴·전신 2장. AI가 더 잘 나오는 방법을 알려줘요", minutes: 3 },
  contact: { detail: "둘 다 '연락처 전달'을 누르기 전에는 상대에게 보이지 않아요", minutes: 1 },
  illustration: { detail: "사진 2장이 갖춰지면 AI가 알아서 그려요. 추천 카드에는 실제 사진 대신 이 그림이 보여요", minutes: null },
};

/** 아직 아무것도 채우지 않은 상태 (단계 이름·주소를 매칭 준비 목록과 똑같이 쓰려고) */
const EMPTY_SETUP: MySetup = {
  userId: "",
  nickname: "",
  gender: "male",
  birthYear: 0,
  matchProfile: null,
  photos: { face: null, body: null },
  contact: null,
  consents: { religion: false, photoOverseas: false, illustration: false },
  illustration: { done: false, drawing: false },
  suspended: false,
  friendCount: 0,
};

function buildJourney(progress: Progress, setup: MySetup | null): JourneyStep[] {
  const step = (id: string, label: string, href: string, done: boolean): JourneyStep => ({ id, label, href, done, ...STEP_INFO[id] });
  const loggedIn = progress !== "login";
  return [
    loggedIn
      ? step("basic", "기본 정보", "/onboarding", progress !== "onboarding")
      : { id: "basic", label: "가입·기본 정보", href: "/start", done: false, detail: "이메일 인증 후 닉네임·성별·출생연도", minutes: 2 },
    step("test", "가치관 검사", "/test", progress === "report"),
    ...setupSteps(setup ?? EMPTY_SETUP).map((s) => step(s.id, s.label, s.href, setup ? s.done : false)),
  ];
}

/** 로그인 여부와 진행 단계에 따라 성별·닉네임·남은 단계를 정한다. 아무것도 저장하지 않는다 */
async function TourGate() {
  const userId = await getUserId();
  const progress = await getProgress(userId);

  let gender: TourGender | null = null;
  let nickname: string | null = null;
  let setup: MySetup | null = null;
  if (progress === "report") {
    setup = await loadMySetup(userId!);
    gender = setup?.gender ?? null;
    nickname = setup?.nickname ?? null;
  } else if (progress === "test") {
    const supabase = await createClient();
    const { data } = await supabase.from("profiles").select("nickname, gender").eq("id", userId!).maybeSingle();
    gender = data?.gender === "female" || data?.gender === "male" ? data.gender : null;
    nickname = data?.nickname ?? null;
  }

  const journey = buildJourney(progress, setup);
  const next = journey.find((s) => !s.done);
  const cta =
    progress === "login"
      ? { href: "/start", label: "무료로 가입하고 시작하기" }
      : next
        ? { href: next.href, label: `이어서 하기: ${next.label}` }
        : { href: "/match", label: "오늘의 추천 보러 가기" };

  return (
    <Shell
      back={{ href: progress === "report" ? "/match" : "/", label: "뒤로", history: true }}
      right={
        progress === "login" ? (
          <Link href="/login" className="text-[15px] text-muted hover:text-ink">
            로그인
          </Link>
        ) : undefined
      }
    >
      <Heading />
      <TourClient initialGender={gender} nickname={nickname} journey={journey} cta={cta} />
    </Shell>
  );
}
