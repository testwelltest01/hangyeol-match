"use client";

import { useEffect } from "react";
import { setInstallPrompt, syncPushDaily, type InstallPromptEvent } from "@/lib/push/client";

/** 모든 화면에서: 서비스 워커 등록(운영에서만), 설치 버튼 이벤트 붙잡기, 알림 구독 하루 한 번 맞추기, iOS 누른 티 켜기, 확대 막기 */
export function PwaRegister() {
  useEffect(() => {
    const onPrompt = (e: Event) => setInstallPrompt(e as InstallPromptEvent);
    const onInstalled = () => setInstallPrompt(null);
    // <head>의 INSTALL_BOOT_SCRIPT가 React보다 먼저 받아 둔 설치 이벤트
    const early = (window as { __hgInstall?: InstallPromptEvent | null }).__hgInstall;
    if (early) setInstallPrompt(early);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    // iOS Safari는 터치 리스너가 하나라도 있어야 :active(누른 티)를 그린다
    const noop = () => {};
    document.addEventListener("touchstart", noop, { passive: true });
    // iOS는 확대 금지 설정을 무시하고 두 손가락 확대를 허용해서, 확대 몸짓 자체를 막는다
    const noZoom = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", noZoom, { passive: false });
    // 개발 중에는 등록하지 않는다 (예전 화면이 남아 헷갈리지 않게)
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then(() => syncPushDaily())
        .catch(() => {});
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      document.removeEventListener("touchstart", noop);
      document.removeEventListener("gesturestart", noZoom);
    };
  }, []);
  return null;
}
