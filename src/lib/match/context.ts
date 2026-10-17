import "server-only";
import { loadPair, pairStage } from "@/lib/match/server";
import { allow, TOO_MANY, UUID_RE } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";

/**
 * 두 사람 사이 서버 액션의 공통 확인: 로그인, 입력 타입, 요청 횟수, 이용 정지, 관계.
 * 서버 액션은 누구나 직접 호출할 수 있는 공개 주소라 매번 다시 확인한다.
 */
export async function pairContext(targetId: unknown, limit: { key: string; count: number; seconds: number } = { key: "match", count: 300, seconds: 3600 }) {
  const userId = await getUserId();
  if (!userId) return { error: "로그인이 풀렸어요. 다시 로그인해주세요." } as const;
  if (typeof targetId !== "string" || !UUID_RE.test(targetId) || targetId === userId) {
    return { error: "잘못된 요청이에요." } as const;
  }
  if (!(await allow(`${limit.key}:${userId}`, limit.count, limit.seconds))) return { error: TOO_MANY } as const;
  const admin = createAdminClient();
  const { data: flag } = await admin.from("user_flags").select("suspended_at").eq("user_id", userId).maybeSingle();
  if (flag?.suspended_at) return { error: "신고가 접수되어 지금은 이용할 수 없어요." } as const;
  const pair = await loadPair(admin, userId, targetId);
  return { userId, admin, pair, stage: pairStage(pair) } as const;
}
