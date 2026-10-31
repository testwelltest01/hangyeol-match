import "server-only";
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

// 연락처(인스타그램, 카카오톡 ID)를 DB에 넣기 전에 AES-256-GCM으로 암호화한다.
// 키는 환경 변수 CONTACT_ENCRYPTION_KEY (32바이트를 base64로). 키를 잃으면 저장된 연락처를 읽을 수 없으니 따로 보관한다.

function key(): Buffer {
  const raw = process.env.CONTACT_ENCRYPTION_KEY;
  if (!raw) throw new Error("CONTACT_ENCRYPTION_KEY가 설정되지 않았어요.");
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) throw new Error("CONTACT_ENCRYPTION_KEY는 32바이트를 base64로 인코딩한 값이어야 해요.");
  return buf;
}

/**
 * 재가입 제한 해시 키 (src/lib/safety/). CONTACT_ENCRYPTION_KEY에서 용도 이름을 붙여 따로 뽑아 연락처 암호화와 섞이지 않는다.
 * CONTACT_ENCRYPTION_KEY를 바꾸면 남아 있는 재가입 제한 기록과 맞지 않게 되니 바꾸지 않는다
 */
export function identityKey(): Buffer {
  return createHmac("sha256", key()).update("hangyeol:identity-ban:v1", "utf8").digest();
}

/** 'v1.<iv>.<tag>.<암호문>' (모두 base64url) */
export function encryptText(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), body.toString("base64url")].join(".");
}

export function decryptText(token: string): string {
  const [version, iv, tag, body] = token.split(".");
  if (version !== "v1" || !iv || !tag || !body) throw new Error("알 수 없는 암호문 형식");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
}
