// 비회원(가입 전) 연애 상황 검사: 비밀 열쇠(토큰) 규칙. 순수 함수(테스트용).
// - 검사를 내면 열쇠를 만들어 본인에게만 주고(결과 주소 /love/r/<열쇠>, 이 기기 localStorage), DB에는 SHA-256만 둔다.
// - 가입하러 갈 때 /love/claim?t=<열쇠>가 쿠키에 담아 두고, 로그인되면 /start가 그 검사를 계정으로 옮긴다(user_id를 채운다.
//   열쇠는 남겨 두어 결과 주소는 계속 열린다. 탈퇴하면 계정과 함께 지워진다).
// - 옮기지 않은 비회원 검사는 GUEST_KEEP_DAYS 뒤 크론이 지운다.
import { createHash, randomBytes } from "node:crypto";

export { GUEST_KEEP_DAYS, GUEST_LOCAL_KEY } from "@/lib/love/guest-keys";

/** 가입하러 갈 때 열쇠를 담아 두는 쿠키 (httpOnly) */
export const GUEST_CLAIM_COOKIE = "hg_love_claim";

/** 24바이트 → base64url 32자 */
export const newGuestToken = (): string => randomBytes(24).toString("base64url");

export const isGuestToken = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{32}$/.test(v);

export const hashGuestToken = (token: string): string => createHash("sha256").update(`hangyeol-love:${token}`).digest("hex");
