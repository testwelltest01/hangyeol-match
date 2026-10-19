import { describe, expect, it } from "vitest";
import { photosVisible } from "./rules";

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
