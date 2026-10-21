import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { couponBalance } from "@/lib/match/rules";

/** 오늘의 추천 새로고침 쿠폰: 받은 친구 평가 수, 쓴 수, 남은 수, 오늘 썼는지 */
export type CouponState = { friendRatings: number; used: number; balance: number; usedToday: boolean };

export async function loadCoupons(admin: SupabaseClient, userId: string, day: string): Promise<CouponState> {
  const [friends, uses] = await Promise.all([
    admin.from("friend_ratings").select("id", { count: "exact", head: true }).eq("user_id", userId),
    admin.from("recommendation_refreshes").select("day").eq("user_id", userId),
  ]);
  const friendRatings = friends.count ?? 0;
  const rows = uses.data ?? [];
  return {
    friendRatings,
    used: rows.length,
    balance: couponBalance(friendRatings, rows.length),
    usedToday: rows.some((u) => u.day === day),
  };
}
