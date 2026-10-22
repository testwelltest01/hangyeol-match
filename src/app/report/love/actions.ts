"use server";

import { getAdmin } from "@/lib/admin/auth";
import { LOVE_VERSION } from "@/lib/love/items";
import { scoreLove, validateLove } from "@/lib/love/score";
import { overLoveCap, startLoveReport } from "@/lib/love/server";
import { getProgress } from "@/lib/progress";
import { allow } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

/** 검사(다시 검사 포함)를 낼 수 있는 횟수: 24시간에 이만큼. 저장에 성공한 검사만 센다 (DB의 love_reports 줄 수) */
const SUBMITS_PER_DAY = 3;

type DbError = { code?: string; message?: string } | null;

/** 저장 실패를 로그에 남긴다 (Vercel 함수 로그) */
function logDbError(where: string, error: DbError) {
  if (error) console.error(`love ${where} failed`, error.code, error.message);
}

/** 오류 코드로 짐작한 원인. 대부분 Supabase에 SQL을 아직 실행하지 않은 경우다 */
function schemaHint(error: DbError): string {
  const code = error?.code ?? "";
  if (code === "23514") return "동의 종류에 love_report가 없어요. Supabase SQL Editor에서 0002_love_report.sql을 실행해 주세요.";
  if (code === "42P01" || code === "PGRST205") return "love_reports 표가 없어요. 0002_love_report.sql과 0003_love_retest.sql을 차례로 실행해 주세요.";
  if (code === "42703" || code === "PGRST204") return "love_reports에 id 칸이 없어요. 0003_love_retest.sql을 실행해 주세요.";
  return "";
}

/**
 * 저장 실패 문구. 회원에게는 짧은 안내만, 관리자 계정에는 원인(오류 코드·내용과 짐작한 해결 방법)을 함께 보여준다
 * (로그를 열지 않고도 SQL 미적용 같은 설정 문제를 바로 알 수 있게)
 */
async function failText(where: string, error: DbError, text: string): Promise<string> {
  logDbError(where, error);
  if (!error || !(await getAdmin())) return text;
  const hint = schemaHint(error);
  return `${text}\n[관리자에게만 보여요] ${where}: ${error.code ?? ""} ${error.message ?? ""}${hint ? `\n→ ${hint}` : ""}`;
}

const CAP_ERROR = "오늘은 보고서 요청이 많아 다 쓰지 못했어요. 내일 이 화면에서 '다시 쓰기'를 눌러주세요.";
const BUSY_ERROR = "지금 보고서를 쓰고 있어요. 다 쓴 뒤에 다시 검사할 수 있어요.";

/**
 * 연애 상황 검사 제출 (처음·다시 검사 모두): 답을 검사·채점해 새 줄로 저장하고, 응답 뒤 AI가 보고서를 쓰기 시작한다.
 * 이전 결과는 지우지 않는다(재검사 분석용, 화면에는 가장 최근 보고서). 국외 이전 동의 필수, 저장된 검사 기준 24시간에 3번까지
 * (저장에 실패한 시도는 세지 않는다. allow()는 연타·자동 요청만 막는다).
 * '쓰는 중'은 한 사람에 하나만(DB 부분 유일 인덱스). 하루 상한이 찼으면 답만 저장하고 실패로 둔다 (다음 날 '다시 쓰기')
 */
export async function submitLoveTest(answers: unknown, agree: unknown): Promise<Result> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "로그인이 풀렸어요. 다시 로그인해주세요." };
  if ((await getProgress(userId)) !== "report") return { ok: false, error: "기본 검사를 먼저 마쳐주세요." };
  if (agree !== true) return { ok: false, error: "보고서를 쓰려면 동의가 필요해요." };
  const valid = validateLove(answers);
  if (!valid) return { ok: false, error: "모든 문항에 답해주세요." };

  if (!(await allow(`love-burst:${userId}`, 10, 600))) return { ok: false, error: "요청이 너무 많아요. 잠시 후 다시 시도해주세요." };

  const admin = createAdminClient();
  const { data: busy } = await admin.from("love_reports").select("id").eq("user_id", userId).eq("status", "pending").limit(1);
  if (busy?.length) return { ok: false, error: BUSY_ERROR };
  const { count: today, error: countError } = await admin
    .from("love_reports")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", new Date(Date.now() - 86400_000).toISOString());
  logDbError("count", countError);
  if ((today ?? 0) >= SUBMITS_PER_DAY) return { ok: false, error: `검사는 하루 ${SUBMITS_PER_DAY}번까지 낼 수 있어요. 내일 다시 해주세요.` };

  const { error: consentError } = await admin.from("consents").upsert({ user_id: userId, kind: "love_report" });
  if (consentError) return { ok: false, error: await failText("consent", consentError, "저장하지 못했어요. 잠시 후 다시 시도해주세요.") };

  const capped = await overLoveCap(admin);
  const { data: row, error } = await admin
    .from("love_reports")
    .insert({
      user_id: userId,
      version: LOVE_VERSION,
      answers: valid,
      scores: scoreLove(valid),
      status: capped ? "failed" : "pending",
      error: capped ? CAP_ERROR : null,
    })
    .select("id")
    .single();
  if (error || !row) {
    // 부분 유일 인덱스 충돌 = 다른 창에서 먼저 냈다
    if (error?.code === "23505") return { ok: false, error: BUSY_ERROR };
    return { ok: false, error: await failText("insert", error, "저장하지 못했어요. 잠시 후 다시 시도해주세요.") };
  }
  if (!capped) startLoveReport(row.id as string);
  return { ok: true };
}

/** 가장 최근 시도가 실패했으면 같은 답으로 다시 쓴다 (검사 횟수에 세지 않는다) */
export async function retryLoveReport(): Promise<Result> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "로그인이 풀렸어요. 다시 로그인해주세요." };
  if (!(await allow(`love-retry:${userId}`, 4, 3600))) return { ok: false, error: "요청이 너무 많아요. 잠시 후 다시 시도해주세요." };

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("love_reports")
    .select("id, status, tries")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!row) return { ok: false, error: "검사를 먼저 마쳐주세요." };
  if (row.status !== "failed") return { ok: true }; // 이미 쓰는 중이거나 다 썼다
  if (await overLoveCap(admin)) return { ok: false, error: "오늘은 보고서 요청이 많아요. 내일 다시 시도해주세요." };

  const { data: claimed, error } = await admin
    .from("love_reports")
    .update({ status: "pending", error: null, tries: (row.tries ?? 1) + 1, started_at: new Date().toISOString(), completed_at: null })
    .eq("id", row.id)
    .eq("status", "failed")
    .select("id");
  if (error) {
    if (error.code === "23505") return { ok: false, error: BUSY_ERROR };
    return { ok: false, error: await failText("retry", error, "다시 쓰지 못했어요. 잠시 후 다시 시도해주세요.") };
  }
  if (claimed?.length) startLoveReport(row.id as string);
  return { ok: true };
}
