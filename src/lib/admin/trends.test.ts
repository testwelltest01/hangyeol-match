import { describe, expect, it } from "vitest";
import { buildTrend, kstParts, peakIndex, shares, type GenderKey } from "./trends";

describe("kstParts", () => {
  it("한국 시간으로 날짜·시·요일을 낸다", () => {
    // 2026-10-17(토) 15:00 UTC = 2026-10-18(일) 00:00 KST
    expect(kstParts("2026-10-17T15:00:00Z")).toEqual({ day: "2026-10-18", hour: 0, weekday: 6 });
    // 2026-10-19(월) 01:30 UTC = 10:30 KST 월요일
    expect(kstParts("2026-10-19T01:30:00Z")).toEqual({ day: "2026-10-19", hour: 10, weekday: 0 });
  });
});

describe("buildTrend", () => {
  const gender: Record<string, GenderKey> = { a: "male", b: "female" };
  const g = (id: string) => gender[id] ?? "unknown";

  it("성별로 날짜·시간대·요일을 세고, 고유 회원은 한 번만 센다", () => {
    const t = buildTrend(
      [
        { userId: "a", at: "2026-10-16T13:00:00Z" }, // 10-16 22시 금
        { userId: "a", at: "2026-10-16T13:40:00Z" }, // 같은 날 같은 사람
        { userId: "b", at: "2026-10-17T03:00:00Z" }, // 10-17 12시 토
        { userId: "c", at: "2026-10-17T04:00:00Z" }, // 성별 미입력
        { userId: "a", at: "2026-09-01T00:00:00Z" }, // 기간 밖
      ],
      g,
      3,
      "2026-10-17",
    );
    expect(t.days).toEqual(["2026-10-15", "2026-10-16", "2026-10-17"]);
    expect(t.daily.male).toEqual([0, 2, 0]);
    expect(t.dailyUsers.male).toEqual([0, 1, 0]);
    expect(t.daily.female).toEqual([0, 0, 1]);
    expect(t.hourly.male[22]).toBe(2);
    expect(t.weekday.male[4]).toBe(2); // 금
    expect(t.weekday.female[5]).toBe(1); // 토
    expect(t.heat.male[4][22]).toBe(2);
    expect(t.totals).toEqual({ male: 2, female: 1, unknown: 1 });
    expect(t.users).toEqual({ male: 1, female: 1, unknown: 1 });
  });
});

describe("peakIndex / shares", () => {
  it("가장 큰 칸, 비율", () => {
    expect(peakIndex([0, 3, 5, 5])).toBe(2);
    expect(peakIndex([0, 0])).toBeNull();
    expect(shares([1, 3])).toEqual([25, 75]);
    expect(shares([0, 0])).toEqual([0, 0]);
  });
});
