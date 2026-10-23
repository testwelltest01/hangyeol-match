import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isGuestToken, newGuestToken } from "@/lib/love/guest";
import type { LoveReport } from "@/lib/love/prompt";
import { loadLoveReports, pickLove } from "@/lib/love/server";

// 연애 상황 보고서를 남에게 보여주는 공유 링크 (/love/s/<열쇠>, DB 0006_love_share.sql love_shares).
// 본인이 켤 때만 만들고 끄면 지운다. 회원은 사람마다 하나라 다시 검사해도 같은 링크가 가장 최근 보고서를 보여주고,
// 가입 전(비회원) 검사는 그 검사마다 하나. 링크로는 보고서 글만 보여준다(검사 점수·닉네임 없음).
// 열쇠는 비회원 검사 열쇠와 같은 꼴(base64url 32자)이고, 본인이 다시 복사할 수 있게 DB에 그대로 둔다.

type Admin = SupabaseClient;
export type ShareOwner = { userId: string } | { reportId: string };
type DbError = { code?: string; message?: string };

export const sharePath = (token: string) => `/love/s/${token}`;
export const isShareToken = isGuestToken;

const ownerColumn = (o: ShareOwner) => ("userId" in o ? (["user_id", o.userId] as const) : (["report_id", o.reportId] as const));

/** 켜져 있는 공유 링크의 열쇠. 없으면 null */
export async function loadShareToken(admin: Admin, owner: ShareOwner): Promise<string | null> {
  const [col, val] = ownerColumn(owner);
  const { data } = await admin.from("love_shares").select("token").eq(col, val).maybeSingle();
  return (data?.token as string | undefined) ?? null;
}

/** 공유 링크 켜기: 이미 있으면 그 열쇠, 없으면 새로 만든다 (동시에 눌려도 unique라 하나만 남는다) */
export async function startShare(admin: Admin, owner: ShareOwner): Promise<{ ok: true; token: string } | { ok: false; error: DbError }> {
  const existing = await loadShareToken(admin, owner);
  if (existing) return { ok: true, token: existing };
  const [col, val] = ownerColumn(owner);
  const token = newGuestToken();
  const { error } = await admin.from("love_shares").insert({ token, [col]: val });
  if (error) {
    if (error.code === "23505") {
      const again = await loadShareToken(admin, owner);
      if (again) return { ok: true, token: again };
    }
    return { ok: false, error };
  }
  return { ok: true, token };
}

/** 공유 링크 끄기 (줄을 지운다. 그 링크로는 더 볼 수 없다) */
export async function stopShare(admin: Admin, owner: ShareOwner): Promise<DbError | null> {
  const [col, val] = ownerColumn(owner);
  const { error } = await admin.from("love_shares").delete().eq(col, val);
  return error;
}

/** 공유 링크로 보여줄 보고서. 없는 링크·꺼진 링크·보여줄 보고서가 없으면 null (어느 경우인지는 드러내지 않는다) */
export async function loadSharedReport(admin: Admin, token: string): Promise<{ report: LoveReport; completedAt: string | null } | null> {
  if (!isShareToken(token)) return null;
  const { data: share } = await admin.from("love_shares").select("user_id, report_id").eq("token", token).maybeSingle();
  if (!share) return null;
  if (share.user_id) {
    // 회원: 지금 보여줄 수 있는 가장 최근 보고서 (새로 쓰는 중이면 그 전 보고서)
    const { lastDone } = pickLove(await loadLoveReports(admin, share.user_id as string));
    return lastDone ? { report: lastDone.report, completedAt: lastDone.completed_at } : null;
  }
  const { data: row } = await admin.from("love_reports").select("report, completed_at").eq("id", share.report_id).maybeSingle();
  return row?.report ? { report: row.report as LoveReport, completedAt: (row.completed_at as string | null) ?? null } : null;
}
