import { NextResponse, type NextRequest } from "next/server";
import { PROGRESS_PATH, getProgress } from "@/lib/progress";
import { getAuth } from "@/lib/supabase/server";

/**
 * 로그인 여부와 진행 상황을 보고 맞는 화면으로 보낸다.
 * - 로그인 전: 가입 화면 (가입 화면에서 로그인으로도 갈 수 있다)
 * - 비밀번호를 아직 안 만든 계정: 비밀번호 만들기
 * - 검사를 마쳤으면 추천 화면
 */
export async function GET(request: NextRequest) {
  const auth = await getAuth();
  if (!auth) return NextResponse.redirect(new URL("/signup", request.url));
  if (!auth.passwordSet) return NextResponse.redirect(new URL("/set-password", request.url));
  const progress = await getProgress(auth.userId);
  const path = progress === "report" ? "/match" : PROGRESS_PATH[progress];
  return NextResponse.redirect(new URL(path, request.url));
}
