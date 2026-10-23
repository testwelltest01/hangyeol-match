import { connection } from "next/server";
import { CHAT_BODY_RETENTION_DAYS } from "@/lib/chat/rules";
import { matchDay } from "@/lib/day";
import { purgeIgCodes, refreshIgToken } from "@/lib/instagram/server";
import { purgeGuestLove } from "@/lib/love/server";
import { purgeApiUsage } from "@/lib/usage/server";
import { generateRecommendations } from "@/lib/match/server";
import { pushMessages } from "@/lib/push/rules";
import { sendPushMany } from "@/lib/push/server";
import { safeEqual } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";

// Vercel Cron이 매일 한국 시간 저녁 8시 무렵(11:00 UTC, Hobby 요금제는 1시간 안에) 부른다 (vercel.json).
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
  // 저녁 8시에 넘어간 새 추천 하루 (크론보다 먼저 들어온 사람은 그때 이미 만들어졌다)
  const day = matchDay();
  const { created, perViewer } = await generateRecommendations(admin, day);
  // 새 추천을 받은 사람에게 알림 (알림을 켠 사람만. 이미 들어와서 추천을 본 사람은 여기 없다)
  const notified = await sendPushMany(
    admin,
    new Map([...perViewer].map(([userId, count]) => [userId, pushMessages.dailyRecommendations(count)])),
  ).catch(() => 0);

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
  // 대화 내용은 마지막 대화 후 90일이 지나면 지운다 (확인 중인 신고가 있으면 남김)
  const { data: chatPurged } = await admin.rpc("purge_chat_bodies", { p_days: CHAT_BODY_RETENTION_DAYS });
  // 방문 기록은 처리방침의 '접속 로그 3개월'에 맞춰 90일 뒤 지운다
  await admin.from("activity_events").delete().lt("created_at", new Date(Date.now() - 90 * 86_400_000).toISOString());
  // 가입하지 않은(계정으로 옮기지 않은) 비회원 연애 상황 검사는 30일 뒤 지운다 (처리방침의 보유기간)
  const loveGuestPurged = await purgeGuestLove(admin).catch(() => 0);
  // API 호출 기록(관리자 'API 사용량')은 400일 뒤 지운다 (회원을 가리키는 값은 없다)
  const apiUsagePurged = await purgeApiUsage(admin).catch(() => 0);
  // 인스타 확인: 하루 지난 코드는 지우고(처리방침), 공식 계정 토큰(60일)은 7일마다 새로 받는다
  const igCodesPurged = await purgeIgCodes(admin).catch(() => 0);
  const igToken = process.env.INSTAGRAM_ACCESS_TOKEN ? (await refreshIgToken(admin).catch(() => ({ ok: false, message: "error" }))).message : null;

  return Response.json({ day, created, notified, purged, chatPurged: chatPurged ?? 0, loveGuestPurged, apiUsagePurged, igCodesPurged, igToken });
}
