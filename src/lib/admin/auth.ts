import "server-only";
import { notFound } from "next/navigation";
import { isAdminEmail } from "@/lib/admin/emails";
import { createClient } from "@/lib/supabase/server";

export { isAdminEmail };

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
