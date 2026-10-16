import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";
import { Shell } from "@/components/Shell";
import { AppNav, PageTitle, SecondaryLink } from "@/components/ui";
import { loadMySetup, nextSetupPath, signedPhotoUrls } from "@/lib/match/me";
import { canUploadToday } from "@/lib/photo/rules";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProgress, PROGRESS_PATH } from "@/lib/progress";
import { getUserId } from "@/lib/supabase/server";
import { PhotoSlot } from "./PhotoSlot";

// 사진 분석(AI)이 10~30초 걸릴 수 있어서 서버 액션 제한 시간을 늘린다
export const maxDuration = 60;

export default function PhotosPage() {
  return (
    <Shell right={<AppNav current="me" />}>
      <PageTitle
        title="사진 2장"
        lead="사진은 서로 관심을 보낸 사람에게만 보여요. 올리면 AI가 분위기를 중심으로 더 좋은 사진을 찍는 방법을 알려줘요."
      />
      <Suspense fallback={<Loading />}>
        <PhotosGate />
      </Suspense>
    </Shell>
  );
}

async function PhotosGate() {
  const userId = await getUserId();
  const progress = await getProgress(userId);
  if (progress !== "report") redirect(PROGRESS_PATH[progress]);
  const setup = await loadMySetup(userId!);
  if (!setup) redirect("/start");

  const { face, body } = setup.photos;
  const [urls, { data: history }] = await Promise.all([
    signedPhotoUrls([face?.path, body?.path].filter((p): p is string => Boolean(p))),
    createAdminClient().from("photos").select("slot, created_at").eq("user_id", userId!),
  ]);
  const canUpload = (slot: "face" | "body") =>
    canUploadToday((history ?? []).filter((h) => h.slot === slot).map((h) => h.created_at));
  const done = Boolean(face && body);

  return (
    <div className="mt-8 space-y-10">
      <PhotoSlot
        slot="face"
        title="얼굴 사진"
        tip="버튼을 누르면 카메라가 열려요. 거울 앞에서 2배 줌으로 찍으면 얼굴이 덜 왜곡되고, 창문을 마주 보면 얼굴이 밝게 나와요."
        current={face ? { url: urls.get(face.path) ?? null, feedback: face.feedback } : null}
        canUpload={canUpload("face")}
        needsConsent={!setup.consents.photoOverseas}
      />
      <PhotoSlot
        slot="body"
        title="전신 사진"
        tip="다른 사람이 찍어준 사진을 갤러리에서 골라주세요. 최소 무릎 위까지 나와야 해요."
        current={body ? { url: urls.get(body.path) ?? null, feedback: body.feedback } : null}
        canUpload={canUpload("body")}
        needsConsent={!setup.consents.photoOverseas}
      />
      <p className="text-sm text-muted">
        사진은 하루에 한 번 바꿀 수 있어요(처음 등록은 제외). 바꾼 이전 사진은 30일 뒤 지워져요. AI 점수는 사진 개선 안내에만 쓰고 추천
        순위에는 쓰지 않아요.
      </p>
      {done && <SecondaryLink href={nextSetupPath(setup, "photos")}>다음</SecondaryLink>}
    </div>
  );
}
