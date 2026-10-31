import { describe, expect, it } from "vitest";
import { AUTO_SUSPEND_REPORTERS, autoSuspension, isReportReason, REPORT_REASONS, SEVERE_REPORT_REASONS, suspendedNotice } from "@/lib/match/safety";
import { hashIdentity, normalizeCi, normalizeEmail } from "./identity";
import { BAN_KEEP_DAYS, banExpiry } from "./rules";

const KEY = Buffer.alloc(32, 7);

describe("재가입 제한: 이메일 정리와 해시", () => {
  it("같은 메일함을 가리키는 주소는 하나로", () => {
    expect(normalizeEmail(" Hong.Gil+hangyeol@Gmail.com ")).toBe("honggil@gmail.com");
    expect(normalizeEmail("honggil@googlemail.com")).toBe("honggil@gmail.com");
    // Gmail이 아니면 점은 그대로(다른 메일함일 수 있다), 꼬리표만 뗀다
    expect(normalizeEmail("hong.gil+x@naver.com")).toBe("hong.gil@naver.com");
  });

  it("이상한 값은 null", () => {
    expect(normalizeEmail("")).toBeNull();
    expect(normalizeEmail("no-at-sign")).toBeNull();
    expect(normalizeEmail("@gmail.com")).toBeNull();
    expect(normalizeEmail("+tag@gmail.com")).toBeNull();
    expect(normalizeEmail("a b@gmail.com")).toBeNull();
    expect(normalizeEmail(null)).toBeNull();
  });

  it("해시: 같은 사람이면 같고, 종류·키가 다르면 다르며, 원래 값이 드러나지 않는다", () => {
    const a = hashIdentity(KEY, { kind: "email", value: "Hong.Gil@gmail.com" });
    const b = hashIdentity(KEY, { kind: "email", value: "honggil+2@gmail.com" });
    expect(a).toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toContain("honggil");
    expect(hashIdentity(Buffer.alloc(32, 8), { kind: "email", value: "honggil@gmail.com" })).not.toBe(a);
    expect(hashIdentity(KEY, { kind: "email", value: "other@gmail.com" })).not.toBe(a);
    expect(hashIdentity(KEY, { kind: "email", value: "bad" })).toBeNull();
  });

  it("CI(본인인증 연계정보)도 같은 방식으로, 이메일과는 섞이지 않는다", () => {
    const ci = "a".repeat(86) + "==";
    expect(normalizeCi(` ${ci} `)).toBe(ci);
    expect(normalizeCi("짧음")).toBeNull();
    const h = hashIdentity(KEY, { kind: "ci", value: ci });
    expect(h).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(h).not.toBe(hashIdentity(KEY, { kind: "email", value: `${ci}@x.com` }));
  });

  it("정지된 채 탈퇴하면 3년 뒤 파기", () => {
    expect(BAN_KEEP_DAYS).toBe(1095);
    expect(banExpiry(new Date("2026-10-31T00:00:00Z")).toISOString()).toBe("2029-10-30T00:00:00.000Z");
  });
});

describe("신고 사유와 자동 정지", () => {
  it("화면 사유는 모두 받고, 모르는 값은 거절", () => {
    for (const r of REPORT_REASONS) expect(isReportReason(r.id)).toBe(true);
    expect(isReportReason("contact_not_found")).toBe(true);
    expect(isReportReason("hack")).toBe(false);
    expect(isReportReason(undefined)).toBe(false);
  });

  it("심한 신고는 서로 관심 이후라면 한 건으로 바로 정지", () => {
    for (const reason of SEVERE_REPORT_REASONS) {
      expect(autoSuspension({ reason, mutual: true, reporters: 1 })).toMatch(/^자동: 심한 신고/);
    }
  });

  it("추천 카드만 본 사이의 심한 신고는 다른 사유처럼 서로 다른 사람 수로 센다", () => {
    expect(autoSuspension({ reason: "sexual", mutual: false, reporters: 1 })).toBeNull();
    expect(autoSuspension({ reason: "sexual", mutual: false, reporters: AUTO_SUSPEND_REPORTERS })).toBe(`자동: 신고 ${AUTO_SUSPEND_REPORTERS}명`);
  });

  it("그 밖의 사유는 서로 다른 2명부터", () => {
    expect(autoSuspension({ reason: "rude", mutual: true, reporters: 1 })).toBeNull();
    expect(autoSuspension({ reason: "married", mutual: true, reporters: 2 })).toBe("자동: 신고 2명");
  });

  it("'아이디로 찾을 수 없어요'는 정지와 상관없다", () => {
    expect(autoSuspension({ reason: "contact_not_found", mutual: true, reporters: 9 })).toBeNull();
  });

  it("정지 안내: 재가입 제한이면 문의 주소를 알려준다", () => {
    expect(suspendedNotice(true)).toContain("@");
    expect(suspendedNotice(false)).toContain("운영자가 확인");
  });
});
