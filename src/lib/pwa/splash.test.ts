import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { splashImages } from "./splash";

describe("splashImages", () => {
  const images = splashImages();

  it("기기마다 겹치지 않는 조건으로 하나씩 고른다", () => {
    expect(new Set(images.map((i) => i.media)).size).toBe(images.length);
  });

  it("가리키는 그림이 모두 public/splash에 있다", () => {
    for (const { url } of images) {
      expect(fs.existsSync(path.join(process.cwd(), "public", url)), url).toBe(true);
    }
  });

  it("iPad는 가로 그림도 있고 가로·세로 크기가 뒤바뀐다", () => {
    const ipad = splashImages([{ w: 820, h: 1180, dpr: 2, name: "iPad Air", ipad: true }]);
    expect(ipad).toEqual([
      {
        url: "/splash/1640x2360.png",
        media: "(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
      {
        url: "/splash/2360x1640.png",
        media: "(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)",
      },
    ]);
  });
});
