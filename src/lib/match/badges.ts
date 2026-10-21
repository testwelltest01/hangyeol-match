import "server-only";
import { cache } from "react";
import { chatState, myChatRooms, unreadCounts } from "@/lib/chat/server";
import { matchDay } from "@/lib/day";
import { pairStage, type Pair } from "@/lib/match/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";

/** 하단 탭 숫자: 내가 답할 차례인 것만 센다 */
export type TabBadges = { today: number; interest: number; chat: number };

type ReactionRow = { from_user: string; to_user: string; interest: boolean; accept: boolean | null; accept_at: string | null };

/**
 * 오늘: 오늘 추천 중 아직 답하지 않은 사람 / 관심: 서로 관심이라 내가 수락할 차례 / 대화: 안 읽은 메시지 + 연락처 전달 요청.
 * 탭 화면마다 부르므로 가벼운 질의만 쓰고, 한 요청 안에서는 한 번만 읽는다.
 */
export const loadTabBadges = cache(async (): Promise<TabBadges> => {
  const none = { today: 0, interest: 0, chat: 0 };
  const me = await getUserId();
  if (!me) return none;
  const admin = createAdminClient();
  const [reactions, blocks, recs, rooms] = await Promise.all([
    admin.from("reactions").select("from_user, to_user, interest, accept, accept_at").or(`from_user.eq.${me},to_user.eq.${me}`),
    admin.from("blocks").select("blocker, blocked").or(`blocker.eq.${me},blocked.eq.${me}`),
    admin.from("recommendations").select("target_id").eq("user_id", me).eq("day", matchDay()),
    myChatRooms(admin, me),
  ]);

  const rows = (reactions.data ?? []) as ReactionRow[];
  const mine = new Map(rows.filter((r) => r.from_user === me).map((r) => [r.to_user, r]));
  const theirs = new Map(rows.filter((r) => r.to_user === me).map((r) => [r.from_user, r]));
  const blocked = new Set((blocks.data ?? []).map((b) => (b.blocker === me ? b.blocked : b.blocker)));
  const pairOf = (other: string, recommended: boolean): Pair => ({
    mine: mine.get(other) ?? null,
    theirs: theirs.get(other) ?? null,
    blocked: blocked.has(other),
    recommended,
  });

  const today = (recs.data ?? []).filter((r) => pairStage(pairOf(r.target_id, true)) === "new").length;
  const others = new Set([...mine.keys(), ...theirs.keys()]);
  const interest = [...others].filter((o) => pairStage(pairOf(o, false)) === "photos").length;

  let chatCount = 0;
  const open = rooms.filter((r) => !r.closed_at);
  if (open.length) {
    const unread = await unreadCounts(admin, open, me);
    for (const room of open) {
      const s = chatState(room, me);
      chatCount += unread.get(room.id) ?? 0;
      if (s.contactTheirs && !s.contactMine && !s.exchanged) chatCount += 1;
    }
  }
  return { today, interest, chat: chatCount };
});
