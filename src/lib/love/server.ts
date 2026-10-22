import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { after } from "next/server";
import { kstDay } from "@/lib/day";
import { loadExtraResults } from "@/lib/extra/server";
import { EXTRA_TESTS, summarizeExtra } from "@/lib/extra/tests";
import { writeLoveReport } from "@/lib/love/generate";
import { GUEST_KEEP_DAYS, hashGuestToken } from "@/lib/love/guest";
import { PROMPT_VERSION, type LoveContext, type LoveReport } from "@/lib/love/prompt";
import type { LoveAnswers, LoveScores } from "@/lib/love/score";
import { kstDayStartIso } from "@/lib/photo/rules";
import type { Scores } from "@/lib/scoring";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = SupabaseClient;

export type LoveStatus = "pending" | "done" | "failed";

/** 검사 한 번에 한 줄 (다시 검사하면 새 줄). 가입 전 비회원 검사는 user_id가 없다 */
export type LoveRow = {
  id: string;
  user_id: string | null;
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

const COLUMNS = "id, user_id, version, answers, scores, status, report, model, prompt_version, error, tries, created_at, started_at, completed_at";

/** 쓰기 시작한 뒤 이만큼 지나도 '쓰는 중'이면 멈춘 것으로 본다 (AI 응답 제한 240초 + 여유) */
const STALE_MS = 8 * 60_000;
const STALE_ERROR = "보고서를 쓰는 데 너무 오래 걸려서 멈췄어요. 다시 시도해주세요.";

/** 서비스 전체 하루 상한 (비용 보호). 환경 변수로 바꿀 수 있다 */
const dailyCap = () => Number(process.env.LOVE_REPORT_DAILY_CAP) || 300;
/** 그중 비회원(공유 링크) 검사의 하루 상한. 누구나 부를 수 있는 곳이라 따로 낮게 둔다 */
const guestDailyCap = () => Number(process.env.LOVE_GUEST_DAILY_CAP) || 100;

/** 멈춘 '쓰는 중'은 실패로 정리한다 */
async function settleStale(admin: Admin, rows: LoveRow[]): Promise<void> {
  for (const row of rows) {
    if (row.status === "pending" && Date.now() - new Date(row.started_at).getTime() > STALE_MS) {
      await admin.from("love_reports").update({ status: "failed", error: STALE_ERROR }).eq("id", row.id).eq("status", "pending");
      Object.assign(row, { status: "failed", error: STALE_ERROR });
    }
  }
}

/** 내 검사 기록 (최근 순, 최대 20) */
export async function loadLoveReports(admin: Admin, userId: string): Promise<LoveRow[]> {
  const { data } = await admin.from("love_reports").select(COLUMNS).eq("user_id", userId).order("created_at", { ascending: false }).limit(20);
  const rows = (data ?? []) as LoveRow[];
  await settleStale(admin, rows);
  return rows;
}

/** 열쇠로 찾는 검사 하나 (가입 전 비회원 검사. 계정으로 옮긴 뒤에도 열쇠로 볼 수 있다: 가입하러 갔다가 돌아와도 결과 주소가 그대로 열린다) */
export async function loadGuestReport(admin: Admin, token: string): Promise<LoveRow | null> {
  const { data } = await admin.from("love_reports").select(COLUMNS).eq("guest_hash", hashGuestToken(token)).maybeSingle();
  const row = (data ?? null) as LoveRow | null;
  if (row) await settleStale(admin, [row]);
  return row;
}

/**
 * 가입·로그인한 사람에게 비회원 검사를 옮긴다 (가입 전에 공유 링크로 한 검사). 아직 아무 계정에도 옮기지 않은 것만.
 * 검사 때 받은 국외 이전 동의도 그 시각으로 계정에 남긴다. 옮겼으면 true, 옮길 게 없으면 false,
 * 지금은 못 옮기면 null (둘 다 '쓰는 중'이라 한 사람에 쓰는 중 하나 규칙에 걸림 → 다음에 다시)
 */
export async function claimGuestLove(admin: Admin, userId: string, token: string): Promise<boolean | null> {
  const { data, error } = await admin
    .from("love_reports")
    .update({ user_id: userId })
    .eq("guest_hash", hashGuestToken(token))
    .is("user_id", null)
    .select("id, created_at");
  if (error) return error.code === "23505" ? null : false;
  const row = data?.[0];
  if (!row) return false;
  await admin.from("consents").upsert({ user_id: userId, kind: "love_report", agreed_at: row.created_at }, { onConflict: "user_id,kind", ignoreDuplicates: true });
  return true;
}

/** 옮기지 않은 비회원 검사를 지운다 (크론, GUEST_KEEP_DAYS 지난 것). 지운 수 */
export async function purgeGuestLove(admin: Admin): Promise<number> {
  const cutoff = new Date(Date.now() - GUEST_KEEP_DAYS * 86_400_000).toISOString();
  const { data } = await admin.from("love_reports").delete().is("user_id", null).lt("created_at", cutoff).select("id");
  return data?.length ?? 0;
}

/** 가장 최근 시도와, 가장 최근에 다 쓴 보고서 (새로 쓰는 중이거나 실패해도 이전 보고서는 보여준다) */
export function pickLove(rows: LoveRow[]): { latest: LoveRow | null; lastDone: (LoveRow & { report: LoveReport }) | null } {
  const lastDone = rows.find((r): r is LoveRow & { report: LoveReport } => r.status === "done" && r.report !== null) ?? null;
  return { latest: rows[0] ?? null, lastDone };
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

/** 오늘(한국 날짜) 비회원 검사가 비회원 상한을 넘었는지 (실패 제외) */
export async function overGuestCap(admin: Admin): Promise<boolean> {
  const { count } = await admin
    .from("love_reports")
    .select("id", { count: "exact", head: true })
    .is("user_id", null)
    .neq("status", "failed")
    .gte("created_at", kstDayStartIso(kstDay()));
  return (count ?? 0) >= guestDailyCap();
}

/**
 * AI에게 줄 정보 모으기: 성별, 기본 검사 점수, 추가 검사 요약 (닉네임·나이·지역·종교·연락처·사진·자기소개는 읽지 않는다).
 * 비회원이거나 아직 기본 검사 전이면 있는 것만 (연애 상황 검사 점수만으로도 쓴다)
 */
async function collectContext(admin: Admin, userId: string | null, love: LoveScores): Promise<LoveContext> {
  if (!userId) return { gender: null, love, main: null, extraChips: [] };
  const [profile, score, extra] = await Promise.all([
    admin.from("profiles").select("gender").eq("id", userId).maybeSingle(),
    admin.from("test_scores").select("scores").eq("user_id", userId).maybeSingle(),
    loadExtraResults(admin, userId),
  ]);
  const extraChips = EXTRA_TESTS.flatMap((t) => (extra[t.id] ? summarizeExtra(t, extra[t.id]!.scores).chips : []));
  return { gender: profile.data?.gender ?? null, love, main: (score.data?.scores as Scores | undefined) ?? null, extraChips };
}

/** 실제로 쓰기 (응답을 보낸 뒤 after()에서). 그 시도가 '쓰는 중'일 때만 쓰고, 끝나면 완료·실패를 기록한다 */
export async function runLoveReport(admin: Admin, id: string): Promise<void> {
  const fail = (error: string) =>
    admin.from("love_reports").update({ status: "failed", error, completed_at: new Date().toISOString() }).eq("id", id).eq("status", "pending");
  try {
    const { data } = await admin.from("love_reports").select("status, scores, user_id").eq("id", id).maybeSingle();
    if (!data || data.status !== "pending") return;
    const ctx = await collectContext(admin, data.user_id as string | null, data.scores as LoveScores);
    // 남용 감시용 식별자: 회원은 회원 id, 비회원은 검사 id (generate.ts에서 해시해서 보낸다)
    const res = await writeLoveReport(ctx, (data.user_id as string | null) ?? `guest:${id}`);
    if (!res.ok) return void (await fail(res.error));
    await admin
      .from("love_reports")
      .update({ status: "done", report: res.report, model: res.model, prompt_version: PROMPT_VERSION, error: null, completed_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "pending");
  } catch (e) {
    console.error("love report run failed", (e as Error).message);
    await fail("보고서를 쓰지 못했어요. 잠시 후 다시 시도해주세요.");
  }
}

/** 응답 뒤에 쓰기 시작한다. 부르는 화면은 maxDuration 300 */
export function startLoveReport(id: string): void {
  after(() => runLoveReport(createAdminClient(), id));
}

/** user_id가 없으면 가입 전 비회원 검사 */
export type LoveExportRow = { id: string; user_id: string | null; version: string; answers: LoveAnswers; scores: LoveScores; status: LoveStatus; created_at: string };

/** 관리자 집계용: 모든 시도(회원·비회원)의 응답·점수 (오래된 순, 보고서 글은 읽지 않는다) */
export async function loadAllLove(admin: Admin): Promise<LoveExportRow[]> {
  const out: LoveExportRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await admin
      .from("love_reports")
      .select("id, user_id, version, answers, scores, status, created_at")
      .order("created_at")
      .order("id")
      .range(from, from + 999);
    out.push(...((data ?? []) as typeof out));
    if (!data || data.length < 1000) break;
  }
  return out;
}
