import "server-only";
import { createHash } from "node:crypto";

export type GenerateResult = { ok: true; image: Buffer; model: string } | { ok: false; error: string; moderation?: boolean };

/** Vercel 함수는 최대 300초. 저장할 시간을 남기고 끊는다 */
const TIMEOUT_MS = 240_000;

/** 기본은 사진 편집 정확도가 높은 모델. 바꾸려면 Vercel 환경 변수 OPENAI_IMAGE_MODEL */
export const imageModel = () => process.env.OPENAI_IMAGE_MODEL || "gpt-image-2.5-sunburst";

/**
 * 사진(얼굴, 전신)과 프롬프트로 그림 한 장을 만든다 (OpenAI Images Edits).
 * 결과는 base64로 오고, 세로 1024x1536 webp로 받는다.
 */
export async function generateIllustration({
  images,
  prompt,
  userId,
}: {
  images: { data: Buffer; mime: string; name: string }[];
  prompt: string;
  userId: string;
}): Promise<GenerateResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ok: false, error: "AI 설정(OPENAI_API_KEY)이 없어요." };
  const model = imageModel();

  const form = new FormData();
  form.append("model", model);
  form.append("prompt", prompt);
  for (const img of images) form.append("image[]", new Blob([new Uint8Array(img.data)], { type: img.mime }), img.name);
  form.append("size", "1024x1536");
  form.append("quality", process.env.OPENAI_IMAGE_QUALITY || "medium");
  form.append("output_format", "webp");
  form.append("output_compression", "85");
  form.append("n", "1");
  // 남용 감지용 식별자. 회원 id를 그대로 보내지 않고 해시로 보낸다
  form.append("safety_identifier", createHash("sha256").update(`hangyeol:${userId}`).digest("hex"));
  // 얼굴을 원본에 가깝게 (gpt-image-1, 1.5만 지원하고 그 뒤 모델은 기본으로 원본을 잘 살린다)
  if (/^gpt-image-1(\.5)?(-\d{4}-\d{2}-\d{2})?$/.test(model)) form.append("input_fidelity", "high");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: controller.signal,
    });
    const json = (await res.json().catch(() => null)) as {
      data?: { b64_json?: string }[];
      error?: { code?: string; message?: string };
    } | null;
    if (!res.ok) {
      const code = json?.error?.code ?? "";
      const message = json?.error?.message ?? "";
      console.error("image edit failed", res.status, code, message.slice(0, 200));
      if (code === "moderation_blocked" || /moderation|safety system/i.test(message)) {
        return { ok: false, moderation: true, error: "이 사진으로는 그림을 만들 수 없었어요. 다른 사진으로 바꾼 뒤 다시 시도해주세요." };
      }
      return { ok: false, error: "그림을 만들지 못했어요. 잠시 후 다시 시도해주세요." };
    }
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) return { ok: false, error: "그림을 받지 못했어요. 다시 시도해주세요." };
    return { ok: true, image: Buffer.from(b64, "base64"), model };
  } catch (e) {
    if ((e as Error).name === "AbortError") return { ok: false, error: "그림 그리기가 너무 오래 걸렸어요. 다시 시도해주세요." };
    console.error("image edit error", (e as Error).message);
    return { ok: false, error: "그림을 만들지 못했어요. 잠시 후 다시 시도해주세요." };
  } finally {
    clearTimeout(timer);
  }
}
