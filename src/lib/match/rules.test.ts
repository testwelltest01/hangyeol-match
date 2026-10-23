import { describe, expect, it } from "vitest";
import { couponBalance, daysLeftLabel, photosVisible, refreshTargets, responseDaysLeft, unansweredInterests } from "./rules";

describe("photosVisible", () => {
  it("서로 관심을 보낸 뒤부터만 얼굴 사진을 보여준다", () => {
    expect(photosVisible("photos")).toBe(true);
    expect(photosVisible("waiting_accept")).toBe(true);
    expect(photosVisible("connected")).toBe(true);
  });

  it("추천만 받았거나 한쪽만 관심을 보냈으면 보여주지 않는다", () => {
    expect(photosVisible("new")).toBe(false);
    expect(photosVisible("waiting_interest")).toBe(false);
    expect(photosVisible("hidden")).toBe(false);
  });
});

describe("새로고침 쿠폰", () => {
  it("친구 평가 1명당 1장, 쓴 만큼 빠지고 0 밑으로 내려가지 않는다", () => {
    expect(couponBalance(0, 0)).toBe(0);
    expect(couponBalance(3, 1)).toBe(2);
    expect(couponBalance(10, 0)).toBe(10); // 개수 제한 없음
    expect(couponBalance(1, 2)).toBe(0);
  });

  it("새로고침은 넘긴 추천 자리만, 점수 낮은 자리부터 (답하지 않았거나 관심을 보낸 추천은 그대로)", () => {
    const today = [
      { target: "a", score: 0.9 },
      { target: "b", score: 0.4 },
      { target: "c", score: 0.7 },
      { target: "d", score: 0.2 },
    ];
    expect(refreshTargets(today, new Set(["a", "d"]))).toEqual(["d", "a"]);
    expect(refreshTargets(today, new Set())).toEqual([]);
    expect(refreshTargets(today, new Set(["x"]))).toEqual([]);
  });
});

describe("받은 관심 응답 기한 (5일)", () => {
  const now = Date.parse("2026-10-23T12:00:00Z");
  const daysAgo = (d: number) => new Date(now - d * 86_400_000).toISOString();

  it("5일 지나도록 받은 사람이 답하지 않은 관심만 응답 없음(받은 사람 쪽 넘김)으로", () => {
    const rows = [
      { from_user: "A", to_user: "B", interest: true, interest_at: daysAgo(6) }, // B가 답 안 함 → 정리
      { from_user: "C", to_user: "D", interest: true, interest_at: daysAgo(6) },
      { from_user: "D", to_user: "C", interest: false, interest_at: daysAgo(1) }, // D가 넘김 → 그대로
      { from_user: "E", to_user: "F", interest: true, interest_at: daysAgo(4.9) }, // 아직 기한 안
      { from_user: "G", to_user: "H", interest: false, interest_at: daysAgo(30) }, // 넘김에는 기한 없음
      { from_user: "I", to_user: "J", interest: true, interest_at: daysAgo(5) }, // 딱 5일
    ];
    expect(unansweredInterests(rows, now)).toEqual([
      { from_user: "B", to_user: "A" },
      { from_user: "J", to_user: "I" },
    ]);
  });

  it("남은 날은 올려서 세고, 지나면 0", () => {
    expect(responseDaysLeft(daysAgo(0), now)).toBe(5);
    expect(responseDaysLeft(daysAgo(0.5), now)).toBe(5);
    expect(responseDaysLeft(daysAgo(4.2), now)).toBe(1);
    expect(responseDaysLeft(daysAgo(6), now)).toBe(0);
    expect(daysLeftLabel(5)).toBe("5일 남음");
    expect(daysLeftLabel(1)).toBe("하루 남음");
    expect(daysLeftLabel(0)).toBe("곧 마감");
  });
});
