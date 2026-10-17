import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadMembers, loadReports } from "@/lib/admin/data";
import type { ExportData } from "@/lib/admin/workbook";
import { daysBefore, kstDay } from "@/lib/day";
import type { Answers } from "@/lib/items";
import { fetchAll } from "@/lib/match/server";
import type { Scores } from "@/lib/scoring";

/** 추천 기록은 많아지기 쉬워서 최근 기간만 담는다 */
const RECOMMENDATION_DAYS = 60;

export async function loadExportData(admin: SupabaseClient): Promise<ExportData> {
  const since = daysBefore(kstDay(), RECOMMENDATION_DAYS - 1);
  const [{ members, reactions }, reports, scores, answers, friendRatings, recommendations, feedback] = await Promise.all([
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
  };
}
