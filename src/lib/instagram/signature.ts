import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * 메타 웹훅 서명 확인. X-Hub-Signature-256 = "sha256=" + HMAC-SHA256(받은 본문 그대로, 앱 시크릿).
 * 인스타 로그인 앱은 대시보드에 '인스타그램 앱 시크릿'과 메타 앱 시크릿이 따로 있어서, 넣어둔 시크릿 중 하나라도 맞으면 통과한다.
 */
export function validSignature(rawBody: string, header: string | null, secrets: string[]): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const got = Buffer.from(header.slice("sha256=".length), "hex");
  if (got.length !== 32) return false;
  return secrets.some((secret) => {
    if (!secret) return false;
    const want = createHmac("sha256", secret).update(rawBody, "utf8").digest();
    return timingSafeEqual(got, want);
  });
}
