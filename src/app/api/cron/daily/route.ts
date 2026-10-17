import { connection } from "next/server";
import { CHAT_BODY_RETENTION_DAYS } from "@/lib/chat/rules";
import { kstDay } from "@/lib/day";
import { generateRecommendations } from "@/lib/match/server";
import { safeEqual } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";

// Vercel Cron이 매일 한국 시간 자정 무렵 부른다 (vercel.json).
// CRON_SECRET 환경 변수를 넣어두면 Vercel이 Authorization: Bearer <값>을 붙여 보낸다. 다른 사람은 부를 수 없다.
export const maxDuration = 300;

/** 교체한 사진은 1년 뒤 파일을 지운다 (처리방침의 보관기간, 신고 확인용) */
const KEEP_REPLACED_DAYS = 365;

export async function GET(request: Request) {
  await connection();
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const day = kstDay();
  const created = await generateRecommendations(admin, day);

  // 1년 지난 교체 사진 파일 삭제
  const cutoff = new Date(Date.now() - KEEP_REPLACED_DAYS * 86_400_000).toISOString();
  const { data: old } = await admin
    .from("photos")
    .select("id, path")
    .lt("replaced_at", cutoff)
    .is("purged_at", null)
    .limit(500);
  let purged = 0;
  if (old?.length) {
    const { error } = await admin.storage.from("photos").remove(old.map((p) => p.path));
    if (!error) {
      await admin
        .from("photos")
        .update({ purged_at: new Date().toISOString() })
        .in("id", old.map((p) => p.id));
      purged = old.length;
    }
  }

  // 하루 지난 요청 횟수 기록 정리
  await admin.from("rate_limits").delete().lt("window_start", new Date(Date.now() - 86_400_000).toISOString());
  // 대화 내용은 마지막 대화 후 90일이 지나면 지운다 (확인 중인 신고가 있으면 남김, 0005 전이면 조용히 실패)
  const { data: chatPurged } = await admin.rpc("purge_chat_bodies", { p_days: CHAT_BODY_RETENTION_DAYS });
  // 방문 기록은 처리방침의 '접속 로그 3개월'에 맞춰 90일 뒤 지운다 (0003 전이면 조용히 실패)
  await admin.from("activity_events").delete().lt("created_at", new Date(Date.now() - 90 * 86_400_000).toISOString());

  return Response.json({ day, created, purged, chatPurged: chatPurged ?? 0 });
}
