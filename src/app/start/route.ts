import { NextResponse, type NextRequest } from "next/server";
import { PROGRESS_PATH, getProgress } from "@/lib/progress";
import { getUserId } from "@/lib/supabase/server";

/** 로그인 여부와 진행 상황을 보고 맞는 화면으로 보낸다. 검사를 마쳤으면 추천 화면으로 */
export async function GET(request: NextRequest) {
  const userId = await getUserId();
  const progress = await getProgress(userId);
  const path = progress === "report" ? "/match" : PROGRESS_PATH[progress];
  return NextResponse.redirect(new URL(path, request.url));
}
