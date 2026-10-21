import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { couponBalance } from "@/lib/match/rules";

/** 오늘의 추천 새로고침 쿠폰. available=false면 0008 SQL 전이라 기능을 숨긴다 */
export type CouponState = { available: boolean; friendRatings: number; used: number; balance: number; usedToday: boolean };

export async function loadCoupons(admin: SupabaseClient, userId: string, day: string): Promise<CouponState> {
  const [friends, uses] = await Promise.all([
    admin.from("friend_ratings").select("id", { count: "exact", head: true }).eq("user_id", userId),
    admin.from("recommendation_refreshes").select("day").eq("user_id", userId),
  ]);
  const friendRatings = friends.count ?? 0;
  if (uses.error || !uses.data) return { available: false, friendRatings, used: 0, balance: 0, usedToday: false };
  const used = uses.data.length;
  return {
    available: true,
    friendRatings,
    used,
    balance: couponBalance(friendRatings, used),
    usedToday: uses.data.some((u) => u.day === day),
  };
}
