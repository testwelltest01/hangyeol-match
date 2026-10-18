import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { pushMessages, shouldNotifyChat, type PushMessage } from "@/lib/push/rules";

// 알림(웹 푸시) 보내기. 키가 없거나(환경 변수) 0007 SQL 전이면 조용히 아무것도 하지 않는다.
// 환경 변수: NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, (선택) VAPID_SUBJECT

type Admin = SupabaseClient;

const SITE = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://hangyeol-match.vercel.app";

let ready: boolean | null = null;
function setup(): boolean {
  if (ready !== null) return ready;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return (ready = false);
  try {
    // 푸시 서버에 알리는 연락처. 개인 이메일 대신 서비스 주소를 쓴다
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || SITE, pub, priv);
    ready = true;
  } catch (e) {
    console.error("web push setup failed", e instanceof Error ? e.message : e);
    ready = false;
  }
  return ready;
}

/** 한 사람의 모든 기기로 알림을 보낸다. 없어진 구독(404·410)은 지운다 */
export async function sendPush(admin: Admin, userId: string, message: PushMessage): Promise<void> {
  if (!setup()) return;
  const { data, error } = await admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", userId);
  if (error || !data?.length) return;
  const payload = JSON.stringify(message);
  await Promise.all(
    data.map(async (s) => {
      try {
        // 하루 안에 전달 못 하면 버린다 (오래된 알림은 의미가 없다)
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          TTL: 86400,
          urgency: "normal",
        });
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await admin.from("push_subscriptions").delete().eq("id", s.id);
        else console.error("web push failed", status ?? (e instanceof Error ? e.message : e));
      }
    }),
  );
}

async function nickname(admin: Admin, userId: string): Promise<string | null> {
  const { data } = await admin.from("profiles").select("nickname").eq("id", userId).maybeSingle();
  return data?.nickname ?? null;
}

/** from이 한 일을 to에게 알린다. 알림은 응답을 보낸 뒤 after()에서 부른다 */
export async function notifyPair(
  admin: Admin,
  from: string,
  to: string,
  kind: "mutualInterest" | "connectedChat" | "connectedContact" | "contactRequest" | "contactExchanged",
): Promise<void> {
  if (!setup()) return;
  const name = await nickname(admin, from);
  if (!name) return;
  const message =
    kind === "mutualInterest"
      ? pushMessages.mutualInterest(name, from)
      : kind === "connectedChat"
        ? pushMessages.connected(name, from, true)
        : kind === "connectedContact"
          ? pushMessages.connected(name, from, false)
          : kind === "contactRequest"
            ? pushMessages.contactRequest(name, from)
            : pushMessages.contactExchanged(name, from);
  await sendPush(admin, to, message);
}

/** 새 메시지 알림. 상대가 대화 중이거나 이미 안 읽은 내 메시지가 있으면 보내지 않는다 */
export async function notifyChatMessage(admin: Admin, roomId: string, from: string, to: string, messageId: number): Promise<void> {
  if (!setup()) return;
  const { data: read } = await admin
    .from("chat_reads")
    .select("last_read_id, updated_at")
    .eq("room_id", roomId)
    .eq("user_id", to)
    .maybeSingle();
  const { count } = await admin
    .from("chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId)
    .eq("sender", from)
    .gt("id", read?.last_read_id ?? 0)
    .lt("id", messageId);
  if (!shouldNotifyChat({ earlierUnreadFromSender: count ?? 0, receiverReadAt: read?.updated_at ?? null, now: Date.now() })) return;
  const name = await nickname(admin, from);
  if (name) await sendPush(admin, to, pushMessages.chatMessage(name, from));
}
