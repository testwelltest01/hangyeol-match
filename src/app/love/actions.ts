"use server";

import { hashGuestToken, isGuestToken, newGuestToken } from "@/lib/love/guest";
import { LOVE_VERSION } from "@/lib/love/items";
import { scoreLove, validateLove } from "@/lib/love/score";
import { overGuestCap, overLoveCap, startLoveReport } from "@/lib/love/server";
import { allow, clientIp, TOO_MANY } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";

type SubmitResult = { ok: true; token: string } | { ok: false; error: string };
type Result = { ok: true } | { ok: false; error: string };

const CAP_ERROR = "오늘은 보고서 요청이 많아 다 쓰지 못했어요. 내일 이 화면에서 '다시 쓰기'를 눌러주세요.";

/**
 * 가입 전(비회원) 연애 상황 검사 제출. 공유 링크로 들어온 누구나 부를 수 있어서:
 * 동의 3가지(만 19세 이상, 개인정보 수집·이용, 국외 이전)를 서버에서 다시 확인하고, IP마다 하루 5번·10분 5번, 비회원 하루 상한을 둔다.
 * 비밀 열쇠를 만들어 돌려주고(결과 주소), DB에는 해시만 둔다. 로그인한 채로 냈으면 바로 그 계정 검사로 남긴다
 */
export async function submitGuestLoveTest(answers: unknown, agree: unknown): Promise<SubmitResult> {
  const a = (agree ?? {}) as Record<string, unknown>;
  if (a.age !== true || a.privacy !== true || a.overseas !== true) return { ok: false, error: "보고서를 받으려면 세 가지 모두 동의가 필요해요." };
  const valid = validateLove(answers);
  if (!valid) return { ok: false, error: "모든 문항에 답해주세요." };

  const ip = await clientIp();
  if (!(await allow(`love-guest-burst:${ip}`, 5, 600)) || !(await allow(`love-guest:${ip}`, 5, 86400))) return { ok: false, error: TOO_MANY };

  const admin = createAdminClient();
  const userId = await getUserId();
  if (userId) {
    const { data: busy } = await admin.from("love_reports").select("id").eq("user_id", userId).eq("status", "pending").limit(1);
    if (busy?.length) return { ok: false, error: "지금 보고서를 쓰고 있어요. 다 쓴 뒤에 다시 검사할 수 있어요." };
  }
  const capped = (await overLoveCap(admin)) || (!userId && (await overGuestCap(admin)));

  const token = newGuestToken();
  const { data: row, error } = await admin
    .from("love_reports")
    .insert({
      user_id: userId,
      guest_hash: hashGuestToken(token),
      version: LOVE_VERSION,
      answers: valid,
      scores: scoreLove(valid),
      status: capped ? "failed" : "pending",
      error: capped ? CAP_ERROR : null,
    })
    .select("id")
    .single();
  if (error || !row) {
    console.error("love guest insert failed", error?.code, error?.message);
    return { ok: false, error: "저장하지 못했어요. 잠시 후 다시 시도해주세요." };
  }
  if (userId) await admin.from("consents").upsert({ user_id: userId, kind: "love_report" });
  if (!capped) startLoveReport(row.id as string);
  return { ok: true, token };
}

/** 비회원 검사의 보고서 쓰기가 실패했으면 같은 답으로 다시 쓴다 (열쇠가 있어야 한다) */
export async function retryGuestLoveReport(token: unknown): Promise<Result> {
  if (!isGuestToken(token)) return { ok: false, error: "잘못된 요청이에요." };
  const ip = await clientIp();
  if (!(await allow(`love-guest-retry:${ip}`, 4, 3600))) return { ok: false, error: TOO_MANY };

  const admin = createAdminClient();
  const { data: row } = await admin.from("love_reports").select("id, status, tries, user_id").eq("guest_hash", hashGuestToken(token)).maybeSingle();
  if (!row) return { ok: false, error: "보고서를 찾지 못했어요." };
  if (row.status !== "failed") return { ok: true };
  if ((await overLoveCap(admin)) || (!row.user_id && (await overGuestCap(admin)))) {
    return { ok: false, error: "오늘은 보고서 요청이 많아요. 내일 다시 시도해주세요." };
  }
  const { data: claimed } = await admin
    .from("love_reports")
    .update({ status: "pending", error: null, tries: (row.tries ?? 1) + 1, started_at: new Date().toISOString(), completed_at: null })
    .eq("id", row.id)
    .eq("status", "failed")
    .select("id");
  if (claimed?.length) startLoveReport(row.id as string);
  return { ok: true };
}
