import { describe, expect, it } from "vitest";
import { fmtKrw, fmtPercent, fmtSeconds, fmtTokens, fmtUsd } from "./format";
import { DEFAULT_USD_KRW, PRICES, priceKey, priceOf, usdKrw } from "./prices";
import { buildUsage, sumSeries, type UsageRow } from "./stats";
import { costOf, parseChatUsage, parseImageUsage, PURPOSES } from "./usage";

describe("가격표", () => {
  it("스냅숏 날짜가 붙은 모델 이름도 찾고, 모르는 모델은 null", () => {
    expect(priceKey("gpt-5.4-mini-2026-03-17")).toBe("gpt-5.4-mini");
    expect(priceKey("GPT-6.1-Sol")).toBe("gpt-6.1-sol");
    expect(priceKey("gpt-image-2.5-sunburst")).toBe("gpt-image-2.5-sunburst");
    // 'gpt-5'가 'gpt-5.4-…'를 잘못 잡지 않는다
    expect(priceKey("gpt-5.4-mini")).toBe("gpt-5.4-mini");
    expect(priceKey("gpt-5-2025-08-07")).toBe("gpt-5");
    expect(priceKey("gpt-9-unknown")).toBeNull();
  });

  it("가격은 모두 0 이상이고, 캐시 입력은 일반 입력보다 비싸지 않다", () => {
    for (const p of Object.values(PRICES)) {
      if (p.kind === "text") {
        expect(p.cached).toBeLessThanOrEqual(p.input);
        expect(p.output).toBeGreaterThan(0);
      } else {
        expect(p.cachedText).toBeLessThanOrEqual(p.textInput);
        expect(p.cachedImage).toBeLessThanOrEqual(p.imageInput);
        expect(p.imageOutput).toBeGreaterThan(0);
      }
    }
  });

  it("환율은 환경 변수, 이상한 값이면 기본값", () => {
    expect(usdKrw("1400")).toBe(1400);
    expect(usdKrw("abc")).toBe(DEFAULT_USD_KRW);
    expect(usdKrw(undefined)).toBe(DEFAULT_USD_KRW);
  });
});

describe("usage 읽기와 비용", () => {
  it("Chat Completions: 캐시된 입력은 싼 값으로, 출력은 출력 값으로", () => {
    const u = parseChatUsage({ prompt_tokens: 3000, completion_tokens: 1000, prompt_tokens_details: { cached_tokens: 1000 }, completion_tokens_details: { reasoning_tokens: 200 } })!;
    expect(u).toMatchObject({ inputTokens: 3000, cachedTokens: 1000, outputTokens: 1000, reasoningTokens: 200 });
    // gpt-5.4-mini: 입력 0.75, 캐시 0.075, 출력 4.5 (100만 토큰당)
    expect(costOf("gpt-5.4-mini", u)).toBeCloseTo((2000 * 0.75 + 1000 * 0.075 + 1000 * 4.5) / 1e6, 10);
    expect(parseChatUsage(undefined)).toBeNull();
    expect(parseChatUsage({ prompt_tokens: "x" })).toBeNull();
  });

  it("Images API: 글·이미지 입력과 이미지 출력 값을 따로", () => {
    const u = parseImageUsage({ input_tokens: 1500, output_tokens: 6000, input_tokens_details: { text_tokens: 500, image_tokens: 1000 } })!;
    // gpt-image-2.5-sunburst: 글 5, 이미지 입력 8, 이미지 출력 30
    expect(costOf("gpt-image-2.5-sunburst", u)).toBeCloseTo((500 * 5 + 1000 * 8 + 6000 * 30) / 1e6, 10);
    // 나뉜 값이 없으면 입력은 모두 글로
    const plain = parseImageUsage({ input_tokens: 100, output_tokens: 1000 })!;
    expect(costOf("gpt-image-2", plain)).toBeCloseTo((100 * 5 + 1000 * 30) / 1e6, 10);
    // 글 출력 값이 따로 있는 모델
    const withText = parseImageUsage({ input_tokens: 0, output_tokens: 1000, output_tokens_details: { image_tokens: 800, text_tokens: 200 } })!;
    expect(costOf("gpt-image-1.5", withText)).toBeCloseTo((800 * 32 + 200 * 10) / 1e6, 10);
  });

  it("가격표에 없는 모델은 비용 null", () => {
    expect(costOf("mystery-model", parseChatUsage({ prompt_tokens: 1, completion_tokens: 1 })!)).toBeNull();
    expect(priceOf("mystery-model")).toBeNull();
  });
});

const row = (over: Partial<UsageRow>): UsageRow => ({
  at: "2026-10-23T03:00:00Z", // 한국 12시, 금요일
  purpose: "love_report",
  endpoint: "chat",
  model: "gpt-5.4-mini",
  ok: true,
  unit: true,
  input_tokens: 1_000_000,
  cached_tokens: 0,
  output_tokens: 0,
  input_text_tokens: null,
  input_image_tokens: null,
  output_image_tokens: null,
  reasoning_tokens: null,
  duration_ms: 1000,
  ...over,
});

describe("사용량 집계", () => {
  const rows: UsageRow[] = [
    row({}),
    row({ unit: false, duration_ms: 3000 }), // 같은 보고서의 두 번째 호출
    row({ ok: false, input_tokens: null, output_tokens: null, duration_ms: null }),
    row({ purpose: "illustration", endpoint: "image_edit", model: "gpt-image-2.5-sunburst", input_tokens: 0, output_tokens: 1_000_000, at: "2026-10-20T15:30:00Z" }), // 한국 21일 0시 30분, 수요일
    row({ purpose: "photo_feedback", model: "mystery-model", input_tokens: 10, output_tokens: 10 }),
    row({ at: "2026-09-01T00:00:00Z" }), // 기간 밖
    row({ purpose: "unknown" }),
  ];
  const s = buildUsage(rows, 7, "2026-10-23");

  it("용도별 호출·실패·건수·비용, 1건당 비용", () => {
    const love = s.byPurpose.find((p) => p.purpose === "love_report")!;
    expect(love).toMatchObject({ calls: 3, fails: 1, units: 1, input: 2_000_000 });
    expect(love.cost).toBeCloseTo(1.5, 10); // 100만 토큰 × 0.75 × 2번
    expect(love.perUnit).toBeCloseTo(1.5, 10);
    expect(love.avgMs).toBe(2000);
    const ill = s.byPurpose.find((p) => p.purpose === "illustration")!;
    expect(ill.cost).toBeCloseTo(30, 10);
    const photo = s.byPurpose.find((p) => p.purpose === "photo_feedback")!;
    expect(photo).toMatchObject({ calls: 1, unpriced: 1, cost: 0 });
    expect(s.totals).toMatchObject({ calls: 5, fails: 1, unpriced: 1 });
    expect(s.byPurpose.map((p) => p.purpose)).toEqual(PURPOSES.map((p) => p.id));
  });

  it("날짜·시간·요일은 한국 시간, 모델별은 비용 큰 순", () => {
    expect(s.days.at(-1)).toBe("2026-10-23");
    expect(s.series.calls.daily.love_report.at(-1)).toBe(3);
    expect(s.series.calls.hourly.love_report[12]).toBe(3);
    expect(s.series.calls.weekday.love_report[4]).toBe(3); // 금
    expect(s.series.cost.daily.illustration[s.days.indexOf("2026-10-21")]).toBeCloseTo(30, 10);
    expect(s.series.calls.hourly.illustration[0]).toBe(1);
    expect(s.series.calls.weekday.illustration[2]).toBe(1); // 수
    expect(s.heat.calls[4][12]).toBe(4); // 연애 보고서 3 + 사진 피드백 1
    expect(s.series.tokens.daily.love_report.at(-1)).toBe(2_000_000);
    expect(s.byModel[0].model).toBe("gpt-image-2.5-sunburst");
    expect(s.byModel.find((m) => m.model === "mystery-model")!.priceKey).toBeNull();
    expect(sumSeries(s.series.calls.daily).reduce((a, b) => a + b, 0)).toBe(5);
  });

  it("한 달 예상 = 최근 7일 하루 평균 × 30", () => {
    expect(s.last7Cost).toBeCloseTo(31.5, 10);
    expect(s.monthEstimate).toBeCloseTo((31.5 / 7) * 30, 10);
  });
});


describe("숫자 표시", () => {
  it("달러·원·토큰·초", () => {
    expect(fmtUsd(0)).toBe("$0");
    expect(fmtUsd(0.0042)).toBe("$0.0042");
    expect(fmtUsd(0.25)).toBe("$0.250");
    expect(fmtUsd(1234.5)).toBe("$1,234.50");
    expect(fmtKrw(1.5, 1324)).toBe("1,986원");
    expect(fmtKrw(0.0001, 1324)).toBe("1원 미만");
    expect(fmtTokens(9999)).toBe("9,999");
    expect(fmtTokens(12_345)).toBe("1.2만");
    expect(fmtTokens(1_234_567)).toBe("123만");
    expect(fmtTokens(250_000_000)).toBe("2.5억");
    expect(fmtSeconds(1500)).toBe("1.5초");
    expect(fmtSeconds(null)).toBe("–");
    expect(fmtPercent(1, 4)).toBe("25%");
  });
});
