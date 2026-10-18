import { describe, expect, it } from "vitest";
import { kstDay, matchDay } from "./day";

// 한국 시각을 UTC Date로
const kst = (s: string) => new Date(`${s}+09:00`);

describe("matchDay (추천의 하루, 저녁 8시에 바뀜)", () => {
  it("저녁 8시 전에는 그날, 8시부터는 다음 날 이름", () => {
    expect(matchDay(kst("2026-10-19T00:30:00"))).toBe("2026-10-19");
    expect(matchDay(kst("2026-10-19T19:59:59"))).toBe("2026-10-19");
    expect(matchDay(kst("2026-10-19T20:00:00"))).toBe("2026-10-20");
    expect(matchDay(kst("2026-10-19T23:59:00"))).toBe("2026-10-20");
  });

  it("자정에 만들던 예전 추천과 이어진다: 자정~저녁 8시는 달력 날짜와 같다", () => {
    const t = kst("2026-10-19T01:11:00");
    expect(matchDay(t)).toBe(kstDay(t));
  });

  it("크론 시각(11:00 UTC)에는 이미 다음 날로 넘어가 있다", () => {
    expect(matchDay(new Date("2026-10-19T11:00:00Z"))).toBe("2026-10-20");
    expect(matchDay(new Date("2026-10-19T11:59:00Z"))).toBe("2026-10-20");
  });

  it("연말에도 다음 해로 넘어간다", () => {
    expect(matchDay(kst("2026-12-31T20:00:00"))).toBe("2027-01-01");
  });
});
