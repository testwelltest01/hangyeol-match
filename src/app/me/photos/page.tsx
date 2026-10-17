import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";
import { PrimaryLink, Shell } from "@/components/Shell";
import { PageTitle, SecondaryLink } from "@/components/ui";
import { ILLUSTRATIONS_PER_ACCOUNT } from "@/lib/illustration/prompt";
import { loadIllustrations, usedByAccount } from "@/lib/illustration/server";
import { loadMySetup, nextSetupPath, signedPhotoUrls } from "@/lib/match/me";
import { COUNTED_RESULTS, PHOTO_UPLOADS_PER_ACCOUNT, remainingUploads } from "@/lib/photo/rules";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProgress, PROGRESS_PATH } from "@/lib/progress";
import { getUserId } from "@/lib/supabase/server";
import { PhotoSlot } from "./PhotoSlot";

// 사진 분석(AI)이 10~30초 걸릴 수 있어서 서버 액션 제한 시간을 늘린다
export const maxDuration = 60;

export default function PhotosPage({ searchParams }: PageProps<"/me/photos">) {
  return (
    <Shell nav="me">
      <PageTitle
        title="사진 2장"
        lead="사진은 서로 관심을 보낸 사람에게만 보여요. 올리면 AI가 분위기를 중심으로 더 좋은 사진을 찍는 방법을 알려줘요."
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
  const offerIllustration = done && !fromIllustration && Boolean(setup.matchProfile) && (await canStartIllustration(userId!));

  return (
    <div className="mt-8 space-y-10">
      <PhotoSlot
        slot="face"
        title="얼굴 사진"
        tip="지금 바로 찍거나 갤러리에서 골라주세요. 직접 찍을 때는 거울 앞에서 2배 줌으로 찍으면 얼굴이 덜 왜곡되고, 창문을 마주 보면 얼굴이 밝게 나와요."
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
      {offerIllustration && (
        <section className="rounded-2xl border border-line bg-surface px-5 py-5">
          <h2 className="font-serif text-lg font-bold">사진 2장이 준비됐어요</h2>
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
          <SecondaryLink href={nextSetupPath(setup, "photos")}>{offerIllustration ? "그림 없이 다음" : "다음"}</SecondaryLink>
        ))}
    </div>
  );
}

/** 그림 프로필을 아직 안 만들었고(그린 것·그리는 중 없음) 만들 횟수가 남았으면 true. 0006 SQL 전이면 false */
async function canStartIllustration(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const [{ available, rows }, used] = await Promise.all([loadIllustrations(admin, userId), usedByAccount(admin, userId)]);
  return available && !rows.some((r) => r.status === "done" || r.status === "pending") && used < ILLUSTRATIONS_PER_ACCOUNT;
}
