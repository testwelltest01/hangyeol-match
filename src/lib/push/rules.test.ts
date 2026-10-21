import { describe, expect, it } from "vitest";
import { parseSubscription, pushMessages, shouldNotifyChat } from "./rules";

const keys = { p256dh: "B".repeat(87), auth: "a".repeat(22) };

describe("parseSubscription", () => {
  it("브라우저 푸시 서버 주소를 받는다", () => {
    for (const endpoint of [
      "https://fcm.googleapis.com/fcm/send/abc:def",
      "https://web.push.apple.com/QK1abc",
      "https://updates.push.services.mozilla.com/wpush/v2/abc",
      "https://wns2-par02p.notify.windows.com/w/?token=abc",
    ]) {
      expect(parseSubscription({ endpoint, keys })?.endpoint).toBe(new URL(endpoint).toString());
    }
  });

  it("다른 주소, http, 포트, 사용자 정보가 붙은 주소는 막는다 (SSRF)", () => {
    for (const endpoint of [
      "https://evil.example.com/push",
      "https://fcm.googleapis.com.evil.com/x",
      "https://evilfcm.googleapis.com/x",
      "http://fcm.googleapis.com/fcm/send/x",
      "https://fcm.googleapis.com:8443/x",
      "https://user:pw@fcm.googleapis.com/x",
      "http://169.254.169.254/latest",
      "not a url",
    ]) {
      expect(parseSubscription({ endpoint, keys })).toBeNull();
    }
  });

  it("키 모양이 이상하면 막는다", () => {
    const endpoint = "https://fcm.googleapis.com/fcm/send/abc";
    expect(parseSubscription({ endpoint, keys: { p256dh: "short", auth: keys.auth } })).toBeNull();
    expect(parseSubscription({ endpoint, keys: { p256dh: keys.p256dh, auth: "a b c d e f g h i j k l" } })).toBeNull();
    expect(parseSubscription({ endpoint })).toBeNull();
    expect(parseSubscription(null)).toBeNull();
    expect(parseSubscription("x")).toBeNull();
  });
});

describe("pushMessages", () => {
  it("잠금화면 문구에 닉네임과 우리 사이트 주소만 쓴다", () => {
    const m = pushMessages.chatMessage("윤슬", "u1");
    expect(m.body).toContain("윤슬");
    expect(m.url).toBe("/chat/u1");
    expect(pushMessages.connected("도담", "u2").url).toBe("/chat/u2");
  });

  it("새 추천 알림은 추천 화면으로, 하루 하나로 묶는다", () => {
    const m = pushMessages.dailyRecommendations(3);
    expect(m.body).toContain("3명");
    expect(m.url).toBe("/match");
    expect(m.tag).toBe("daily");
  });
});

describe("shouldNotifyChat", () => {
  const now = Date.parse("2026-10-18T00:00:00Z");
  it("안 읽은 내 메시지가 이미 있으면 보내지 않는다", () => {
    expect(shouldNotifyChat({ earlierUnreadFromSender: 1, receiverReadAt: null, now })).toBe(false);
  });
  it("상대가 방금 읽고 있었으면 보내지 않는다", () => {
    expect(shouldNotifyChat({ earlierUnreadFromSender: 0, receiverReadAt: "2026-10-17T23:59:30Z", now })).toBe(false);
  });
  it("조용하던 대화의 첫 메시지는 알린다", () => {
    expect(shouldNotifyChat({ earlierUnreadFromSender: 0, receiverReadAt: "2026-10-17T23:50:00Z", now })).toBe(true);
    expect(shouldNotifyChat({ earlierUnreadFromSender: 0, receiverReadAt: null, now })).toBe(true);
  });
});
