import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatRoomMeta } from "@/lib/chat/metrics";
import { MESSAGES_PER_PERSON, orderPair } from "@/lib/chat/rules";

type Admin = SupabaseClient;

export type ChatRoom = ChatRoomMeta;

const ROOM_COLUMNS =
  "id, user_a, user_b, opened_at, first_message_at, last_message_at, count_a, count_b, contact_a_at, contact_b_at, exchanged_at, closed_at, close_reason";

/** 두 사람의 대화방 (서로 수락하면 열린다). 없으면 null */
export async function getChatRoom(admin: Admin, me: string, other: string): Promise<ChatRoom | null> {
  const [a, b] = orderPair(me, other);
  const { data } = await admin.from("chat_rooms").select(ROOM_COLUMNS).eq("user_a", a).eq("user_b", b).maybeSingle();
  return (data as ChatRoom | null) ?? null;
}

/** 방 열기 (이미 있으면 그대로). 실패해도 수락 자체는 되돌리지 않는다 */
export async function openChatRoom(admin: Admin, me: string, other: string): Promise<ChatRoom | null> {
  const { error } = await admin.rpc("open_chat_room", { p_x: me, p_y: other });
  if (error) {
    console.warn("open_chat_room skipped:", error.message);
    return null;
  }
  return getChatRoom(admin, me, other);
}

/** 차단·신고로 방 닫기 */
export async function closeChatRoom(admin: Admin, me: string, other: string, reason: "blocked" | "reported"): Promise<void> {
  const room = await getChatRoom(admin, me, other);
  if (!room || room.closed_at) return;
  await admin.from("chat_rooms").update({ closed_at: new Date().toISOString(), close_reason: reason }).eq("id", room.id);
  await admin.from("chat_events").insert({ room_id: room.id, user_id: me, kind: "closed" });
}

/** 화면에 주는 방 상태 (상대 id 같은 내부 값은 넣지 않는다) */
export type ChatState = {
  myCount: number;
  theirCount: number;
  limit: number;
  contactMine: boolean;
  contactTheirs: boolean;
  exchanged: boolean;
  closed: boolean;
};

export function chatState(room: ChatRoom, me: string): ChatState {
  const isA = room.user_a === me.toLowerCase();
  return {
    myCount: isA ? room.count_a : room.count_b,
    theirCount: isA ? room.count_b : room.count_a,
    limit: MESSAGES_PER_PERSON,
    contactMine: Boolean(isA ? room.contact_a_at : room.contact_b_at),
    contactTheirs: Boolean(isA ? room.contact_b_at : room.contact_a_at),
    exchanged: Boolean(room.exchanged_at),
    closed: Boolean(room.closed_at),
  };
}

export type ChatMessageView = { id: number; mine: boolean; body: string | null; at: string };

/** afterId보다 새 메시지 */
export async function loadChatMessages(admin: Admin, roomId: string, me: string, afterId = 0): Promise<ChatMessageView[]> {
  const { data } = await admin
    .from("chat_messages")
    .select("id, sender, body, created_at")
    .eq("room_id", roomId)
    .gt("id", afterId)
    .order("id")
    .limit(200);
  return (data ?? []).map((m) => ({ id: m.id as number, mine: m.sender === me, body: m.body as string | null, at: m.created_at as string }));
}

/** 내가 어디까지 읽었는지 남기고, 상대가 어디까지 읽었는지 돌려준다 */
export async function syncReads(admin: Admin, room: ChatRoom, me: string, lastSeenId: number): Promise<number> {
  const other = room.user_a === me ? room.user_b : room.user_a;
  const [{ data: mine }, { data: theirs }] = await Promise.all([
    admin.from("chat_reads").select("last_read_id").eq("room_id", room.id).eq("user_id", me).maybeSingle(),
    admin.from("chat_reads").select("last_read_id").eq("room_id", room.id).eq("user_id", other).maybeSingle(),
  ]);
  if (lastSeenId > (mine?.last_read_id ?? 0)) {
    await admin
      .from("chat_reads")
      .upsert({ room_id: room.id, user_id: me, last_read_id: lastSeenId, updated_at: new Date().toISOString() });
  }
  return theirs?.last_read_id ?? 0;
}

/** 내 대화방들의 안 읽은 메시지 수 (방 id → 수) */
export async function unreadCounts(admin: Admin, rooms: ChatRoom[], me: string): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!rooms.length) return out;
  const ids = rooms.map((r) => r.id);
  const [{ data: reads }, { data: msgs }] = await Promise.all([
    admin.from("chat_reads").select("room_id, last_read_id").eq("user_id", me).in("room_id", ids),
    admin.from("chat_messages").select("room_id, id").in("room_id", ids).neq("sender", me),
  ]);
  const read = new Map((reads ?? []).map((r) => [r.room_id as string, r.last_read_id as number]));
  for (const m of msgs ?? []) {
    if ((m.id as number) > (read.get(m.room_id as string) ?? 0)) out.set(m.room_id as string, (out.get(m.room_id as string) ?? 0) + 1);
  }
  return out;
}

/** 내가 들어 있는 대화방 전체 */
export async function myChatRooms(admin: Admin, me: string): Promise<ChatRoom[]> {
  const { data } = await admin.from("chat_rooms").select(ROOM_COLUMNS).or(`user_a.eq.${me},user_b.eq.${me}`);
  return (data ?? []) as ChatRoom[];
}
