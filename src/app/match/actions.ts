"use server";

import { closeChatRoom, getChatRoom, openChatRoom } from "@/lib/chat/server";
import { pairContext } from "@/lib/match/context";
import { loadPair, pairStage, type PairStage } from "@/lib/match/server";
import { REPORT_REASONS, type ReportReason } from "@/lib/match/safety";
import { allow, TOO_MANY } from "@/lib/security";

type Result = { ok: true; stage?: PairStage } | { ok: false; error: string };

const context = (targetId: unknown) => pairContext(targetId);

/** 관심 있어요 / 넘기기 / 수락 / 거절 */
const KINDS = ["interest", "pass", "accept", "decline"] as const;

export async function react(targetId: string, kind: (typeof KINDS)[number]): Promise<Result> {
  if (!KINDS.includes(kind)) return { ok: false, error: "잘못된 요청이에요." };
  const ctx = await context(targetId);
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const { userId, admin, stage } = ctx;
  const now = new Date().toISOString();

  if (kind === "interest" || kind === "pass") {
    if (stage !== "new") return { ok: false, error: "이미 답했거나 볼 수 없는 사람이에요." };
    const { error } = await admin
      .from("reactions")
      .upsert({ from_user: userId, to_user: targetId, interest: kind === "interest", interest_at: now });
    if (error) return { ok: false, error: "저장하지 못했어요. 다시 시도해주세요." };
  } else {
    if (stage !== "photos") return { ok: false, error: "지금은 수락할 수 없어요." };
    const { error } = await admin
      .from("reactions")
      .update({ accept: kind === "accept", accept_at: now })
      .eq("from_user", userId)
      .eq("to_user", targetId);
    if (error) return { ok: false, error: "저장하지 못했어요. 다시 시도해주세요." };
  }
  const after = await loadPair(admin, userId, targetId);
  const stageAfter = pairStage(after);
  // 서로 수락하면 대화방이 열린다 (0005 SQL 전이면 조용히 넘어간다)
  if (stageAfter === "connected") await openChatRoom(admin, userId, targetId);
  return { ok: true, stage: stageAfter };
}

/** 차단: 서로 더 이상 추천되지 않고, 진행 중인 연결도 양쪽에서 사라진다 */
export async function blockUser(targetId: string): Promise<Result> {
  const ctx = await context(targetId);
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const { error } = await ctx.admin.from("blocks").upsert({ blocker: ctx.userId, blocked: targetId });
  if (error) return { ok: false, error: "차단하지 못했어요. 다시 시도해주세요." };
  await closeChatRoom(ctx.admin, ctx.userId, targetId, "blocked");
  return { ok: true };
}

/** 신고 3건이 쌓이면 운영자가 확인할 때까지 매칭을 자동으로 멈춘다 */
const AUTO_SUSPEND_REPORTERS = 3;

export async function reportUser(targetId: string, reason: ReportReason, detail: string): Promise<Result> {
  const ctx = await context(targetId);
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  const { userId, admin, pair, stage } = ctx;
  const validReason = reason === "contact_not_found" || REPORT_REASONS.some((r) => r.id === reason);
  if (!validReason) return { ok: false, error: "신고 사유를 골라주세요." };
  if (typeof detail !== "string") return { ok: false, error: "잘못된 요청이에요." };
  if (!(await allow(`report:${userId}`, 20, 86400))) return { ok: false, error: TOO_MANY };
  // 추천받았거나 관심·수락으로 이어진 사람만 신고할 수 있다
  if (!pair.recommended && !pair.mine && !pair.theirs) return { ok: false, error: "신고할 수 없는 사람이에요." };
  if (reason === "contact_not_found") {
    // 대화방이 있으면 연락처를 서로 전달한 뒤에만, 없으면(0005 전) 서로 수락한 뒤에만
    const room = await getChatRoom(admin, userId, targetId);
    const exchanged = room.available ? Boolean(room.room?.exchanged_at) : stage === "connected";
    if (!exchanged) return { ok: false, error: "연락처가 공개된 뒤에 알려주세요." };
  }

  const { error } = await admin
    .from("reports")
    .insert({ reporter: userId, target: targetId, reason, detail: detail.trim().slice(0, 500) || null });
  if (error) return { ok: false, error: "신고하지 못했어요. 다시 시도해주세요." };

  // "ID로 찾을 수 없어요"는 상대가 고치면 되는 일이라 차단하지 않는다
  if (reason !== "contact_not_found") {
    await admin.from("blocks").upsert({ blocker: userId, blocked: targetId });
    await closeChatRoom(admin, userId, targetId, "reported");
    const { data: reports } = await admin
      .from("reports")
      .select("reporter")
      .eq("target", targetId)
      .is("resolved_at", null)
      .neq("reason", "contact_not_found");
    const reporters = new Set((reports ?? []).map((r) => r.reporter).filter(Boolean));
    if (reporters.size >= AUTO_SUSPEND_REPORTERS) {
      await admin.from("user_flags").upsert({
        user_id: targetId,
        suspended_at: new Date().toISOString(),
        reason: `자동: 신고 ${reporters.size}건`,
        updated_at: new Date().toISOString(),
      });
    }
  }
  return { ok: true };
}

export type MeetingInput = {
  outcome: "met" | "not_yet" | "no_contact" | "no_show";
  photo_match?: number;
  cleanliness?: number;
  manners?: number;
  again?: number;
};

const rating = (v: unknown) => (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 5 ? (v as number) : null);

/** 만남 후 피드백. 상대에게 보이지 않고, 쌓이면 3층 게이트(노출 조정)에 쓰인다 */
export async function saveMeetingFeedback(targetId: string, input: MeetingInput): Promise<Result> {
  const ctx = await context(targetId);
  if ("error" in ctx) return { ok: false, error: ctx.error! };
  if (ctx.stage !== "connected") return { ok: false, error: "연락처가 공개된 사람에게만 남길 수 있어요." };
  if (!input || typeof input !== "object" || !["met", "not_yet", "no_contact", "no_show"].includes(input.outcome)) return { ok: false, error: "만남 여부를 골라주세요." };

  const met = input.outcome === "met";
  const row = {
    from_user: ctx.userId,
    to_user: targetId,
    outcome: input.outcome,
    photo_match: met ? rating(input.photo_match) : null,
    cleanliness: met ? rating(input.cleanliness) : null,
    manners: met ? rating(input.manners) : null,
    again: met ? rating(input.again) : null,
    updated_at: new Date().toISOString(),
  };
  if (met && [row.photo_match, row.cleanliness, row.manners, row.again].some((v) => v === null)) {
    return { ok: false, error: "네 문항에 모두 답해주세요." };
  }
  const { error } = await ctx.admin.from("meeting_feedback").upsert(row);
  return error ? { ok: false, error: "저장하지 못했어요. 다시 시도해주세요." } : { ok: true };
}
