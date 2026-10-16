import "server-only";
import { timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * 요청 횟수 제한. 같은 key로 windowSeconds 안에 limit번을 넘으면 false.
 * DB 함수(hit_rate_limit)가 없거나 오류가 나면 서비스가 멈추지 않도록 통과시키고 로그만 남긴다.
 */
export async function allow(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("hit_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("rate limit check failed", error.message);
    return true;
  }
  return data === true;
}

/** 요청한 사람의 IP. Vercel이 넣어주는 헤더를 쓴다 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export const TOO_MANY = "요청이 너무 많아요. 잠시 후 다시 시도해주세요.";

/** 비밀값 비교 (응답 시간으로 값을 추측하지 못하게) */
export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export { sniffImage, UUID_RE } from "@/lib/sniff";
