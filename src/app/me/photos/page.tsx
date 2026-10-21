import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";
import { PrimaryLink } from "@/components/buttons";
import { Shell } from "@/components/Shell";
import { PageTitle, SecondaryLink } from "@/components/ui";
import { ILLUSTRATIONS_PER_ACCOUNT } from "@/lib/illustration/prompt";
import { loadIllustrations, usedByAccount } from "@/lib/illustration/server";
import { loadMySetup, nextSetupStep, signedPhotoUrls } from "@/lib/match/me";
import { COUNTED_RESULTS, PHOTO_UPLOADS_PER_ACCOUNT, remainingUploads } from "@/lib/photo/rules";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProgress, PROGRESS_PATH } from "@/lib/progress";
import { getUserId } from "@/lib/supabase/server";
import { PhotoSlot } from "./PhotoSlot";

// 사진 분석(AI)이 10~30초 걸리고, 사진 2장이 갖춰지면 응답 뒤에 그림 프로필을 자동으로 그려서(1~2분) 제한 시간을 늘린다
export const maxDuration = 300;

export default function PhotosPage({ searchParams }: PageProps<"/me/photos">) {
  return (
    <Shell back={{ href: "/me", label: "내 정보" }}>
      <PageTitle
        title="사진 2장"
        lead="사진은 서로 관심을 보낸 사람에게만 보여요. 올리면 AI가 등록 기준에 맞는지 확인하고, 분위기를 중심으로 더 좋은 사진을 고르거나 찍는 방법을 알려줘요."
      />
      <Suspense fallback={<Loading />}>
        <PhotosGate searchParams={searchParams} />
      </Suspense>
    </Shell>
  );
}

async function PhotosGate({ searchParams }: { searchParams: PageProps<"/me/photos">["searchParams"] }) {
  // 그림 프로필 화면에서 왔으면 사진을 다 올린 뒤 그림 프로필로 돌려보낸다
  const fromIllustration = (await searchParams).next === "illustration";
  const userId = await getUserId();
  const progress = await getProgress(userId);
  if (progress !== "report") redirect(PROGRESS_PATH[progress]);
  const setup = await loadMySetup(userId!);
  if (!setup) redirect("/start");

  const { face, body } = setup.photos;
  const [urls, { data: attempts }] = await Promise.all([
    signedPhotoUrls([face?.path, body?.path].filter((p): p is string => Boolean(p))),
    createAdminClient()
      .from("photo_attempts")
      .select("result")
      .eq("user_id", userId!)
      .in("result", [...COUNTED_RESULTS]),
  ]);
  const remaining = remainingUploads((attempts ?? []).map((a) => a.result));
  const done = Boolean(face && body);
  const nextStep = nextSetupStep(setup, "photos");
  const illustration = done && !fromIllustration && setup.matchProfile ? await illustrationState(userId!) : null;
  const offerIllustration = illustration === "offer";

  return (
    <div className="mt-8 space-y-10">
      <PhotoSlot
        slot="face"
        title="얼굴 사진"
        tip="얼굴이 잘 보이는 최근 사진을 갤러리에서 골라주세요. 혼자 나오고, 밝은 곳에서 찍은 사진이 좋아요. 새로 찍는다면 창문을 마주 보고, 거울 앞에서 2배 줌으로 찍으면 얼굴이 덜 왜곡돼요."
        current={face ? { url: urls.get(face.path) ?? null, feedback: face.feedback } : null}
        canUpload={remaining > 0}
        needsConsent={!setup.consents.photoOverseas}
      />
      <PhotoSlot
        slot="body"
        title="전신 사진"
        tip="다른 사람이 찍어준 사진을 갤러리에서 골라주세요. 최소 무릎 위까지 나와야 해요."
        current={body ? { url: urls.get(body.path) ?? null, feedback: body.feedback } : null}
        canUpload={remaining > 0}
        needsConsent={!setup.consents.photoOverseas}
      />
      <p className="text-sm text-muted">
        사진은 얼굴·전신을 합쳐 계정당 {PHOTO_UPLOADS_PER_ACCOUNT}번까지 올릴 수 있어요(기준에 맞지 않아 거절된 사진 포함). {remaining}번
        남았어요. 바꾼 이전 사진은 1년 뒤 지워져요. AI 점수는 사진 개선 안내에만 쓰고 추천
        순위에는 쓰지 않아요.
      </p>
      {illustration === "drawing" && (
        <section className="rounded-[22px] bg-surface px-5 py-5 ring-1 ring-line/80">
          <h2 className="text-[1.05rem] font-semibold">그림 프로필을 그리고 있어요</h2>
          <p className="mt-1 text-sm text-ink-soft">
            사진 2장과 자기소개로 AI가 그림을 그려요. 1~2분 걸리고, 다 되면 그림 프로필에서 보고 저장하거나 추천 카드에 보여줄지 정할 수 있어요.
          </p>
          <div className="mt-4">
            <SecondaryLink href="/me/illustration">그림 프로필 보기</SecondaryLink>
          </div>
        </section>
      )}
      {offerIllustration && (
        <section className="rounded-[22px] bg-surface px-5 py-5 ring-1 ring-line/80">
          <h2 className="text-[1.05rem] font-semibold">사진 2장이 준비됐어요</h2>
          <p className="mt-1 text-sm text-ink-soft">
            이 사진과 자기소개로 AI가 그림 프로필을 그려줘요. 추천 카드에 보여주면 사진이 공개되기 전에도 내 분위기를 전할 수 있어요.
            (선택, 계정당 {ILLUSTRATIONS_PER_ACCOUNT}번)
          </p>
          <div className="mt-4">
            <PrimaryLink href="/me/illustration">그림 프로필 만들기</PrimaryLink>
          </div>
        </section>
      )}
      {done &&
        (fromIllustration ? (
          <PrimaryLink href="/me/illustration">그림 프로필로 돌아가기</PrimaryLink>
        ) : (
          offerIllustration ? (
            <SecondaryLink href={nextStep?.href ?? "/match"}>그림 없이 {nextStep ? `다음: ${nextStep.label}` : "오늘의 추천 보기"}</SecondaryLink>
          ) : (
            <PrimaryLink href={nextStep?.href ?? "/match"}>{nextStep ? `다음: ${nextStep.label}` : "오늘의 추천 보기"}</PrimaryLink>
          )
        ))}
    </div>
  );
}

/**
 * 사진 2장을 다 올린 뒤 그림 프로필 안내: drawing = 자동으로(또는 직접) 그리는 중, offer = 아직 안 만들었고 만들 횟수가 남음.
 * 0006 SQL 전이면 null
 */
async function illustrationState(userId: string): Promise<"drawing" | "offer" | null> {
  const admin = createAdminClient();
  const [{ available, rows }, used] = await Promise.all([loadIllustrations(admin, userId), usedByAccount(admin, userId)]);
  if (!available) return null;
  if (rows.some((r) => r.status === "pending")) return "drawing";
  if (!rows.some((r) => r.status === "done") && used < ILLUSTRATIONS_PER_ACCOUNT) return "offer";
  return null;
}
