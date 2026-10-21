"use server";

import { LOVE_VERSION } from "@/lib/love/items";
import { scoreLove, validateLove } from "@/lib/love/score";
import { overLoveCap, startLoveReport } from "@/lib/love/server";
import { getProgress } from "@/lib/progress";
import { allow, TOO_MANY } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

const CAP_ERROR = "오늘은 보고서 요청이 많아 다 쓰지 못했어요. 내일 이 화면에서 '다시 쓰기'를 눌러주세요.";

/**
 * 연애 상황 검사 제출: 답을 검사·채점해 저장하고, 응답 뒤 AI가 보고서를 쓰기 시작한다.
 * 계정당 한 번(이미 낸 답이 있으면 거절, 동시에 눌러도 user_id 기본 키로 하나만 들어간다). 국외 이전 동의 필수.
 * 하루 상한이 찼으면 답만 저장하고 실패로 둔다 (다음 날 '다시 쓰기')
 */
export async function submitLoveTest(answers: unknown, agree: unknown): Promise<Result> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "로그인이 풀렸어요. 다시 로그인해주세요." };
  if ((await getProgress(userId)) !== "report") return { ok: false, error: "기본 검사를 먼저 마쳐주세요." };
  if (agree !== true) return { ok: false, error: "보고서를 쓰려면 동의가 필요해요." };
  const valid = validateLove(answers);
  if (!valid) return { ok: false, error: "모든 문항에 답해주세요." };
  if (!(await allow(`love-submit:${userId}`, 5, 3600))) return { ok: false, error: TOO_MANY };

  const admin = createAdminClient();
  const { data: existing } = await admin.from("love_reports").select("status").eq("user_id", userId).maybeSingle();
  if (existing) return { ok: false, error: "이미 검사를 마쳤어요. 보고서는 계정당 한 번 써 드려요." };

  const { error: consentError } = await admin
    .from("consents")
    .upsert({ user_id: userId, kind: "love_report" }, { onConflict: "user_id,kind", ignoreDuplicates: true });
  if (consentError) return { ok: false, error: "저장하지 못했어요. 잠시 후 다시 시도해주세요." };

  const capped = await overLoveCap(admin);
  const { error } = await admin.from("love_reports").insert({
    user_id: userId,
    version: LOVE_VERSION,
    answers: valid,
    scores: scoreLove(valid),
    status: capped ? "failed" : "pending",
    error: capped ? CAP_ERROR : null,
  });
  if (error) {
    // 기본 키 충돌 = 다른 창에서 먼저 냈다
    if (error.code === "23505") return { ok: false, error: "이미 검사를 마쳤어요. 보고서는 계정당 한 번 써 드려요." };
    return { ok: false, error: "저장하지 못했어요. 잠시 후 다시 시도해주세요." };
  }
  if (!capped) startLoveReport(userId);
  return { ok: true };
}

/** 실패한 보고서를 같은 답으로 다시 쓴다 (실패는 '한 번'에 세지 않는다) */
export async function retryLoveReport(): Promise<Result> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "로그인이 풀렸어요. 다시 로그인해주세요." };
  if (!(await allow(`love-retry:${userId}`, 4, 3600))) return { ok: false, error: TOO_MANY };

  const admin = createAdminClient();
  const { data: row } = await admin.from("love_reports").select("status, tries").eq("user_id", userId).maybeSingle();
  if (!row) return { ok: false, error: "검사를 먼저 마쳐주세요." };
  if (row.status !== "failed") return { ok: true }; // 이미 쓰는 중이거나 다 썼다
  if (await overLoveCap(admin)) return { ok: false, error: "오늘은 보고서 요청이 많아요. 내일 다시 시도해주세요." };

  const { data: claimed } = await admin
    .from("love_reports")
    .update({ status: "pending", error: null, tries: (row.tries ?? 1) + 1, started_at: new Date().toISOString(), completed_at: null })
    .eq("user_id", userId)
    .eq("status", "failed")
    .select("user_id");
  if (claimed?.length) startLoveReport(userId);
  return { ok: true };
}
