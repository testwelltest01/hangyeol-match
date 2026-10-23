// OpenAI API 가격표 (Standard 처리, USD / 100만 토큰). 순수 모듈(테스트용).
// 관리자 'API 사용량'이 기록된 토큰 수에 이 표를 곱해 비용을 추정한다(기록할 때가 아니라 볼 때 계산: 표를 고치면 지난 기록에도 적용된다).
// 가격이 바뀌거나 새 모델을 쓰면 여기를 고치고 PRICE_CHECKED를 바꾼다. 세금(부가세 등)은 빠진 금액이다.
//
// 출처 (2026-10-23 확인)
// - official: OpenAI 가격 페이지 https://developers.openai.com/api/docs/pricing , 모델 페이지(gpt-5.4-mini, gpt-5-mini)
// - openrouter: OpenRouter에 올라온 OpenAI 정가 (공식 페이지에서 따로 확인하지 못한 예전 모델)
// - known: 2025년 공개 정가 (지금 공식 페이지에서 확인하지 못함)

export const PRICE_CHECKED = "2026-10-23";

/** 원/달러 환율 기본값 (2026-10-23 약 1,324원). 바꾸려면 환경 변수 USD_KRW */
export const DEFAULT_USD_KRW = 1324;

export type PriceSource = "official" | "openrouter" | "known";

export type TextPrice = { kind: "text"; input: number; cached: number; output: number; source: PriceSource };
/** 이미지 모델: 글 입력·이미지 입력·이미지 출력 값이 다르다. textOutput이 없으면 출력은 모두 이미지 출력 값으로 센다 */
export type ImagePrice = {
  kind: "image";
  textInput: number;
  cachedText: number;
  imageInput: number;
  cachedImage: number;
  imageOutput: number;
  textOutput?: number;
  source: PriceSource;
};
export type Price = TextPrice | ImagePrice;

const text = (input: number, cached: number, output: number, source: PriceSource): TextPrice => ({ kind: "text", input, cached, output, source });

export const PRICES: Record<string, Price> = {
  // 글 모델 (사진 피드백 OPENAI_VISION_MODEL, 연애 보고서 OPENAI_REPORT_MODEL)
  "gpt-6-astra": text(10, 1, 50, "official"),
  "gpt-6.1-sol": text(2, 0.1, 10, "official"),
  "gpt-6-sol": text(2, 0.2, 10, "openrouter"),
  "gpt-6-luna": text(0.1, 0.01, 0.5, "official"),
  "gpt-5.6-sol": text(4, 0.4, 20, "official"),
  "gpt-5.6-terra": text(2, 0.2, 12, "openrouter"),
  "gpt-5.6-luna": text(0.2, 0.02, 1.2, "openrouter"),
  "chat-latest": text(5, 0.5, 30, "official"),
  "gpt-5.5": text(5, 0.5, 30, "openrouter"),
  "gpt-5.4": text(2.5, 0.25, 15, "openrouter"),
  "gpt-5.4-mini": text(0.75, 0.075, 4.5, "official"),
  "gpt-5.4-nano": text(0.2, 0.02, 1.25, "openrouter"),
  "gpt-5.3-codex": text(1.75, 0.175, 14, "official"),
  "gpt-5.2": text(1.75, 0.175, 14, "openrouter"),
  "gpt-5.1": text(1.25, 0.125, 10, "openrouter"),
  "gpt-5": text(1.25, 0.125, 10, "openrouter"),
  "gpt-5-mini": text(0.25, 0.025, 2, "official"),
  "gpt-5-nano": text(0.05, 0.005, 0.4, "openrouter"),
  "gpt-4.1": text(2, 0.5, 8, "openrouter"),
  "gpt-4.1-mini": text(0.4, 0.1, 1.6, "openrouter"),
  "gpt-4.1-nano": text(0.1, 0.025, 0.4, "openrouter"),
  "gpt-4o": text(2.5, 1.25, 10, "openrouter"),
  "gpt-4o-mini": text(0.15, 0.075, 0.6, "openrouter"),
  o3: text(2, 0.5, 8, "openrouter"),
  "o4-mini": text(1.1, 0.275, 4.4, "openrouter"),

  // 이미지 모델 (그림 프로필·장면 사진 OPENAI_IMAGE_MODEL)
  "gpt-image-2.5-sunburst": { kind: "image", textInput: 5, cachedText: 1.25, imageInput: 8, cachedImage: 2, imageOutput: 30, source: "official" },
  "gpt-image-2.5-flare": { kind: "image", textInput: 5, cachedText: 1.25, imageInput: 8, cachedImage: 2, imageOutput: 30, source: "official" },
  "gpt-image-2": { kind: "image", textInput: 5, cachedText: 1.25, imageInput: 8, cachedImage: 2, imageOutput: 30, source: "openrouter" },
  "gpt-image-1.5": { kind: "image", textInput: 5, cachedText: 1.25, imageInput: 8, cachedImage: 2, imageOutput: 32, textOutput: 10, source: "known" },
  "gpt-image-1": { kind: "image", textInput: 5, cachedText: 1.25, imageInput: 10, cachedImage: 2.5, imageOutput: 40, source: "openrouter" },
  "gpt-image-1-mini": { kind: "image", textInput: 2, cachedText: 0.2, imageInput: 2.5, cachedImage: 0.25, imageOutput: 8, source: "known" },
};

export const SOURCE_LABEL: Record<PriceSource, string> = {
  official: "OpenAI 공식",
  openrouter: "OpenRouter 정가",
  known: "2025년 정가(다시 확인 필요)",
};

/** 응답의 모델 이름(스냅숏 날짜가 붙기도 한다: gpt-5.4-mini-2026-03-17)을 가격표 이름으로 */
export function priceKey(model: string): string | null {
  const m = model.trim().toLowerCase();
  if (PRICES[m]) return m;
  const base = m.replace(/-\d{4}-\d{2}-\d{2}$/, "");
  return PRICES[base] ? base : null;
}

export const priceOf = (model: string): Price | null => {
  const key = priceKey(model);
  return key ? PRICES[key] : null;
};

/** 환경 변수 USD_KRW (숫자가 아니면 기본값) */
export const usdKrw = (raw: string | undefined = typeof process !== "undefined" ? process.env.USD_KRW : undefined): number => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 100 ? n : DEFAULT_USD_KRW;
};
