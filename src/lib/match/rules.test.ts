import { describe, expect, it } from "vitest";
import { couponBalance, photosVisible, refreshTargets } from "./rules";

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

  it("안 답한 사람만, 나에게 먼저 관심을 보낸 사람은 남기고, 점수 낮은 사람부터", () => {
    const today = [
      { target: "a", score: 0.9 },
      { target: "b", score: 0.4 },
      { target: "c", score: 0.7 },
      { target: "d", score: 0.2 },
    ];
    expect(refreshTargets(today, new Set(["a"]), new Set(["d"]))).toEqual(["b", "c"]);
    expect(refreshTargets(today, new Set(["a", "b", "c", "d"]), new Set())).toEqual([]);
  });
});
