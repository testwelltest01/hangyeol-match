import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { listAuthUsers } from "@/lib/admin/data";
import type { GenderKey, Metric, TrendEvent } from "@/lib/admin/trends";
import { fetchAll } from "@/lib/match/server";

type Admin = SupabaseClient;

/** 회원 id → 성별. 프로필이 없으면 미입력 */
export async function loadGenderOf(admin: Admin): Promise<(id: string) => GenderKey> {
  const rows = await fetchAll<{ id: string; gender: "male" | "female" }>((a, b) =>
    admin.from("profiles").select("id, gender").range(a, b),
  );
  const map = new Map(rows.map((r) => [r.id, r.gender]));
  return (id) => map.get(id) ?? "unknown";
}

/**
 * 지표별 기록 (since 이후). 방문 기록은 0003 SQL을 실행해야 생기므로, 테이블이 없으면 available=false.
 */
export async function loadTrendEvents(admin: Admin, metric: Metric, since: string): Promise<{ events: TrendEvent[]; available: boolean }> {
  const read = async <T,>(make: (a: number, b: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) =>
    fetchAll<T>(make);
  switch (metric) {
    case "visit": {
      try {
        const rows = await read<{ user_id: string; created_at: string }>((a, b) =>
          admin.from("activity_events").select("user_id, created_at").eq("kind", "visit").gte("created_at", since).order("id").range(a, b),
        );
        return { events: rows.map((r) => ({ userId: r.user_id, at: r.created_at })), available: true };
      } catch {
        return { events: [], available: false };
      }
    }
    case "signup": {
      const users = await listAuthUsers(admin);
      return { events: users.filter((u) => u.created_at >= since).map((u) => ({ userId: u.id, at: u.created_at })), available: true };
    }
    case "test": {
      const rows = await read<{ user_id: string; computed_at: string }>((a, b) =>
        admin.from("test_scores").select("user_id, computed_at").gte("computed_at", since).range(a, b),
      );
      return { events: rows.map((r) => ({ userId: r.user_id, at: r.computed_at })), available: true };
    }
    case "interest": {
      const rows = await read<{ from_user: string; interest_at: string }>((a, b) =>
        admin.from("reactions").select("from_user, interest_at").eq("interest", true).gte("interest_at", since).range(a, b),
      );
      return { events: rows.map((r) => ({ userId: r.from_user, at: r.interest_at })), available: true };
    }
    case "accept": {
      const rows = await read<{ from_user: string; accept_at: string }>((a, b) =>
        admin.from("reactions").select("from_user, accept_at").eq("accept", true).gte("accept_at", since).range(a, b),
      );
      return { events: rows.map((r) => ({ userId: r.from_user, at: r.accept_at })), available: true };
    }
    case "photo": {
      const rows = await read<{ user_id: string; created_at: string }>((a, b) =>
        admin.from("photo_attempts").select("user_id, created_at").in("result", ["registered", "rejected"]).gte("created_at", since).order("id").range(a, b),
      );
      return { events: rows.map((r) => ({ userId: r.user_id, at: r.created_at })), available: true };
    }
    case "friend": {
      const rows = await read<{ user_id: string; created_at: string }>((a, b) =>
        admin.from("friend_ratings").select("user_id, created_at").gte("created_at", since).order("id").range(a, b),
      );
      return { events: rows.map((r) => ({ userId: r.user_id, at: r.created_at })), available: true };
    }
  }
}
