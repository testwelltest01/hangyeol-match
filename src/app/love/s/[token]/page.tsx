import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";
import { Shell } from "@/components/Shell";
import { LoveReportView } from "@/app/report/love/LoveReportView";
import { loadSceneImageUrls } from "@/lib/love/sceneImages";
import { loadSharedReport } from "@/lib/love/share";
import { createAdminClient } from "@/lib/supabase/admin";
import { TryInvite } from "../../TryInvite";

const TITLE = "내 연애 상황 보고서를 보냈어요";
const DESCRIPTION = "다툴 때, 연락이 뜸할 때, 화해할 때 나는 어떤지 연애의 장면 10가지로 정리한 보고서예요. 보고 나서 10분 검사로 내 보고서도 받아 볼 수 있어요.";

// 공유 미리보기(카카오톡 등): 그림은 이 폴더의 opengraph-image.png. openGraph를 다시 정하면 루트 설정이 통째로 바뀌므로 type·siteName도 함께.
// url은 넣지 않는다(열쇠가 든 이 주소 그대로 쓰이게). 주소에 열쇠가 있어서 검색에 걸리지 않게, 밖으로 나가는 링크에 주소를 넘기지 않게
export const metadata: Metadata = {
  title: "연애 상황 보고서 | 한결",
  description: DESCRIPTION,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
  openGraph: { type: "website", siteName: "한결", locale: "ko_KR", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

/**
 * 남에게 보여주는 연애 상황 보고서 (주인이 켠 공유 링크 /love/s/열쇠, src/lib/love/share.ts).
 * 보고서 글만 보여주고(검사 점수·닉네임 없음) 아래에 '나도 검사해보기'. 카카오톡 앱 안 브라우저에서도 그 자리에서 보여준다(InAppEscape 예외)
 */
export default function SharedLoveReportPage({ params }: PageProps<"/love/s/[token]">) {
  return (
    <Shell>
      <Suspense fallback={<Loading />}>
        <SharedGate params={params} />
      </Suspense>
    </Shell>
  );
}

async function SharedGate({ params }: { params: PageProps<"/love/s/[token]">["params"] }) {
  const { token } = await params;
  const admin = createAdminClient();
  const [shared, images] = await Promise.all([loadSharedReport(admin, token), loadSceneImageUrls(admin)]);

  // 없는 링크·꺼진 링크는 구분하지 않는다
  if (!shared) {
    return (
      <div>
        <p className="text-sm font-semibold text-indigo">연애 상황 보고서</p>
        <h1 className="mt-1.5 font-serif text-[1.6rem] font-bold leading-snug text-ink">볼 수 없는 링크예요</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">보낸 사람이 공유를 껐거나 주소가 잘못됐어요. 대신 내 연애 상황 보고서를 받아 보세요.</p>
        <TryInvite title="내 연애 상황 보고서 받아 보기" />
      </div>
    );
  }

  return (
    <div>
      <p className="mb-6 rounded-2xl bg-mist px-4 py-3 text-[14px] leading-relaxed text-ink-soft">
        공유받은 연애 상황 보고서예요. 보고서의 글은 보고서 주인에게 들려주는 말투로 쓰여 있어요.
      </p>
      <LoveReportView report={shared.report} completedAt={shared.completedAt} images={images} shared />
      <TryInvite />
    </div>
  );
}
