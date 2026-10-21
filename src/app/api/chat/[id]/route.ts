import { chatState, getChatRoom, loadChatMessages, openChatRoom, syncReads } from "@/lib/chat/server";
import { loadPair, pairStage } from "@/lib/match/server";
import { allow, UUID_RE } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" } });

/**
 * 대화방 새 메시지 받기 (화면이 몇 초마다 부른다). ?after=마지막으로 받은 메시지 id
 * 서버 액션은 한 번에 하나씩만 실행돼서 보내기를 막을 수 있으니, 받기는 GET으로 따로 둔다.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/chat/[id]">) {
  const userId = await getUserId();
  if (!userId) return json({ error: "로그인이 필요해요." }, 401);
  const { id: other } = await ctx.params;
  if (!UUID_RE.test(other) || other === userId) return json({ error: "잘못된 요청이에요." }, 400);
  if (!(await allow(`chatpoll:${userId}`, 900, 600))) return json({ error: "요청이 너무 많아요." }, 429);

  const admin = createAdminClient();
  const stage = pairStage(await loadPair(admin, userId, other));
  if (stage !== "connected") return json({ error: "대화방을 찾을 수 없어요." }, 404);
  const room = (await getChatRoom(admin, userId, other)) ?? (await openChatRoom(admin, userId, other));
  if (!room) return json({ error: "대화방을 열지 못했어요." }, 500);

  const after = Math.max(0, Number.parseInt(new URL(request.url).searchParams.get("after") ?? "0", 10) || 0);
  const messages = await loadChatMessages(admin, room.id, userId, after);
  const lastSeen = Math.max(after, ...messages.map((m) => m.id));
  const theirRead = await syncReads(admin, room, userId, lastSeen);
  return json({ messages, state: chatState(room, userId), theirRead });
}
