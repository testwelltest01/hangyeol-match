// 알림(웹 푸시) 규칙. 서버·화면·테스트가 함께 쓴다 (비밀값 없음)

/** 한 사람이 알림을 받을 수 있는 기기(브라우저) 수. 넘으면 오래된 것부터 지운다 */
export const MAX_DEVICES_PER_USER = 5;

/**
 * 브라우저 회사의 푸시 서버만 받는다. 아무 주소나 받으면 우리 서버가 그 주소로 요청을 보내게 되므로(SSRF) 막는다.
 * Chrome·삼성 인터넷·Edge(새 버전)는 FCM, Safari는 Apple, Firefox는 Mozilla, 예전 Edge는 Windows(WNS)
 */
const PUSH_HOST_SUFFIXES = ["fcm.googleapis.com", "push.apple.com", "push.services.mozilla.com", "notify.windows.com"];

export type PushSubscriptionInput = { endpoint: string; keys: { p256dh: string; auth: string } };

const B64URL = /^[A-Za-z0-9_-]+={0,2}$/;

/** 브라우저가 준 구독 정보가 올바른지. 올바르면 정리한 값, 아니면 null */
export function parseSubscription(input: unknown): PushSubscriptionInput | null {
  if (!input || typeof input !== "object") return null;
  const { endpoint, keys } = input as { endpoint?: unknown; keys?: unknown };
  if (typeof endpoint !== "string" || endpoint.length > 1000) return null;
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  if (!PUSH_HOST_SUFFIXES.some((s) => host === s || host.endsWith(`.${s}`))) return null;
  if (!keys || typeof keys !== "object") return null;
  const { p256dh, auth } = keys as { p256dh?: unknown; auth?: unknown };
  // p256dh는 공개키 65바이트(약 87자), auth는 16바이트(약 22자)
  if (typeof p256dh !== "string" || p256dh.length < 80 || p256dh.length > 100 || !B64URL.test(p256dh)) return null;
  if (typeof auth !== "string" || auth.length < 16 || auth.length > 30 || !B64URL.test(auth)) return null;
  return { endpoint: url.toString(), keys: { p256dh, auth } };
}

/** 알림 한 건. url은 우리 사이트 안 주소만 */
export type PushMessage = { title: string; body: string; url: string; tag?: string };

/**
 * 알림 문구. 잠금화면에 그대로 보이므로 대화 내용·연락처·사진은 넣지 않고 상대 닉네임만 쓴다.
 * id는 알림을 받는 사람 입장에서 '상대'의 사용자 ID
 */
export const pushMessages = {
  dailyRecommendations: (count: number): PushMessage => ({
    title: "오늘의 추천이 도착했어요",
    body: `결이 맞는 ${count === 1 ? "한 사람을" : `${count}명을`} 새로 골랐어요. 추천 이유부터 확인해보세요.`,
    url: "/match",
    tag: "daily",
  }),
  mutualInterest: (nickname: string, id: string): PushMessage => ({
    title: "서로 관심을 보냈어요",
    body: `${nickname}님과 서로의 사진이 공개됐어요. 마음에 들면 수락해주세요.`,
    url: `/people/${id}`,
    tag: `pair-${id}`,
  }),
  connected: (nickname: string, id: string): PushMessage => ({
    title: "대화방이 열렸어요",
    body: `${nickname}님도 수락했어요. 먼저 인사를 건네보세요.`,
    url: `/chat/${id}`,
    tag: `pair-${id}`,
  }),
  chatMessage: (nickname: string, id: string): PushMessage => ({
    title: "새 메시지",
    body: `${nickname}님이 메시지를 보냈어요.`,
    url: `/chat/${id}`,
    tag: `chat-${id}`,
  }),
  contactRequest: (nickname: string, id: string): PushMessage => ({
    title: "연락처 전달 요청",
    body: `${nickname}님이 연락처를 주고받고 싶어해요.`,
    url: `/chat/${id}`,
    tag: `chat-${id}`,
  }),
  contactExchanged: (nickname: string, id: string): PushMessage => ({
    title: "연락처를 주고받았어요",
    body: `${nickname}님도 연락처 전달을 눌렀어요. 이제 서로의 연락처가 보여요.`,
    url: `/chat/${id}`,
    tag: `chat-${id}`,
  }),
};

/** 대화 중인 사람에게는 메시지마다 알림을 보내지 않는다: 이미 안 읽은 내 메시지가 있거나, 상대가 방금 읽고 있었으면 건너뛴다 */
export const CHAT_ACTIVE_SECONDS = 60;

export function shouldNotifyChat(opts: { earlierUnreadFromSender: number; receiverReadAt: string | null; now: number }): boolean {
  if (opts.earlierUnreadFromSender > 0) return false;
  if (!opts.receiverReadAt) return true;
  return opts.now - new Date(opts.receiverReadAt).getTime() > CHAT_ACTIVE_SECONDS * 1000;
}
