import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { after } from "next/server";
import { kstDay } from "@/lib/day";
import { loadExtraResults } from "@/lib/extra/server";
import { EXTRA_TESTS, summarizeExtra } from "@/lib/extra/tests";
import { writeLoveReport } from "@/lib/love/generate";
import { PROMPT_VERSION, type LoveContext, type LoveReport } from "@/lib/love/prompt";
import type { LoveAnswers, LoveScores } from "@/lib/love/score";
import { kstDayStartIso } from "@/lib/photo/rules";
import type { Scores } from "@/lib/scoring";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = SupabaseClient;

export type LoveStatus = "pending" | "done" | "failed";

export type LoveRow = {
  version: string;
  answers: LoveAnswers;
  scores: LoveScores;
  status: LoveStatus;
  report: LoveReport | null;
  model: string | null;
  prompt_version: string | null;
  error: string | null;
  tries: number;
  created_at: string;
  started_at: string;
  completed_at: string | null;
};

const COLUMNS = "version, answers, scores, status, report, model, prompt_version, error, tries, created_at, started_at, completed_at";

/** 쓰기 시작한 뒤 이만큼 지나도 '쓰는 중'이면 멈춘 것으로 본다 (AI 응답 제한 240초 + 여유) */
const STALE_MS = 8 * 60_000;
const STALE_ERROR = "보고서를 쓰는 데 너무 오래 걸려서 멈췄어요. 다시 시도해주세요.";

/** 서비스 전체 하루 상한 (비용 보호). 환경 변수로 바꿀 수 있다 */
const dailyCap = () => Number(process.env.LOVE_REPORT_DAILY_CAP) || 300;

/** 내 보고서 (없으면 null). 멈춘 '쓰는 중'은 실패로 정리한다 */
export async function loadLoveReport(admin: Admin, userId: string): Promise<LoveRow | null> {
  const { data } = await admin.from("love_reports").select(COLUMNS).eq("user_id", userId).maybeSingle();
  const row = (data ?? null) as LoveRow | null;
  if (row?.status === "pending" && Date.now() - new Date(row.started_at).getTime() > STALE_MS) {
    await admin.from("love_reports").update({ status: "failed", error: STALE_ERROR }).eq("user_id", userId).eq("status", "pending");
    Object.assign(row, { status: "failed", error: STALE_ERROR });
  }
  return row;
}

/** 오늘(한국 날짜) 쓰기 시작한 보고서가 상한을 넘었는지 (실패 제외) */
export async function overLoveCap(admin: Admin): Promise<boolean> {
  const { count } = await admin
    .from("love_reports")
    .select("user_id", { count: "exact", head: true })
    .neq("status", "failed")
    .gte("started_at", kstDayStartIso(kstDay()));
  return (count ?? 0) >= dailyCap();
}

/** AI에게 줄 정보 모으기: 성별, 기본 검사 점수, 추가 검사 요약 (닉네임·나이·지역·종교·연락처·사진·자기소개는 읽지 않는다) */
async function collectContext(admin: Admin, userId: string, love: LoveScores): Promise<LoveContext | null> {
  const [profile, score, extra] = await Promise.all([
    admin.from("profiles").select("gender").eq("id", userId).maybeSingle(),
    admin.from("test_scores").select("scores").eq("user_id", userId).maybeSingle(),
    loadExtraResults(admin, userId),
  ]);
  if (!profile.data || !score.data) return null;
  const extraChips = EXTRA_TESTS.flatMap((t) => (extra[t.id] ? summarizeExtra(t, extra[t.id]!.scores).chips : []));
  return { gender: profile.data.gender, love, main: score.data.scores as Scores, extraChips };
}

/** 실제로 쓰기 (응답을 보낸 뒤 after()에서). '쓰는 중'일 때만 쓰고, 끝나면 완료·실패를 기록한다 */
export async function runLoveReport(admin: Admin, userId: string): Promise<void> {
  const fail = (error: string) =>
    admin.from("love_reports").update({ status: "failed", error, completed_at: new Date().toISOString() }).eq("user_id", userId).eq("status", "pending");
  try {
    const { data } = await admin.from("love_reports").select("status, scores").eq("user_id", userId).maybeSingle();
    if (!data || data.status !== "pending") return;
    const ctx = await collectContext(admin, userId, data.scores as LoveScores);
    if (!ctx) return void (await fail("기본 검사 결과를 찾지 못했어요."));
    const res = await writeLoveReport(ctx, userId);
    if (!res.ok) return void (await fail(res.error));
    await admin
      .from("love_reports")
      .update({ status: "done", report: res.report, model: res.model, prompt_version: PROMPT_VERSION, error: null, completed_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("status", "pending");
  } catch (e) {
    console.error("love report run failed", (e as Error).message);
    await fail("보고서를 쓰지 못했어요. 잠시 후 다시 시도해주세요.");
  }
}

/** 응답 뒤에 쓰기 시작한다. 부르는 화면은 maxDuration 300 */
export function startLoveReport(userId: string): void {
  after(() => runLoveReport(createAdminClient(), userId));
}

/** 관리자 집계용: 모든 회원의 응답·점수 (보고서 글은 읽지 않는다) */
export async function loadAllLove(admin: Admin): Promise<{ user_id: string; version: string; answers: LoveAnswers; scores: LoveScores; status: LoveStatus; created_at: string }[]> {
  const out: { user_id: string; version: string; answers: LoveAnswers; scores: LoveScores; status: LoveStatus; created_at: string }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await admin
      .from("love_reports")
      .select("user_id, version, answers, scores, status, created_at")
      .order("created_at")
      .range(from, from + 999);
    out.push(...((data ?? []) as typeof out));
    if (!data || data.length < 1000) break;
  }
  return out;
}
