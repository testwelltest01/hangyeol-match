// 브라우저 쪽 PWA 도우미: 설치 여부, 알림 켜기/끄기, 설치 버튼 이벤트. 화면(클라이언트 컴포넌트)에서만 부른다.

import { removePushSubscription, savePushSubscription } from "@/app/me/push-actions";

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const SYNC_KEY = "hangyeol:push-synced-at";
const SYNC_EVERY_MS = 24 * 3600_000;

export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** 홈 화면에 설치한 앱으로 열었는지 */
export function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

/** ok: 알림을 켤 수 있음 / ios-install: 아이폰인데 홈 화면 앱이 아님 / unsupported / not-ready: 서버 키 준비 전 */
export type PushSupport = "ok" | "ios-install" | "unsupported" | "not-ready";

export function pushSupport(): PushSupport {
  if (!VAPID_PUBLIC_KEY) return "not-ready";
  if ("serviceWorker" in navigator && "PushManager" in window && "Notification" in window) return "ok";
  if (isIOS() && !isStandalone()) return "ios-install";
  return "unsupported";
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const padded = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;
  await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  return navigator.serviceWorker.ready;
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator)) return null;
  const reg = await navigator.serviceWorker.getRegistration("/");
  return reg ? reg.pushManager.getSubscription() : null;
}

function markSynced() {
  try {
    localStorage.setItem(SYNC_KEY, String(Date.now()));
  } catch {
    // 저장소를 못 써도 괜찮다
  }
}

type Result = { ok: true } | { ok: false; error: string };

/** 알림 켜기. 버튼을 누른 순간에 불러야 한다 (브라우저가 그때만 허용 창을 띄운다) */
export async function enablePush(): Promise<Result> {
  if (pushSupport() !== "ok") return { ok: false, error: "이 브라우저에서는 알림을 켤 수 없어요." };
  const permission = await Notification.requestPermission();
  if (permission === "denied") return { ok: false, error: "알림이 차단되어 있어요. 휴대폰이나 브라우저 설정에서 한결 알림을 허용해주세요." };
  if (permission !== "granted") return { ok: false, error: "알림 허용을 눌러야 켤 수 있어요." };
  try {
    const reg = await registration();
    const options = { userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) };
    let sub: PushSubscription;
    try {
      sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe(options));
    } catch {
      // 예전 키로 만든 구독이 남아 있으면 지우고 다시 만든다
      await (await reg.pushManager.getSubscription())?.unsubscribe();
      sub = await reg.pushManager.subscribe(options);
    }
    const res = await savePushSubscription(sub.toJSON());
    if (!res.ok) {
      await sub.unsubscribe().catch(() => {});
      return res;
    }
    markSynced();
    return { ok: true };
  } catch {
    return { ok: false, error: "알림을 켜지 못했어요. 잠시 후 다시 시도해주세요." };
  }
}

/** 이 기기 알림 끄기 (브라우저 구독도 없앤다) */
export async function disablePush(): Promise<Result> {
  const sub = await currentSubscription().catch(() => null);
  if (!sub) return { ok: true };
  const endpoint = sub.endpoint;
  await sub.unsubscribe().catch(() => {});
  try {
    localStorage.removeItem(SYNC_KEY);
  } catch {
    // 괜찮다
  }
  return removePushSubscription(endpoint);
}

/** 알림을 켜 둔 기기면 하루에 한 번 구독 정보를 서버와 맞춘다 (브라우저가 주소를 바꾸는 경우 대비) */
export async function syncPushDaily(): Promise<void> {
  if (pushSupport() !== "ok" || Notification.permission !== "granted") return;
  try {
    const last = Number(localStorage.getItem(SYNC_KEY) ?? 0);
    if (Date.now() - last < SYNC_EVERY_MS) return;
  } catch {
    return;
  }
  const sub = await currentSubscription().catch(() => null);
  if (!sub) return;
  const res = await savePushSubscription(sub.toJSON()).catch(() => null);
  if (res?.ok) markSynced();
}

// ---------------------------------------------------------------------------
// 설치 버튼 (안드로이드 크롬·삼성 인터넷·엣지). 이벤트가 화면보다 먼저 올 수 있어 여기 붙잡아 둔다
// ---------------------------------------------------------------------------

export type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferredPrompt: InstallPromptEvent | null = null;
const installListeners = new Set<() => void>();

export function setInstallPrompt(e: InstallPromptEvent | null) {
  deferredPrompt = e;
  installListeners.forEach((fn) => fn());
}

export const getInstallPrompt = () => deferredPrompt;

export function onInstallPromptChange(fn: () => void): () => void {
  installListeners.add(fn);
  return () => installListeners.delete(fn);
}

/** 설치 창 띄우기. 설치했으면 true */
export async function promptInstall(): Promise<boolean> {
  const e = deferredPrompt;
  if (!e) return false;
  try {
    await e.prompt();
    const { outcome } = await e.userChoice;
    setInstallPrompt(null);
    return outcome === "accepted";
  } catch {
    setInstallPrompt(null);
    return false;
  }
}
