"use server";

import { headers } from "next/headers";
import { MAX_DEVICES_PER_USER, parseSubscription } from "@/lib/push/rules";
import { allow, TOO_MANY } from "@/lib/security";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserId } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

const NOT_READY = "알림 기능을 준비하고 있어요. 조금만 기다려주세요.";

/** 이 기기(브라우저)로 알림 받기. 같은 기기를 다른 계정이 쓰면 마지막에 로그인한 계정으로 옮긴다 */
export async function savePushSubscription(input: unknown): Promise<Result> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "로그인이 풀렸어요. 다시 로그인해주세요." };
  const sub = parseSubscription(input);
  if (!sub) return { ok: false, error: "이 브라우저에서는 알림을 켤 수 없어요." };
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return { ok: false, error: NOT_READY };
  if (!(await allow(`push:${userId}`, 30, 3600))) return { ok: false, error: TOO_MANY };

  const userAgent = ((await headers()).get("user-agent") ?? "").slice(0, 300) || null;
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin.from("push_subscriptions").upsert(
    { endpoint: sub.endpoint, user_id: userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth, user_agent: userAgent, updated_at: now },
    { onConflict: "endpoint" },
  );
  if (error) {
    console.error("push subscription save failed", error.message);
    return { ok: false, error: NOT_READY };
  }

  // 기기가 너무 많으면 오래된 것부터 정리한다
  const { data: rows } = await admin
    .from("push_subscriptions")
    .select("id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  const extra = (rows ?? []).slice(MAX_DEVICES_PER_USER).map((r) => r.id);
  if (extra.length) await admin.from("push_subscriptions").delete().in("id", extra);
  return { ok: true };
}

/** 이 기기에서 알림 끄기 */
export async function removePushSubscription(endpoint: unknown): Promise<Result> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "로그인이 풀렸어요. 다시 로그인해주세요." };
  if (typeof endpoint !== "string" || endpoint.length > 1000) return { ok: false, error: "잘못된 요청이에요." };
  // 저장할 때 주소를 URL 표준 모양으로 정리했으므로 둘 다 찾는다
  let normalized = endpoint;
  try {
    normalized = new URL(endpoint).toString();
  } catch {
    // 그대로 찾는다
  }
  const { error } = await createAdminClient()
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .in("endpoint", [...new Set([endpoint, normalized])]);
  if (error) return { ok: false, error: "알림을 끄지 못했어요. 다시 시도해주세요." };
  return { ok: true };
}
