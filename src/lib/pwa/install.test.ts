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
  it("아이폰은 Safari면 Safari 방법, 아니면(Chrome·Firefox·카카오톡) Safari로 열기", () => {
    expect(installGuide(SAFARI)).toBe("ios-safari");
    expect(installGuide(CHROME_IOS)).toBe("ios-open-safari");
    expect(installGuide(SAFARI.replace("Version/26.0", "FxiOS/140.0"))).toBe("ios-open-safari");
    expect(installGuide(KAKAO_IOS)).toBe("ios-open-safari");
  });

  it("UA에 CriOS가 없어도 Chrome이 넣은 스크립트가 있으면 Safari로 열기", () => {
    expect(installGuide(SAFARI, false, true)).toBe("ios-open-safari");
    expect(installGuide(IPAD_DESKTOP, true, true)).toBe("ios-open-safari");
  });

  it("안드로이드 앱 안 브라우저는 기본 브라우저로 넘기라고 한다", () => {
    expect(installGuide(SAMSUNG.replace("SamsungBrowser/28.0", "KAKAOTALK 10.8.0"))).toBe("in-app");
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
