import { NextResponse, type NextRequest } from "next/server";
import { GUEST_CLAIM_COOKIE, GUEST_KEEP_DAYS, isGuestToken } from "@/lib/love/guest";
import { claimGuestLove } from "@/lib/love/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuth } from "@/lib/supabase/server";

/**
 * 비회원 연애 상황 검사 → 가입. 결과 화면의 '가입하고 소개받기'가 이 주소로 온다 (앱 안 브라우저면 밖의 브라우저로 넘겨서).
 * - 이미 로그인했으면 그 자리에서 계정으로 옮기고 /start로
 * - 아니면 열쇠를 쿠키에 담아 두고 가입 화면으로. 가입·로그인이 끝나면 /start가 옮긴다
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t");
  if (!isGuestToken(token)) return NextResponse.redirect(new URL("/signup", request.url));

  const auth = await getAuth();
  if (auth?.passwordSet) {
    await claimGuestLove(createAdminClient(), auth.userId, token).catch(() => false);
    return NextResponse.redirect(new URL("/start", request.url));
  }
  const res = NextResponse.redirect(new URL("/signup", request.url));
  res.cookies.set(GUEST_CLAIM_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_KEEP_DAYS * 86400,
  });
  return res;
}
