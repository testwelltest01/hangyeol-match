import { NextResponse, type NextRequest } from "next/server";
import { getAdmin } from "@/lib/admin/auth";
import { GUEST_CLAIM_COOKIE, isGuestToken } from "@/lib/love/guest";
import { claimGuestLove } from "@/lib/love/server";
import { PROGRESS_PATH, getProgress } from "@/lib/progress";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuth } from "@/lib/supabase/server";

/**
 * 로그인 여부와 진행 상황을 보고 맞는 화면으로 보낸다.
 * - 로그인 전: 가입 화면 (가입 화면에서 로그인으로도 갈 수 있다)
 * - 비밀번호를 아직 안 만든 계정: 비밀번호 만들기
 * - 관리자는 관리자 대시보드
 * - 검사를 마쳤으면 추천 화면
 * 가입 전에 공유 링크로 한 연애 상황 검사가 있으면(쿠키, /love/claim) 이 계정으로 옮기고 쿠키를 지운다
 */
export async function GET(request: NextRequest) {
  const auth = await getAuth();
  if (!auth) return NextResponse.redirect(new URL("/signup", request.url));
  if (!auth.passwordSet) return NextResponse.redirect(new URL("/set-password", request.url));

  // 지금 못 옮기면(null: 둘 다 쓰는 중) 쿠키를 두고 다음에 다시
  const claim = request.cookies.get(GUEST_CLAIM_COOKIE)?.value;
  const claimed = isGuestToken(claim) ? await claimGuestLove(createAdminClient(), auth.userId, claim).catch(() => false) : false;

  const go = async () => {
    if (await getAdmin()) return "/admin";
    return PROGRESS_PATH[await getProgress(auth.userId)];
  };
  const res = NextResponse.redirect(new URL(await go(), request.url));
  if (claim && claimed !== null) res.cookies.delete(GUEST_CLAIM_COOKIE);
  return res;
}
