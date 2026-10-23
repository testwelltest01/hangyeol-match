import { after, connection } from "next/server";
import { verifyRequests } from "@/lib/instagram/rules";
import { answerVerifyRequests, igSecrets, igVerifyToken } from "@/lib/instagram/server";
import { validSignature } from "@/lib/instagram/signature";
import { safeEqual } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";

// 메타(인스타그램) 웹훅. 한결 공식 인스타에 온 DM 중 '인증'·'코드' 같은 글이거나 한결 화면의 링크로 연 대화에
// 6자리 코드를 답장한다 (src/lib/instagram). 다른 문의 DM에는 끼어들지 않는다.

/** 메타 대시보드에서 웹훅 주소를 등록할 때 한 번 부른다: 같은 확인 문자열이면 challenge를 그대로 돌려준다 */
export async function GET(request: Request) {
  await connection();
  const url = new URL(request.url);
  const token = igVerifyToken();
  if (url.searchParams.get("hub.mode") === "subscribe" && token && safeEqual(url.searchParams.get("hub.verify_token") ?? "", token)) {
    return new Response(url.searchParams.get("hub.challenge") ?? "", { headers: { "content-type": "text/plain" } });
  }
  return new Response("Forbidden", { status: 403 });
}

/** 알림. 서명을 확인하고 바로 200을 돌려준 뒤 답장은 after()에서 (늦으면 메타가 다시 보낸다) */
export async function POST(request: Request) {
  await connection();
  const raw = await request.text();
  if (raw.length > 512_000) return new Response("Too large", { status: 413 });
  if (!validSignature(raw, request.headers.get("x-hub-signature-256"), igSecrets())) {
    return new Response("Invalid signature", { status: 401 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  const requests = verifyRequests(payload);
  if (requests.length) after(() => answerVerifyRequests(createAdminClient(), requests));
  return new Response("EVENT_RECEIVED");
}
