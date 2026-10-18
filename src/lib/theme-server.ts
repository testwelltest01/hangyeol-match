import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";
import { themeFor, type Theme } from "@/lib/theme";

/** 로그인한 회원의 성별 테마. 한 요청 안에서는 한 번만 읽는다 */
export const loadMyTheme = cache(async (): Promise<Theme | null> => {
  const me = await getUserId();
  if (!me) return null;
  const { data } = await createAdminClient().from("profiles").select("gender").eq("id", me).maybeSingle();
  return themeFor(data?.gender);
});
