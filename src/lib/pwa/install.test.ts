import { describe, expect, it } from "vitest";
import { installGuide } from "./install";

const SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
const CHROME_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0 Mobile/15E148 Safari/604.1";
const KAKAO_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.8.0";
const IPAD_DESKTOP = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15";
const SAMSUNG = "Mozilla/5.0 (Linux; Android 15; SM-S931N) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0 Mobile Safari/537.36";
const CHROME_ANDROID = "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36";
const CHROME_PC = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";

describe("installGuide", () => {
  it("아이폰 Safari와 다른 브라우저를 나눈다", () => {
    expect(installGuide(SAFARI)).toBe("ios-safari");
    expect(installGuide(CHROME_IOS)).toBe("ios-other");
  });

  it("앱 안 브라우저는 아이폰이어도 기본 브라우저로 넘기라고 한다", () => {
    expect(installGuide(KAKAO_IOS)).toBe("in-app");
  });

  it("맥 UA인데 터치가 되면 아이패드 Safari", () => {
    expect(installGuide(IPAD_DESKTOP, true)).toBe("ios-safari");
    expect(installGuide(IPAD_DESKTOP, false)).toBe("desktop");
  });

  it("안드로이드는 삼성 인터넷과 Chrome을 나누고, 나머지는 컴퓨터", () => {
    expect(installGuide(SAMSUNG)).toBe("samsung");
    expect(installGuide(CHROME_ANDROID)).toBe("android");
    expect(installGuide(CHROME_PC)).toBe("desktop");
  });
});
