"use server";

import { getAdmin } from "@/lib/admin/auth";
import { refreshIgToken, subscribeIgWebhooks } from "@/lib/instagram/server";
import { allow, TOO_MANY, UUID_RE } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";

type Result = { ok: true } | { ok: false; error: string };

/** 관리자 확인 + 요청 횟수 제한. 서버 액션은 공개 주소라 매번 확인한다 */
async function guard(): Promise<{ error: string } | { userId: string }> {
  const me = await getAdmin();
  if (!me) return { error: "권한이 없어요." };
  if (!(await allow(`admin:${me.userId}`, 120, 60))) return { error: TOO_MANY };
  return { userId: me.userId };
}

/** 이용 정지 / 정지 해제. 정지하면 추천에서 빠지고 관심·수락을 할 수 없다 */
export async function setSuspended(userId: string, suspended: boolean): Promise<Result> {
  const g = await guard();
  if ("error" in g) return { ok: false, error: g.error };
  if (typeof userId !== "string" || !UUID_RE.test(userId) || typeof suspended !== "boolean") {
    return { ok: false, error: "잘못된 요청이에요." };
  }
  const now = new Date().toISOString();
  const { error } = await createAdminClient()
    .from("user_flags")
    .upsert({ user_id: userId, suspended_at: suspended ? now : null, reason: suspended ? "운영자 정지" : null, updated_at: now });
  if (error) return { ok: false, error: "저장하지 못했어요." };
  console.info(`[admin] ${g.userId} ${suspended ? "suspended" : "unsuspended"} ${userId}`);
  return { ok: true };
}

/** 신고 확인 완료. 확인한 신고는 자동 정지 계산에서 빠진다 */
export async function resolveReport(reportId: number): Promise<Result> {
  const g = await guard();
  if ("error" in g) return { ok: false, error: g.error };
  if (!Number.isSafeInteger(reportId) || reportId <= 0) return { ok: false, error: "잘못된 요청이에요." };
  const { error } = await createAdminClient()
    .from("reports")
    .update({ resolved_at: new Date().toISOString() })
    .eq("id", reportId)
    .is("resolved_at", null);
  if (error) return { ok: false, error: "저장하지 못했어요." };
  return { ok: true };
}

/** 인스타 확인: 공식 계정이 DM 알림(웹훅)을 받도록 메타 앱에 연결한다 (src/lib/instagram/server.ts) */
export async function subscribeInstagram(): Promise<{ ok: boolean; message: string }> {
  const g = await guard();
  if ("error" in g) return { ok: false, message: g.error };
  return subscribeIgWebhooks(createAdminClient());
}

/** 인스타 확인: 공식 계정 토큰을 지금 갱신한다 (평소에는 크론이 7일마다) */
export async function refreshInstagramToken(): Promise<{ ok: boolean; message: string }> {
  const g = await guard();
  if ("error" in g) return { ok: false, message: g.error };
  return refreshIgToken(createAdminClient(), true);
}
