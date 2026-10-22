import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Shell } from "@/components/Shell";
import { LoveIntro } from "@/app/report/love/LoveIntro";
import { getProgress } from "@/lib/progress";
import { getUserId } from "@/lib/supabase/server";
import { GuestResume } from "./GuestResume";

const DESCRIPTION = "다툴 때, 연락이 뜸할 때, 화해할 때 나는 어떤 사람일까? 가입 없이 10분 검사로 연애의 장면 10가지 보고서를 받아 보세요.";

const TITLE = "연애 상황 보고서 | 한결";

// 공유 미리보기(카카오톡 등). openGraph를 여기서 다시 정하면 루트 설정이 통째로 바뀌므로 type·siteName·url도 함께 쓴다.
// 이미지는 이 폴더의 opengraph-image.png가 자동으로 붙는다(/love/test, /love/r/…도 같은 그림)
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { type: "website", siteName: "한결", locale: "ko_KR", url: "/love", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

/** 공유 링크로 들어오는 곳: 가입 없이 연애 상황 검사를 받는다. 이미 기본 검사까지 마친 회원은 내 보고서 화면으로 */
export default function LoveGuestPage() {
  return (
    <Shell>
      <Suspense fallback={null}>
        <MemberRedirect />
      </Suspense>
      <LoveIntro guest resume={<GuestResume />} />
    </Shell>
  );
}

async function MemberRedirect() {
  const userId = await getUserId();
  if (userId && (await getProgress(userId)) === "report") redirect("/report/love");
  return null;
}
