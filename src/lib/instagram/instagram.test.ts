import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { codeReply, dmLink, IG_VERIFY_WORD, isIgCode, isVerifyText, officialUsername, verifyRequests } from "./rules";
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
  it("딱 '인증'만 보낸 메시지에만 답한다. '인증'이 섞인 글·다른 문의는 건드리지 않는다", () => {
    const got = verifyRequests(
      payload(
        msg("111", { mid: "m1", text: "인증" }),
        msg("222", { mid: "m2", text: "안녕하세요 문의드려요" }),
        msg("333", { mid: "m3", text: "인증해 주세요" }),
        msg("444", { mid: "m4", text: "인증 코드 주세요" }),
        msg("555", { mid: "m5", text: "코드" }),
        msg("666", { mid: "m6", text: "verify" }),
        msg("777", { mid: "m7", text: "인증." }),
        msg("888", { mid: "m8", text: "본인인증" }),
      ),
    );
    expect(got).toEqual([{ senderId: "111", mid: "m1" }]);
  });

  it("앞뒤 공백·줄바꿈은 봐준다", () => {
    expect(verifyRequests(payload(msg("111", { mid: "m1", text: "  인증\n" })))).toEqual([{ senderId: "111", mid: "m1" }]);
    // 자모가 풀린 채로 와도(NFD) 같은 글자로 본다
    expect(verifyRequests(payload(msg("111", { mid: "m1", text: "인증".normalize("NFD") })))).toEqual([{ senderId: "111", mid: "m1" }]);
  });

  it("링크로 대화창만 연 알림(referral)이나 글 없는 메시지에는 답하지 않는다", () => {
    expect(verifyRequests(payload(msg("111", undefined, { referral: { ref: "hg-verify", source: "SHORTLINKS", type: "OPEN_THREAD" } })))).toEqual([]);
    expect(verifyRequests(payload(msg("111", { mid: "m1", text: "안녕", referral: { ref: "hg-verify" } })))).toEqual([]);
    expect(verifyRequests(payload(msg("111", { mid: "m1", attachments: [{ type: "image" }] })))).toEqual([]);
  });

  it("한결 계정이 보낸 메시지(echo·보낸 사람이 계정 자신)는 빼고, 같은 사람은 한 번만", () => {
    expect(
      verifyRequests(
        payload(
          msg(ACCOUNT, { mid: "e1", text: "인증" }),
          msg("111", { mid: "x", text: "인증", is_echo: true }),
          msg("222", { mid: "a", text: "인증" }),
          msg("222", { mid: "b", text: "인증" }),
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
    expect(dmLink("hangyeol.match")).toBe("https://ig.me/m/hangyeol.match");
  });

  it("답장은 코드를 담고 1000바이트 이하", () => {
    const text = codeReply("482913");
    expect(text).toContain("482913");
    expect(Buffer.byteLength(text, "utf8")).toBeLessThanOrEqual(1000);
    expect(isVerifyText(text)).toBe(false); // 봇 답장이 다시 봇을 부르지 않는다
    expect(isVerifyText(IG_VERIFY_WORD)).toBe(true);
    expect(isVerifyText(null)).toBe(false);
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
