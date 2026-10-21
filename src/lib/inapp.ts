// 앱 안 브라우저(카카오톡 등)에서 휴대폰 기본 브라우저로 넘겨 여는 주소.
// 친구 평가는 대개 카카오톡 안에서 열리는데, 거기서 가입까지 하면 로그인·홈 화면 추가가 카카오톡 창에 묶인다.
// - 카카오톡: kakaotalk://web/openExternal?url=… (iOS·안드로이드 모두)
// - 라인: 주소에 openExternalBrowser=1
// - 안드로이드의 다른 앱 안 브라우저(인스타그램·페이스북·네이버·다음·밴드·에브리타임): intent:// 로 기본 브라우저
// - 아이폰의 다른 앱은 넘길 방법이 없어서 null (그 자리에서 연다)

export function externalBrowserUrl(userAgent: string, url: string): string | null {
  const ua = userAgent;
  if (/KAKAOTALK/i.test(ua)) return `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
  if (/\bLine\//.test(ua)) {
    const u = new URL(url);
    u.searchParams.set("openExternalBrowser", "1");
    return u.toString();
  }
  const android = /Android/i.test(ua);
  const inApp = /Instagram|FBAN|FBAV|FB_IAB|NAVER\(inapp|DaumApps|BAND\/|everytimeApp/i.test(ua);
  if (android && inApp) {
    const u = new URL(url);
    const fallback = encodeURIComponent(url);
    return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${u.protocol.replace(":", "")};S.browser_fallback_url=${fallback};end`;
  }
  return null;
}

/** 앱 안 브라우저인지 (안내 문구용) */
export function isInAppBrowser(userAgent: string): boolean {
  return /KAKAOTALK|\bLine\/|Instagram|FBAN|FBAV|FB_IAB|NAVER\(inapp|DaumApps|BAND\/|everytimeApp/i.test(userAgent);
}

/** 아이폰·아이패드인지 (touchMac = 맥 UA를 쓰는 아이패드: navigator.platform이 MacIntel인데 터치가 됨) */
export function isIOSDevice(userAgent: string, touchMac = false): boolean {
  return /iPad|iPhone|iPod/.test(userAgent) || touchMac;
}

/** 아이폰 Safari인지 (Chrome·Edge·Firefox·웨일 같은 다른 브라우저와 앱 안 브라우저가 아님) */
export function isSafariIOS(userAgent: string, touchMac = false, chromeIOS = false): boolean {
  return isIOSDevice(userAgent, touchMac) && !chromeIOS && !isInAppBrowser(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|Whale|GSA\//.test(userAgent);
}

/**
 * 아이폰에서 Safari로 여는 주소 (iOS 17부터 x-safari-https). 홈 화면 추가는 Safari에서 해야 해서
 * 아이폰의 다른 브라우저·앱 안 브라우저에서는 늘 Safari로 넘긴다. Safari 앱은 아이폰에 늘 있다
 */
export function safariUrl(url: string): string {
  return url.replace(/^https:/, "x-safari-https:").replace(/^http:/, "x-safari-http:");
}
