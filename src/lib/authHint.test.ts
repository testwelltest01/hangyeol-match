import { describe, expect, it } from "vitest";
import { hasAuthCookie } from "./authHint";

describe("hasAuthCookie", () => {
  it("Supabase 로그인 쿠키(나뉜 것 포함)가 있으면 true", () => {
    expect(hasAuthCookie("sb-abcd-auth-token=base64-xyz")).toBe(true);
    expect(hasAuthCookie("hg=1; sb-abcd-auth-token.0=base64-xyz; sb-abcd-auth-token.1=more")).toBe(true);
  });

  it("없거나 비어 있거나 다른 쿠키뿐이면 false", () => {
    expect(hasAuthCookie("")).toBe(false);
    expect(hasAuthCookie("hg-theme=pink; other=1")).toBe(false);
    expect(hasAuthCookie("sb-abcd-auth-token=")).toBe(false);
    expect(hasAuthCookie("sb-abcd-auth-token-code-verifier=abc")).toBe(false);
  });
});
