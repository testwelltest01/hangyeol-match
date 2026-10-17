import "server-only";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * 관리자 이메일. Vercel 환경 변수 ADMIN_EMAILS(쉼표로 여러 개)가 있으면 그것을 쓴다.
 * 이메일은 가입할 때 메일로 받은 코드로 주인임을 확인했고, 바꾸려면 새 주소에서 다시 확인해야 한다.
 */
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "testwelltest01@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: unknown): boolean {
  return typeof email === "string" && ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export type AdminUser = { userId: string; email: string };

/** 로그인한 사람이 관리자이면 정보를, 아니면 null. 비밀번호까지 만든 계정만 인정한다 */
export async function getAdmin(): Promise<AdminUser | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const sub = claims?.sub;
  const email = claims?.email;
  const meta = (claims?.user_metadata ?? {}) as Record<string, unknown>;
  if (typeof sub !== "string" || !isAdminEmail(email) || meta.password_set !== true) return null;
  return { userId: sub, email: String(email) };
}

/** 관리자 화면 전용. 관리자가 아니면 화면이 있다는 것도 알리지 않는다 */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdmin();
  if (!admin) notFound();
  return admin;
}
