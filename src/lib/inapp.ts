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
