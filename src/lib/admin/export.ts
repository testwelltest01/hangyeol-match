import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadMembers, loadReports } from "@/lib/admin/data";
import type { ExportData } from "@/lib/admin/workbook";
import { daysBefore, kstDay } from "@/lib/day";
import type { Answers } from "@/lib/items";
import { fetchAll } from "@/lib/match/server";
import { loadAllLove } from "@/lib/love/server";
import type { Scores } from "@/lib/scoring";

/** 추천 기록은 많아지기 쉬워서 최근 기간만 담는다 */
const RECOMMENDATION_DAYS = 60;

export async function loadExportData(admin: SupabaseClient): Promise<ExportData> {
  const since = daysBefore(kstDay(), RECOMMENDATION_DAYS - 1);
  const [{ members, reactions }, reports, scores, answers, friendRatings, recommendations, feedback, extras, chatRooms, chatMessages, chatEvents, love] =
    await Promise.all([
    loadMembers(admin),
    loadReports(admin),
    fetchAll<ExportData["scores"][number]>((a, b) =>
      admin.from("test_scores").select("user_id, version, computed_at, scores").order("computed_at").range(a, b),
    ),
    fetchAll<{ user_id: string; version: string; completed_at: string | null; answers: Answers }>((a, b) =>
      admin.from("test_answers").select("user_id, version, completed_at, answers").order("updated_at").range(a, b),
    ),
    fetchAll<{ id: number; user_id: string; created_at: string; answers: Answers }>((a, b) =>
      admin.from("friend_ratings").select("id, user_id, created_at, answers").order("id").range(a, b),
    ),
    fetchAll<ExportData["recommendations"][number]>((a, b) =>
      admin
        .from("recommendations")
        .select("day, user_id, target_id, score")
        .gte("day", since)
        .order("day", { ascending: false })
        .order("user_id")
        .range(a, b),
    ),
    fetchAll<ExportData["feedback"][number]>((a, b) =>
      admin
        .from("meeting_feedback")
        .select("from_user, to_user, outcome, photo_match, cleanliness, manners, again, created_at, updated_at")
        .order("created_at")
        .range(a, b),
    ),
    fetchAll<ExportData["extras"][number]>((a, b) =>
      admin.from("extra_results").select("user_id, test_id, version, answers, scores, share, completed_at").order("completed_at").range(a, b),
    ),
    // 대화는 메타데이터만. 메시지 내용(body)은 읽지 않는다
    fetchAll<ExportData["chatRooms"][number]>((a, b) =>
      admin
        .from("chat_rooms")
        .select("id, user_a, user_b, opened_at, first_message_at, last_message_at, count_a, count_b, contact_a_at, contact_b_at, exchanged_at, closed_at, close_reason")
        .order("opened_at")
        .range(a, b),
    ),
    fetchAll<ExportData["chatMessages"][number]>((a, b) =>
      admin
        .from("chat_messages")
        .select("id, room_id, sender, room_seq, sender_seq, turn, char_count, response_seconds, created_at")
        .order("id")
        .range(a, b),
    ),
    fetchAll<ExportData["chatEvents"][number]>((a, b) =>
      admin.from("chat_events").select("id, room_id, user_id, kind, created_at").order("id").range(a, b),
    ),
    // 연애 상황 보고서는 응답·점수·상태만 (보고서 글은 읽지 않는다)
    loadAllLove(admin),
  ]);

  return {
    generatedAt: new Date(),
    members,
    scores: scores.map((s) => ({ ...s, scores: s.scores as Scores })),
    answers,
    friendRatings,
    reactions,
    recommendations,
    recommendationDays: RECOMMENDATION_DAYS,
    feedback,
    reports,
    chatRooms,
    chatMessages,
    chatEvents,
    extras,
    love,
  };
}
