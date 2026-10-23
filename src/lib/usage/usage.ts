// OpenAI API 호출 기록의 공통 규칙: 용도, 응답의 usage 읽기, 비용 계산. 순수 모듈(테스트용).
import { priceOf, type Price } from "@/lib/usage/prices";

export const PURPOSES = [
  { id: "photo_feedback", label: "사진 AI 피드백", unit: "사진 1장" },
  { id: "illustration", label: "그림 프로필", unit: "그림 1장" },
  { id: "love_report", label: "연애 상황 보고서", unit: "보고서 1건 (호출 2번)" },
  { id: "scene_image", label: "장면 사진 (관리자)", unit: "사진 1장" },
] as const;
export type Purpose = (typeof PURPOSES)[number]["id"];
export const isPurpose = (v: unknown): v is Purpose => PURPOSES.some((p) => p.id === v);

export type Endpoint = "chat" | "image_edit" | "image_generate";

/** 한 번 호출의 토큰 (없는 값은 null) */
export type Usage = {
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  inputTextTokens: number | null;
  inputImageTokens: number | null;
  outputImageTokens: number | null;
  reasoningTokens: number | null;
};

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : null);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

/** Chat Completions의 usage → Usage. 없으면 null */
export function parseChatUsage(raw: unknown): Usage | null {
  const u = obj(raw);
  const input = num(u.prompt_tokens);
  const output = num(u.completion_tokens);
  if (input === null || output === null) return null;
  return {
    inputTokens: input,
    cachedTokens: num(obj(u.prompt_tokens_details).cached_tokens) ?? 0,
    outputTokens: output,
    inputTextTokens: null,
    inputImageTokens: null,
    outputImageTokens: null,
    reasoningTokens: num(obj(u.completion_tokens_details).reasoning_tokens),
  };
}

/** Images API(생성·편집)의 usage → Usage. 없으면 null */
export function parseImageUsage(raw: unknown): Usage | null {
  const u = obj(raw);
  const input = num(u.input_tokens);
  const output = num(u.output_tokens);
  if (input === null || output === null) return null;
  const inD = obj(u.input_tokens_details);
  const outD = obj(u.output_tokens_details);
  return {
    inputTokens: input,
    cachedTokens: num(inD.cached_tokens) ?? 0,
    outputTokens: output,
    inputTextTokens: num(inD.text_tokens),
    inputImageTokens: num(inD.image_tokens),
    outputImageTokens: num(outD.image_tokens),
    reasoningTokens: null,
  };
}

/** 토큰 → 비용(USD). 가격표에 없는 모델이면 null */
export function costOf(model: string, u: Usage, price: Price | null = priceOf(model)): number | null {
  if (!price) return null;
  const M = 1_000_000;
  const cached = Math.min(u.cachedTokens, u.inputTokens);
  if (price.kind === "text") {
    return ((u.inputTokens - cached) * price.input + cached * price.cached + u.outputTokens * price.output) / M;
  }
  // 이미지 모델: 입력은 글·이미지로 나뉜다(나뉜 값이 없으면 모두 글로 본다). 캐시된 토큰은 글 쪽에서 뺀다(드물다)
  const imageIn = Math.min(u.inputImageTokens ?? 0, u.inputTokens);
  const textIn = u.inputTextTokens ?? u.inputTokens - imageIn;
  const cachedText = Math.min(cached, textIn);
  const cachedImage = Math.min(cached - cachedText, imageIn);
  const imageOut = u.outputImageTokens ?? u.outputTokens;
  const textOut = Math.max(0, u.outputTokens - imageOut);
  return (
    ((textIn - cachedText) * price.textInput +
      cachedText * price.cachedText +
      (imageIn - cachedImage) * price.imageInput +
      cachedImage * price.cachedImage +
      imageOut * price.imageOutput +
      textOut * (price.textOutput ?? price.imageOutput)) /
    M
  );
}
