// 홈 화면에 추가(설치) 안내. 순수 함수만 둔다(테스트용).
// - 안드로이드 Chrome·삼성 인터넷·컴퓨터 Chrome/Edge: 브라우저가 beforeinstallprompt를 주면 버튼 하나로 설치 창을 띄운다
//   (설치 창의 '설치'는 사용자가 한 번 더 눌러야 한다. 아무 확인 없이 설치하는 방법은 어느 브라우저에도 없다)
// - 아이폰·아이패드: 웹사이트가 설치를 띄울 방법이 없다(애플이 막아둠). Safari·Chrome 모두 공유 → '홈 화면에 추가'를 직접
// - 카카오톡 같은 앱 안 브라우저: 설치가 안 된다. 기본 브라우저로 넘겨 연 뒤 추가
import { isInAppBrowser } from "@/lib/inapp";

export type InstallGuide = "in-app" | "ios-safari" | "ios-other" | "samsung" | "android" | "desktop";

/** 어떤 방법을 안내할지. touchMac = 데스크톱 모드 UA를 쓰는 아이패드(맥 UA인데 터치가 됨) */
export function installGuide(userAgent: string, touchMac = false): InstallGuide {
  const ua = userAgent;
  if (isInAppBrowser(ua)) return "in-app";
  if (/iPad|iPhone|iPod/.test(ua) || touchMac) {
    // 아이폰의 Chrome·Edge·Firefox·웨일 등은 주소창 옆 공유 버튼에서 추가한다
    return /CriOS|FxiOS|EdgiOS|OPiOS|Whale/i.test(ua) ? "ios-other" : "ios-safari";
  }
  if (/SamsungBrowser/i.test(ua)) return "samsung";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

/**
 * 설치 이벤트(beforeinstallprompt)는 페이지를 연 직후 한 번만 온다. React가 붙기 전에 오면 놓치므로
 * 루트 레이아웃 <head>에서 먼저 받아 두고, PwaRegister가 이어받는다
 */
export const INSTALL_BOOT_SCRIPT = `window.addEventListener("beforeinstallprompt",function(e){window.__hgInstall=e});window.addEventListener("appinstalled",function(){window.__hgInstall=null});`;
