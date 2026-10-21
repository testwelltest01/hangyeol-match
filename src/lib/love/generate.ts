import "server-only";

// 연애 상황 보고서를 OpenAI Chat Completions + Structured Outputs(JSON schema, strict)로 쓴다.
// 환경 변수: OPENAI_API_KEY, OPENAI_REPORT_MODEL(없으면 OPENAI_VISION_MODEL), (선택) OPENAI_TEMPERATURE

import { createHash } from "node:crypto";
import { buildUserInput, parseLoveReport, RESPONSE_SCHEMA, SYSTEM_PROMPT, type LoveContext, type LoveReport } from "@/lib/love/prompt";

export type GenerateResult = { ok: true; report: LoveReport; model: string } | { ok: false; error: string };

export const reportModel = () => process.env.OPENAI_REPORT_MODEL || process.env.OPENAI_VISION_MODEL || "";

export async function writeLoveReport(ctx: LoveContext, userId: string): Promise<GenerateResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = reportModel();
  if (!apiKey || !model) return { ok: false, error: "AI 설정이 아직 안 돼 있어요. 잠시 후 다시 시도해주세요." };

  const body: Record<string, unknown> = {
    model,
    response_format: { type: "json_schema", json_schema: RESPONSE_SCHEMA },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserInput(ctx) },
    ],
    // 남용 감시용 식별자 (회원 id를 그대로 보내지 않고 해시로, 그림 프로필과 같은 방식)
    safety_identifier: createHash("sha256").update(`hangyeol:${userId}`).digest("hex"),
  };
  const temperature = process.env.OPENAI_TEMPERATURE;
  if (temperature && temperature.toLowerCase() !== "none") body.temperature = Number(temperature);

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(240_000),
    });
  } catch {
    return { ok: false, error: "AI 응답이 너무 늦어요. 잠시 후 다시 시도해주세요." };
  }
  if (!res.ok) {
    console.error("love report failed", res.status, (await res.text().catch(() => "")).slice(0, 500));
    return { ok: false, error: "AI가 보고서를 쓰지 못했어요. 잠시 후 다시 시도해주세요." };
  }

  const json = (await res.json()) as { model?: string; choices?: { message?: { content?: string | null; refusal?: string | null } }[] };
  const msg = json.choices?.[0]?.message;
  if (msg?.refusal) return { ok: false, error: "AI가 보고서를 쓰지 못했어요. 잠시 후 다시 시도해주세요." };
  let report: LoveReport | null = null;
  try {
    report = parseLoveReport(JSON.parse(msg?.content ?? "{}"));
  } catch {
    report = null;
  }
  if (!report) return { ok: false, error: "보고서가 덜 써졌어요. 다시 시도해주세요." };
  return { ok: true, report, model: json.model ?? model };
}
