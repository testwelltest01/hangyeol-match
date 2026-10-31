import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { identityKey } from "@/lib/crypto";
import { fetchAll } from "@/lib/match/server";
import { hashIdentity, type Identity, type IdentityKind } from "@/lib/safety/identity";
import { banExpiry, REJOIN_REASON } from "@/lib/safety/rules";

// 이용 정지와 재가입 제한 (DB 0010_safety.sql, 순수 함수 identity.ts)
// 정지하는 곳(관리자·신고 자동 정지·재가입 제한)은 모두 suspendUser / unsuspendUser를 쓴다.

type Admin = SupabaseClient;
type Hashed = { kind: IdentityKind; hash: string };

/**
 * 계정의 신원 해시. 지금은 로그인 이메일뿐이다.
 * 본인인증을 붙이면 인증 결과로 저장한 CI를 여기서 함께 읽어 kind 'ci'로 돌려준다(그 전까지는 extra로만 받는다).
 */
async function identitiesOf(admin: Admin, userId: string, extra: Identity[] = [], knownEmail?: string | null): Promise<Hashed[]> {
  const ids: Identity[] = [...extra];
  // 로그인 토큰에서 이메일을 이미 알면 Auth API를 부르지 않는다 (/start는 앱을 열 때마다 지나간다)
  const email = knownEmail ?? (await admin.auth.admin.getUserById(userId)).data?.user?.email;
  if (email) ids.push({ kind: "email", value: email });
  const key = identityKey();
  const out: Hashed[] = [];
  for (const id of ids) {
    const hash = hashIdentity(key, id);
    if (hash && !out.some((o) => o.kind === id.kind && o.hash === hash)) out.push({ kind: id.kind, hash });
  }
  return out;
}

async function recordBans(admin: Admin, userId: string, reason: string, extra: Identity[] = []): Promise<number> {
  const ids = await identitiesOf(admin, userId, extra);
  if (!ids.length) return 0;
  const { error } = await admin
    .from("identity_bans")
    .upsert(
      ids.map((i) => ({ kind: i.kind, hash: i.hash, user_id: userId, reason, expires_at: null })),
      { onConflict: "kind,hash" },
    );
  if (error) throw new Error(error.message);
  return ids.length;
}

/**
 * 이용 정지: 추천에서 빠지고 관심·수락·대화를 할 수 없다.
 * 정지하는 순간 재가입 제한도 기록해서, 이 상태로 탈퇴해도(계정이 지워져도) 같은 신원으로는 다시 이용하지 못한다.
 */
export async function suspendUser(admin: Admin, userId: string, reason: string, extra: Identity[] = []): Promise<boolean> {
  const now = new Date().toISOString();
  const { error } = await admin.from("user_flags").upsert({ user_id: userId, suspended_at: now, reason, updated_at: now });
  if (error) return false;
  // 기록에 실패해도 정지는 그대로 둔다. 빠진 기록은 크론(syncIdentityBans)이 채운다
  await recordBans(admin, userId, reason, extra).catch((e) => console.error("[safety] record bans failed", e));
  return true;
}

/** 정지 해제: 이 계정의 재가입 제한과, 같은 신원으로 남은 예전 계정의 기록도 함께 푼다 */
export async function unsuspendUser(admin: Admin, userId: string): Promise<boolean> {
  const now = new Date().toISOString();
  const { error } = await admin.from("user_flags").upsert({ user_id: userId, suspended_at: null, reason: null, updated_at: now });
  if (error) return false;
  try {
    await admin.from("identity_bans").delete().eq("user_id", userId);
    for (const id of await identitiesOf(admin, userId)) {
      await admin.from("identity_bans").delete().eq("kind", id.kind).eq("hash", id.hash);
    }
  } catch (e) {
    console.error("[safety] lift bans failed", e);
  }
  return true;
}

/**
 * 이 계정이 정지된 신원(정지 중인 다른 계정이나, 정지된 채 지워진 계정)과 같으면 '재가입 제한'으로 정지한다.
 * 가입 여부·정지 여부를 남에게 드러내지 않도록 가입 화면이 아니라, 이메일 코드로 본인임을 확인한 뒤(/start, 처음 정보 입력)에 부른다.
 * 본인인증을 붙이면 인증을 마친 자리에서 extra로 CI를 넘겨 다시 부른다. email은 로그인 토큰에 있으면 넘긴다(없으면 Auth에서 읽음).
 * 반환: 이 계정이 지금 정지 상태인지
 */
export async function enforceIdentityBan(
  admin: Admin,
  userId: string,
  opts: { email?: string | null; extra?: Identity[] } = {},
): Promise<boolean> {
  const extra = opts.extra ?? [];
  const ids = await identitiesOf(admin, userId, extra, opts.email);
  if (!ids.length) return false;
  const { data, error } = await admin
    .from("identity_bans")
    .select("kind, hash, user_id")
    .in("hash", ids.map((i) => i.hash));
  if (error || !data) return false;
  const hit = data.some((r) => r.user_id !== userId && ids.some((i) => i.kind === r.kind && i.hash === r.hash));
  if (!hit) return false;
  const { data: flag } = await admin.from("user_flags").select("suspended_at").eq("user_id", userId).maybeSingle();
  if (flag?.suspended_at) return true;
  console.info(`[safety] rejoin blocked ${userId}`);
  return suspendUser(admin, userId, REJOIN_REASON, extra);
}

/**
 * 크론: 재가입 제한 기록을 지금 정지 상태에 맞춘다.
 * - 정지됐는데 기록이 없는 계정(0010 전에 정지됐거나 기록에 실패함)은 채운다
 * - 정지가 풀린 계정의 기록은 지운다(SQL로 직접 푼 경우)
 * - 정지된 채 지워진 계정의 기록(user_id null)에 3년 뒤 파기일을 정하고, 지난 기록은 지운다
 */
export async function syncIdentityBans(admin: Admin): Promise<{ recorded: number; lifted: number; scheduled: number; purged: number }> {
  const [flags, bans] = await Promise.all([
    fetchAll<{ user_id: string; reason: string | null }>((a, b) =>
      admin.from("user_flags").select("user_id, reason").not("suspended_at", "is", null).range(a, b),
    ),
    fetchAll<{ user_id: string }>((a, b) => admin.from("identity_bans").select("user_id").not("user_id", "is", null).range(a, b)),
  ]);
  const suspended = new Map(flags.map((f) => [f.user_id, f.reason ?? "정지"]));
  const banned = new Set(bans.map((b) => b.user_id));

  let recorded = 0;
  for (const [userId, reason] of suspended) {
    if (!banned.has(userId)) recorded += await recordBans(admin, userId, reason).catch(() => 0);
  }

  let lifted = 0;
  const stale = [...banned].filter((id) => !suspended.has(id));
  for (let i = 0; i < stale.length; i += 100) {
    const { count } = await admin.from("identity_bans").delete({ count: "exact" }).in("user_id", stale.slice(i, i + 100));
    lifted += count ?? 0;
  }

  const { count: scheduled } = await admin
    .from("identity_bans")
    .update({ expires_at: banExpiry(new Date()).toISOString() }, { count: "exact" })
    .is("user_id", null)
    .is("expires_at", null);
  const { count: purged } = await admin.from("identity_bans").delete({ count: "exact" }).lt("expires_at", new Date().toISOString());
  return { recorded, lifted, scheduled: scheduled ?? 0, purged: purged ?? 0 };
}
