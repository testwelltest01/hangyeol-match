"use server";

import { isIgCode } from "@/lib/instagram/rules";
import { claimIgCode, type ClaimResult } from "@/lib/instagram/server";
import { allow, clientIp, TOO_MANY } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";

/** 인스타 확인: 한결 인스타 DM으로 받은 6자리 코드를 넣는다 (src/lib/instagram) */
export async function verifyInstagram(code: unknown): Promise<ClaimResult> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "로그인이 풀렸어요. 다시 로그인해주세요." };
  // 코드 맞히기를 막는다: 사람마다 10분에 8번, IP마다 1시간에 30번
  if (!(await allow(`ig-verify:${userId}`, 8, 600)) || !(await allow(`ig-verify-ip:${await clientIp()}`, 30, 3600))) {
    return { ok: false, error: TOO_MANY };
  }
  if (!isIgCode(code)) return { ok: false, error: "코드 6자리를 넣어주세요." };
  try {
    return await claimIgCode(createAdminClient(), userId, code);
  } catch (e) {
    console.error("[instagram] claim failed", e);
    return { ok: false, error: "확인하지 못했어요. 잠시 후 다시 시도해주세요." };
  }
}
