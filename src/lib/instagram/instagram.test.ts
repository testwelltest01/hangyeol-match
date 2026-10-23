import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { codeReply, dmLink, IG_VERIFY_REF, isIgCode, isVerifyText, officialUsername, verifyRequests } from "./rules";
import { validSignature } from "./signature";

const ACCOUNT = "17841400000000001";
const msg = (sender: string, message: Record<string, unknown> | undefined, extra: Record<string, unknown> = {}) => ({
  sender: { id: sender },
  recipient: { id: ACCOUNT },
  timestamp: 1_760_000_000_000,
  ...(message ? { message } : {}),
  ...extra,
});
const payload = (...messaging: unknown[]) => ({ object: "instagram", entry: [{ id: ACCOUNT, time: 1, messaging }] });

describe("웹훅에서 코드 요청 고르기", () => {
  it("'인증'·'코드' 같은 글에만 답한다. 다른 문의는 건드리지 않는다", () => {
    const got = verifyRequests(
      payload(
        msg("111", { mid: "m1", text: "인증" }),
        msg("222", { mid: "m2", text: "안녕하세요 문의드려요" }),
        msg("333", { mid: "m3", text: "코드 주세요" }),
        msg("444", { mid: "m4", text: "verify" }),
      ),
    );
    expect(got).toEqual([
      { senderId: "111", mid: "m1" },
      { senderId: "333", mid: "m3" },
      { senderId: "444", mid: "m4" },
    ]);
  });

  it("한결 화면의 링크(ref)로 연 대화는 글이 없어도 답한다", () => {
    expect(verifyRequests(payload(msg("111", undefined, { referral: { ref: IG_VERIFY_REF, source: "SHORTLINKS", type: "OPEN_THREAD" } })))).toEqual([
      { senderId: "111", mid: null },
    ]);
    // 새 대화: 첫 메시지 안에 referral
    expect(verifyRequests(payload(msg("111", { mid: "m1", text: "안녕", referral: { ref: IG_VERIFY_REF } })))).toEqual([{ senderId: "111", mid: "m1" }]);
    // 다른 ref는 무시
    expect(verifyRequests(payload(msg("111", undefined, { referral: { ref: "ad-123" } })))).toEqual([]);
  });

  it("한결 계정이 보낸 메시지(echo·보낸 사람이 계정 자신)는 빼고, 같은 사람은 한 번만", () => {
    expect(
      verifyRequests(
        payload(
          msg(ACCOUNT, { mid: "e1", text: "한결 인스타 확인 코드: 123456", is_echo: true }),
          msg("111", { mid: "x", text: "인증 코드", is_echo: true }),
          msg("222", { mid: "a", text: "인증" }),
          msg("222", { mid: "b", text: "인증 다시" }),
        ),
      ),
    ).toEqual([{ senderId: "222", mid: "a" }]);
  });

  it("모양이 이상한 알림은 빈 목록", () => {
    expect(verifyRequests(null)).toEqual([]);
    expect(verifyRequests({ object: "page", entry: [] })).toEqual([]);
    expect(verifyRequests({ object: "instagram", entry: [{ id: ACCOUNT, changes: [] }] })).toEqual([]);
    expect(verifyRequests(payload({ sender: {}, message: { text: "인증" } }, "junk"))).toEqual([]);
  });
});

describe("코드·링크·문구", () => {
  it("코드는 숫자 6자리만", () => {
    expect(isIgCode("012345")).toBe(true);
    expect(isIgCode("12345")).toBe(false);
    expect(isIgCode("12345a")).toBe(false);
    expect(isIgCode(123456)).toBe(false);
  });

  it("공식 계정 아이디 정리와 DM 링크", () => {
    expect(officialUsername(" @Hangyeol.Match ")).toBe("hangyeol.match");
    expect(officialUsername("")).toBeNull();
    expect(officialUsername("bad id!")).toBeNull();
    expect(dmLink("hangyeol.match")).toBe(`https://ig.me/m/hangyeol.match?ref=${IG_VERIFY_REF}`);
  });

  it("답장은 코드를 담고 1000바이트 이하", () => {
    const text = codeReply("482913");
    expect(text).toContain("482913");
    expect(Buffer.byteLength(text, "utf8")).toBeLessThanOrEqual(1000);
    expect(isVerifyText(text)).toBe(true); // 그래서 echo를 꼭 빼야 한다
  });
});

describe("웹훅 서명", () => {
  const body = JSON.stringify(payload(msg("111", { mid: "m1", text: "인증" })));
  const sign = (secret: string) => `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;

  it("넣어둔 시크릿 중 하나로 서명됐으면 통과", () => {
    expect(validSignature(body, sign("ig-secret"), ["ig-secret"])).toBe(true);
    expect(validSignature(body, sign("meta-secret"), ["ig-secret", "meta-secret"])).toBe(true);
  });

  it("다른 시크릿·바뀐 본문·이상한 머리글은 거절", () => {
    expect(validSignature(body, sign("other"), ["ig-secret"])).toBe(false);
    expect(validSignature(body + " ", sign("ig-secret"), ["ig-secret"])).toBe(false);
    expect(validSignature(body, null, ["ig-secret"])).toBe(false);
    expect(validSignature(body, "sha1=abc", ["ig-secret"])).toBe(false);
    expect(validSignature(body, "sha256=zz", ["ig-secret"])).toBe(false);
    expect(validSignature(body, sign("ig-secret"), [])).toBe(false);
  });
});
