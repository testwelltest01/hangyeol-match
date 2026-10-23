import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UsageRow } from "@/lib/usage/stats";
import type { Endpoint, Purpose, Usage } from "@/lib/usage/usage";

// OpenAI API 호출 기록 (DB 0007_api_usage.sql). 부르는 곳: 사진 피드백, 그림 프로필, 연애 보고서, 장면 사진.
// 기록이 실패해도(표가 아직 없거나 DB 장애) 본래 일은 막지 않는다.

let warned = false;

export async function logApiUsage(e: {
  purpose: Purpose;
  endpoint: Endpoint;
  model: string;
  ok: boolean;
  usage: Usage | null;
  durationMs: number;
  /** 기능 1건으로 셀 호출인지 (기본 true, 연애 보고서 두 번째 호출은 false) */
  unit?: boolean;
  error?: string;
}): Promise<void> {
  try {
    const { error } = await createAdminClient()
      .from("api_usage")
      .insert({
        purpose: e.purpose,
        endpoint: e.endpoint,
        model: e.model.slice(0, 100),
        ok: e.ok,
        unit: e.unit ?? true,
        input_tokens: e.usage?.inputTokens ?? null,
        cached_tokens: e.usage?.cachedTokens ?? null,
        output_tokens: e.usage?.outputTokens ?? null,
        input_text_tokens: e.usage?.inputTextTokens ?? null,
        input_image_tokens: e.usage?.inputImageTokens ?? null,
        output_image_tokens: e.usage?.outputImageTokens ?? null,
        reasoning_tokens: e.usage?.reasoningTokens ?? null,
        duration_ms: Math.max(0, Math.round(e.durationMs)),
        error: e.error ? e.error.slice(0, 200) : null,
      });
    if (error && !warned) {
      warned = true;
      console.warn("api usage log failed (0007_api_usage.sql을 실행했는지 확인)", error.code, error.message);
    }
  } catch {
    // 기록 실패는 무시
  }
}

/** 관리자 화면용: since 이후 기록 (오래된 순, 1000줄씩 끝까지) */
export async function loadUsageRows(admin: SupabaseClient, since: string): Promise<{ rows: UsageRow[]; missing: boolean }> {
  const rows: UsageRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from("api_usage")
      .select(
        "at, purpose, endpoint, model, ok, unit, input_tokens, cached_tokens, output_tokens, input_text_tokens, input_image_tokens, output_image_tokens, reasoning_tokens, duration_ms",
      )
      .gte("at", since)
      .order("at")
      .order("id")
      .range(from, from + 999);
    if (error) return { rows, missing: error.code === "42P01" || error.code === "PGRST205" };
    rows.push(...((data ?? []) as UsageRow[]));
    if (!data || data.length < 1000) break;
  }
  return { rows, missing: false };
}

/** 최근 실패 몇 개 (관리자 화면에서 원인 보기) */
export async function loadRecentFailures(admin: SupabaseClient, since: string, limit = 10) {
  const { data } = await admin
    .from("api_usage")
    .select("at, purpose, model, error")
    .eq("ok", false)
    .gte("at", since)
    .order("at", { ascending: false })
    .limit(limit);
  return (data ?? []) as { at: string; purpose: string; model: string; error: string | null }[];
}

/** 크론: 400일 지난 기록 지우기. 지운 수 */
export async function purgeApiUsage(admin: SupabaseClient): Promise<number> {
  const cutoff = new Date(Date.now() - 400 * 86_400_000).toISOString();
  const { data } = await admin.from("api_usage").delete().lt("at", cutoff).select("id");
  return data?.length ?? 0;
}
