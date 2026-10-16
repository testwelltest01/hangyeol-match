import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

/** 서버 컴포넌트·서버 액션·라우트 핸들러용. 로그인한 사용자 권한(RLS)으로 동작한다. */
export async function createClient() {
  // 세션 확인(토큰 만료 시각 비교, 갱신)은 실제 요청 시점에만 해야 한다.
  // partialPrefetching이 켜져 있으면 cookies()가 미리 렌더링 단계에서도 풀리기 때문에,
  // connection()으로 이 아래 코드를 요청 시점으로 미룬다.
  await connection();
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // 서버 컴포넌트에서는 쿠키를 쓸 수 없다. 세션 갱신은 proxy.ts가 맡는다.
          }
        },
      },
    },
  );
}

/** 로그인한 사용자 id. 없으면 null */
export async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
}
