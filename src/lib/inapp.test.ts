import { describe, expect, it } from "vitest";
import { externalBrowserUrl, isInAppBrowser } from "./inapp";

const URL_ = "https://hangyeol-match.vercel.app/";
const KAKAO_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.8.0";
const KAKAO_ANDROID = "Mozilla/5.0 (Linux; Android 14; SM-S921N Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36;KAKAOTALK 2410870";
const LINE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/14.16.0";
const INSTA_ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 Instagram 350.0.0.0 Android";
const INSTA_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0";
const SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const CHROME_ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";

describe("externalBrowserUrl", () => {
  it("카카오톡은 iOS·안드로이드 모두 기본 브라우저로 넘긴다", () => {
    const want = `kakaotalk://web/openExternal?url=${encodeURIComponent(URL_)}`;
    expect(externalBrowserUrl(KAKAO_IOS, URL_)).toBe(want);
    expect(externalBrowserUrl(KAKAO_ANDROID, URL_)).toBe(want);
  });

  it("라인은 openExternalBrowser=1을 붙인다", () => {
    expect(externalBrowserUrl(LINE, URL_)).toBe(`${URL_}?openExternalBrowser=1`);
  });

  it("안드로이드의 다른 앱 안 브라우저는 intent로, 아이폰은 넘기지 않는다", () => {
    expect(externalBrowserUrl(INSTA_ANDROID, URL_)).toBe(
      `intent://hangyeol-match.vercel.app/#Intent;scheme=https;S.browser_fallback_url=${encodeURIComponent(URL_)};end`,
    );
    expect(externalBrowserUrl(INSTA_IOS, URL_)).toBeNull();
  });

  it("보통 브라우저는 그대로 연다", () => {
    expect(externalBrowserUrl(SAFARI, URL_)).toBeNull();
    expect(externalBrowserUrl(CHROME_ANDROID, URL_)).toBeNull();
    expect(isInAppBrowser(SAFARI)).toBe(false);
    expect(isInAppBrowser(KAKAO_IOS)).toBe(true);
  });
});
