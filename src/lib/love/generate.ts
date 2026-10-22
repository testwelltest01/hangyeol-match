import "server-only";

// 연애 상황 보고서를 OpenAI Chat Completions + Structured Outputs(JSON schema, strict)로 쓴다.
// 장면마다 대화 예시가 들어가 한 번에 쓰면 오래 걸려서, 두 번에 나눠 동시에 부르고 합친다 (prompt.ts RESPONSE_SCHEMAS).
// 환경 변수: OPENAI_API_KEY, OPENAI_REPORT_MODEL(없으면 OPENAI_VISION_MODEL), (선택) OPENAI_TEMPERATURE

import { createHash } from "node:crypto";
import {
  buildUserInput,
  mergeParts,
  parseLoveReport,
  partInstruction,
  RESPONSE_SCHEMAS,
  SYSTEM_PROMPT,
  type LoveContext,
  type LoveReport,
} from "@/lib/love/prompt";

export type GenerateResult = { ok: true; report: LoveReport; model: string } | { ok: false; error: string };

export const reportModel = () => process.env.OPENAI_REPORT_MODEL || process.env.OPENAI_VISION_MODEL || "";

const LATE = "AI 응답이 너무 늦어요. 잠시 후 다시 시도해주세요.";
const FAILED = "AI가 보고서를 쓰지 못했어요. 잠시 후 다시 시도해주세요.";

type PartResult = { ok: true; data: unknown; model: string | undefined } | { ok: false; error: string };

async function writePart(apiKey: string, model: string, input: string, part: number, safetyId: string): Promise<PartResult> {
  const body: Record<string, unknown> = {
    model,
    response_format: { type: "json_schema", json_schema: RESPONSE_SCHEMAS[part] },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: input + partInstruction(part) },
    ],
    safety_identifier: safetyId,
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
    return { ok: false, error: LATE };
  }
  if (!res.ok) {
    console.error("love report failed", part, res.status, (await res.text().catch(() => "")).slice(0, 500));
    return { ok: false, error: FAILED };
  }
  const json = (await res.json().catch(() => null)) as { model?: string; choices?: { message?: { content?: string | null; refusal?: string | null } }[] } | null;
  const msg = json?.choices?.[0]?.message;
  if (!msg || msg.refusal) return { ok: false, error: FAILED };
  try {
    return { ok: true, data: JSON.parse(msg.content ?? "{}"), model: json?.model };
  } catch {
    return { ok: false, error: "보고서가 덜 써졌어요. 다시 시도해주세요." };
  }
}

/** who: 남용 감시용 식별자 재료 (회원 id 또는 'guest:<검사 id>', 해시해서 보낸다) */
export async function writeLoveReport(ctx: LoveContext, who: string): Promise<GenerateResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = reportModel();
  if (!apiKey || !model) return { ok: false, error: "AI 설정이 아직 안 돼 있어요. 잠시 후 다시 시도해주세요." };

  const input = buildUserInput(ctx);
  // 남용 감시용 식별자 (회원 id를 그대로 보내지 않고 해시로, 그림 프로필과 같은 방식)
  const safetyId = createHash("sha256").update(`hangyeol:${who}`).digest("hex");
  const parts = await Promise.all(RESPONSE_SCHEMAS.map((_, i) => writePart(apiKey, model, input, i, safetyId)));
  const failed = parts.find((p) => !p.ok);
  if (failed && !failed.ok) return { ok: false, error: failed.error };

  const ok = parts as Extract<PartResult, { ok: true }>[];
  const report = parseLoveReport(mergeParts(ok.map((p) => p.data)));
  if (!report) return { ok: false, error: "보고서가 덜 써졌어요. 다시 시도해주세요." };
  return { ok: true, report, model: ok[0].model ?? model };
}
