"use server";

import { after } from "next/server";
import { chatState, getChatRoom, openChatRoom, type ChatMessageView, type ChatState } from "@/lib/chat/server";
import { checkChatMessage, MESSAGES_PER_PERSON } from "@/lib/chat/rules";
import { pairContext } from "@/lib/match/context";
import { notifyChatMessage, notifyPair } from "@/lib/push/server";
import { allow } from "@/lib/security";

type Fail = { ok: false; error: string };

const STATUS_ERROR: Record<string, string> = {
  limit: `메시지는 한 사람당 ${MESSAGES_PER_PERSON}개까지 보낼 수 있어요. 더 이야기하고 싶으면 '연락처 전달'을 눌러보세요.`,
  closed: "대화가 닫혀서 더 보낼 수 없어요.",
  no_room: "대화방을 찾을 수 없어요.",
  not_member: "대화방을 찾을 수 없어요.",
};

async function roomFor(otherId: unknown, limitKey: string) {
  const ctx = await pairContext(otherId, { key: limitKey, count: 40, seconds: 60 });
  if ("error" in ctx) return { error: ctx.error! } as const;
  if (ctx.stage !== "connected") return { error: "서로 수락한 사람과만 대화할 수 있어요." } as const;
  const other = otherId as string;
  const room = (await getChatRoom(ctx.admin, ctx.userId, other)) ?? (await openChatRoom(ctx.admin, ctx.userId, other));
  if (!room) return { error: "대화방을 열지 못했어요. 다시 시도해주세요." } as const;
  return { ...ctx, room } as const;
}

/** 메시지 보내기. 한도와 순번은 DB 함수가 방을 잠그고 지킨다 */
export async function sendChatMessage(otherId: string, text: string): Promise<{ ok: true; message: ChatMessageView } | Fail> {
  if (typeof text !== "string") return { ok: false, error: "잘못된 요청이에요." };
  const problem = checkChatMessage(text);
  if (problem) return { ok: false, error: problem };
  const r = await roomFor(otherId, "chat");
  if ("error" in r) return { ok: false, error: r.error ?? "잘못된 요청이에요." };

  const body = text.trim();
  const { data, error } = await r.admin.rpc("send_chat_message", {
    p_room: r.room.id,
    p_sender: r.userId,
    p_body: body,
    p_limit: MESSAGES_PER_PERSON,
  });
  const row = Array.isArray(data) ? data[0] : null;
  if (error || !row) return { ok: false, error: "보내지 못했어요. 다시 시도해주세요." };
  if (row.status !== "ok") return { ok: false, error: STATUS_ERROR[row.status] ?? "보내지 못했어요." };
  // 상대가 대화 중이 아닐 때만 알린다 (응답을 보낸 뒤)
  after(() => notifyChatMessage(r.admin, r.room.id, r.userId, otherId, row.message_id));
  return { ok: true, message: { id: row.message_id, mine: true, body, at: row.created_at } };
}

/** 연락처 전달 누르기 / 취소. 둘 다 누르면 바로 교환된다 */
export async function setContactShare(otherId: string, on: boolean): Promise<{ ok: true; state: ChatState } | Fail> {
  if (typeof on !== "boolean") return { ok: false, error: "잘못된 요청이에요." };
  const r = await roomFor(otherId, "contact");
  if ("error" in r) return { ok: false, error: r.error ?? "잘못된 요청이에요." };
  if (on) {
    const { data: contact } = await r.admin.from("contacts").select("user_id").eq("user_id", r.userId).maybeSingle();
    if (!contact) return { ok: false, error: "내 정보에서 연락처를 먼저 등록해주세요." };
  }
  const { data, error } = await r.admin.rpc("set_contact_request", { p_room: r.room.id, p_user: r.userId, p_on: on });
  const row = Array.isArray(data) ? data[0] : null;
  if (error || !row) return { ok: false, error: "저장하지 못했어요. 다시 시도해주세요." };
  if (row.status === "closed") return { ok: false, error: "대화가 닫혀서 연락처를 주고받을 수 없어요." };
  if (row.status !== "ok") return { ok: false, error: "대화방을 찾을 수 없어요." };
  const updated = await getChatRoom(r.admin, r.userId, otherId);
  const state = chatState(updated ?? r.room, r.userId);
  if (on) {
    // 눌렀다 취소하기를 반복해도 요청 알림은 하루 3번까지만
    after(async () => {
      if (state.exchanged) await notifyPair(r.admin, r.userId, otherId, "contactExchanged");
      else if (await allow(`push-contact:${r.userId}:${otherId}`, 3, 86400)) await notifyPair(r.admin, r.userId, otherId, "contactRequest");
    });
  }
  return { ok: true, state };
}
