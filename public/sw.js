// 한결 서비스 워커
// - 알림(웹 푸시)을 받아 보여주고, 누르면 해당 화면을 연다.
// - 인터넷이 끊겼을 때 화면 이동하면 안내 화면(offline.html)을 보여준다.
// 로그인한 화면이나 데이터는 기기에 캐시하지 않는다(사진·대화가 기기에 남지 않게).
// 이 파일을 바꾸면 VERSION을 올린다.

const VERSION = "2026-10-19";
const CACHE = `hangyeol-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const ICON = "/icons/icon-192.png";
const BADGE = "/icons/badge-96.png";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, ICON, BADGE]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("hangyeol-") && k !== CACHE).map((k) => caches.delete(k)));
      // 화면 이동 요청을 서비스 워커가 깨어나는 동안 미리 보내서 느려지지 않게 한다
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })(),
  );
});

// 화면 이동(주소창, 링크로 새 페이지 열기)과 안내 화면에 쓰는 아이콘만 다룬다. 데이터 요청·서버 액션은 건드리지 않는다
const PRECACHED = new Set([ICON, BADGE]);
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === "GET" && url.origin === self.location.origin && PRECACHED.has(url.pathname)) {
    event.respondWith(caches.match(url.pathname).then((hit) => hit || fetch(event.request)));
    return;
  }
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    (async () => {
      try {
        const preloaded = await event.preloadResponse;
        if (preloaded) return preloaded;
        return await fetch(event.request);
      } catch {
        return (await caches.match(OFFLINE_URL)) || Response.error();
      }
    })(),
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = typeof data.title === "string" && data.title ? data.title : "한결";
  const options = {
    body: typeof data.body === "string" ? data.body : "",
    icon: ICON,
    badge: BADGE,
    lang: "ko",
    data: { url: typeof data.url === "string" ? data.url : "/match" },
  };
  // 같은 사람·같은 대화의 알림은 하나로 묶는다
  if (typeof data.tag === "string" && data.tag) {
    options.tag = data.tag;
    options.renotify = true;
  }
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/match", self.location.origin);
  // 다른 사이트로는 열지 않는다
  if (target.origin !== self.location.origin) return;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin !== target.origin) continue;
        try {
          await client.focus();
          if ("navigate" in client) await client.navigate(target.href);
          return;
        } catch {
          // 이 창으로 옮기지 못하면 새 창을 연다
        }
      }
      await self.clients.openWindow(target.href);
    })(),
  );
});
