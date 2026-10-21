// 앱 안 브라우저(카카오톡 등)에서 밖의 브라우저로 넘기기. 브라우저에서만 부른다 (window를 쓴다)
import { externalBrowserUrl, isInAppBrowser, isIOSDevice, safariUrl } from "@/lib/inapp";

/** 이 브라우저가 앱 안 브라우저인지 */
export const inAppNow = () => isInAppBrowser(navigator.userAgent);

/** 아이폰·아이패드인지 */
export const iosNow = () => isIOSDevice(navigator.userAgent, navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

/**
 * url을 밖의 브라우저로 연다. 넘겼으면 true, 넘길 필요가 없거나 방법이 없으면 false(그 자리에서 이동하면 된다).
 * - 아이폰: Safari로(x-safari-https). 홈 화면 추가는 Safari에서 해야 해서 기본 브라우저가 Chrome이어도 Safari로.
 *   앱이 Safari 주소를 막아 3초 뒤에도 화면이 그대로면 그 앱의 '기본 브라우저로 열기'(카카오톡·라인)로 넘긴다
 * - 안드로이드: 기본 브라우저로 (카카오톡·라인·intent)
 * safari=true면 아이폰의 앱 밖 다른 브라우저(Chrome 등)에서도 Safari로 연다
 */
export function openOutside(url: string, { safari = false }: { safari?: boolean } = {}): boolean {
  const ua = navigator.userAgent;
  const external = externalBrowserUrl(ua, url);
  if (iosNow() && (safari || isInAppBrowser(ua))) {
    window.location.href = safariUrl(url);
    if (external) {
      window.setTimeout(() => {
        if (document.visibilityState === "visible") window.location.href = external;
      }, 3000);
    }
    return true;
  }
  if (!external) return false;
  window.location.href = external;
  return true;
}
