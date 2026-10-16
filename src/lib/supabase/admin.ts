import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * secret key로 RLS를 우회하는 서버 전용 클라이언트.
 * 점수 저장, 친구 평가 저장·집계처럼 사용자가 직접 쓰면 안 되는 작업에만 쓴다.
 */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
