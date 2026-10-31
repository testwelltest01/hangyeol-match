// 재가입 제한의 순수 함수: 신원 값 정리와 해시. 키는 서버(server.ts)가 넘긴다. 테스트할 수 있게 server-only가 아니다.
//
// 이용이 정지된 사람이 탈퇴하고 다시 가입해도 이용하지 못하게, 정지된 계정의 신원을 해시로만 남긴다.
// - 지금은 이메일. 새 이메일을 만들면 빠져나갈 수 있어 약하다
// - 본인인증을 붙이면 CI(연계정보: 같은 사람이면 어느 서비스에서든 같은 값)를 kind 'ci'로 함께 남긴다. 그때부터는 이메일을 바꿔도 막힌다

import { createHmac } from "node:crypto";

export type IdentityKind = "email" | "ci";
export type Identity = { kind: IdentityKind; value: string };

/**
 * 같은 메일함을 가리키는 주소를 하나로: 소문자, '+' 뒤 꼬리표 제거, Gmail은 점도 뺀다.
 * (a.b+x@gmail.com, AB@googlemail.com → ab@gmail.com) 이상한 값이면 null
 */
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toLowerCase();
  const at = v.lastIndexOf("@");
  if (at < 1 || at === v.length - 1 || /\s/.test(v)) return null;
  let local = v.slice(0, at).split("+")[0];
  let domain = v.slice(at + 1);
  if (domain === "googlemail.com") domain = "gmail.com";
  if (domain === "gmail.com") local = local.replace(/\./g, "");
  return local ? `${local}@${domain}` : null;
}

/** CI는 본인인증 업체가 주는 88자 base64 값. 앞뒤 공백만 정리한다 */
export function normalizeCi(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  return /^[A-Za-z0-9+/=]{20,200}$/.test(v) ? v : null;
}

export function normalizeIdentity(id: Identity): Identity | null {
  const value = id.kind === "email" ? normalizeEmail(id.value) : normalizeCi(id.value);
  return value ? { kind: id.kind, value } : null;
}

/** HMAC-SHA256(base64url). 원래 값은 저장하지 않고, 키가 없으면 해시만 보고 이메일을 알아낼 수 없다 */
export function hashIdentity(key: Buffer, id: Identity): string | null {
  const n = normalizeIdentity(id);
  if (!n) return null;
  return createHmac("sha256", key).update(`${n.kind}:${n.value}`, "utf8").digest("base64url");
}
