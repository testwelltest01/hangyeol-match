import "server-only";
import { createHash, randomInt } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeInstagram } from "@/lib/contact";
import { decryptText, encryptText } from "@/lib/crypto";
import { allow } from "@/lib/security";
import { codeReply, IG_CODE_LENGTH, IG_CODE_TTL_MINUTES, officialUsername, type VerifyRequest } from "./rules";

// 인스타그램 계정 확인: 메타 Instagram API(인스타그램 로그인 방식)로 공식 계정의 DM에 답장한다.
// 환경 변수
//   NEXT_PUBLIC_INSTAGRAM_USERNAME  한결 공식 인스타 아이디 (없으면 화면에 확인 칸이 안 보인다)
//   INSTAGRAM_ACCESS_TOKEN          공식 계정의 장기 토큰(60일). 크론이 7일마다 갱신해 instagram_tokens에 암호화해 둔다
//   INSTAGRAM_APP_SECRET            웹훅 서명 확인 (인스타그램 앱 시크릿. 메타 앱 시크릿은 META_APP_SECRET에 넣어도 된다)
//   INSTAGRAM_VERIFY_TOKEN          웹훅 주소를 등록할 때 메타 대시보드에 같이 넣는 아무 문자열
//   INSTAGRAM_API_VERSION           기본 v26.0

const API_VERSION = () => process.env.INSTAGRAM_API_VERSION?.trim() || "v26.0";
const base = () => `https://graph.instagram.com/${API_VERSION()}`;
const TIMEOUT_MS = 10_000;
/** 토큰은 60일짜리라 7일마다 새로 받는다 (24시간이 지난 토큰만 갱신할 수 있다) */
const REFRESH_EVERY_DAYS = 7;

export function igSecrets(): string[] {
  return [process.env.INSTAGRAM_APP_SECRET, process.env.META_APP_SECRET].map((s) => s?.trim() ?? "").filter(Boolean);
}

export function igVerifyToken(): string | null {
  return process.env.INSTAGRAM_VERIFY_TOKEN?.trim() || null;
}

export function igOfficial(): string | null {
  return officialUsername(process.env.NEXT_PUBLIC_INSTAGRAM_USERNAME);
}

const fingerprint = (t: string) => createHash("sha256").update(t).digest("hex").slice(0, 16);

type TokenRow = { token: string; seed: string; refreshed_at: string; expires_at: string | null };

async function tokenRow(admin: SupabaseClient): Promise<TokenRow | null> {
  const { data } = await admin.from("instagram_tokens").select("token, seed, refreshed_at, expires_at").eq("id", 1).maybeSingle();
  return (data as TokenRow | null) ?? null;
}

/** 저장해 둔(갱신된) 토큰. 환경 변수를 새 토큰으로 바꿨으면 환경 변수를 쓴다 */
function pickToken(row: TokenRow | null): { token: string; source: "db" | "env" } | null {
  const seed = process.env.INSTAGRAM_ACCESS_TOKEN?.trim() || null;
  if (row && (!seed || row.seed === fingerprint(seed))) {
    try {
      return { token: decryptText(row.token), source: "db" };
    } catch {
      // 암호화 키가 바뀌었으면 환경 변수로
    }
  }
  return seed ? { token: seed, source: "env" } : null;
}

export async function igAccessToken(admin: SupabaseClient): Promise<string | null> {
  return pickToken(await tokenRow(admin))?.token ?? null;
}

async function call(url: string, init: RequestInit & { token: string }): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  const { token, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers: { Authorization: `Bearer ${token}`, ...(rest.body ? { "Content-Type": "application/json" } : {}) },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, json };
}

const apiError = (r: { status: number; json: Record<string, unknown> }) => {
  const e = r.json.error as { message?: string; code?: number } | undefined;
  return `HTTP ${r.status}${e?.code ? ` (${e.code})` : ""}${e?.message ? `: ${e.message.slice(0, 160)}` : ""}`;
};

/** 메시지를 보낸 사람(IGSID)의 인스타 아이디. 그 사람이 먼저 메시지를 보냈을 때만 메타가 알려준다 */
async function igUsername(token: string, igsid: string): Promise<string | null> {
  const r = await call(`${base()}/${encodeURIComponent(igsid)}?fields=username`, { token });
  if (!r.ok) {
    console.error("[instagram] username lookup failed", apiError(r));
    return null;
  }
  const v = typeof r.json.username === "string" ? normalizeInstagram(r.json.username) : null;
  return v || null;
}

async function igSendText(token: string, igsid: string, text: string): Promise<boolean> {
  const r = await call(`${base()}/me/messages`, { token, method: "POST", body: JSON.stringify({ recipient: { id: igsid }, message: { text } }) });
  if (!r.ok) console.error("[instagram] send failed", apiError(r));
  return r.ok;
}

/** 웹훅이 고른 요청마다 코드를 만들어 DM으로 답장한다 (응답 뒤 after()에서) */
export async function answerVerifyRequests(admin: SupabaseClient, requests: VerifyRequest[]): Promise<void> {
  if (!requests.length) return;
  const token = await igAccessToken(admin);
  if (!token) {
    console.error("[instagram] INSTAGRAM_ACCESS_TOKEN이 없어 답장하지 못했어요.");
    return;
  }
  for (const r of requests) {
    try {
      await answerOne(admin, token, r);
    } catch (e) {
      console.error("[instagram] answer failed", e);
    }
  }
}

async function answerOne(admin: SupabaseClient, token: string, { senderId, mid }: VerifyRequest): Promise<void> {
  // 메타가 같은 알림을 다시 보내도 코드를 두 번 보내지 않는다
  if (mid) {
    const { data } = await admin.from("instagram_codes").select("id").eq("mid", mid).maybeSingle();
    if (data) return;
  }
  if (!(await allow(`ig-code:${senderId}`, 5, 3600))) return;
  if (!(await allow("ig-code:all", 2000, 86_400))) return;

  const username = await igUsername(token, senderId);
  if (!username) {
    await igSendText(token, senderId, "지금은 코드를 만들지 못했어요. 잠시 뒤 다시 '인증'이라고 보내주세요.");
    return;
  }
  // 이 사람이 전에 받고 아직 쓰지 않은 코드는 버린다 (가장 최근 코드만 통한다)
  await admin.from("instagram_codes").delete().eq("ig_user_id", senderId).is("used_at", null);

  const expiresAt = new Date(Date.now() + IG_CODE_TTL_MINUTES * 60_000).toISOString();
  const encrypted = encryptText(username);
  for (let i = 0; i < 5; i++) {
    const code = String(randomInt(0, 10 ** IG_CODE_LENGTH)).padStart(IG_CODE_LENGTH, "0");
    const { error } = await admin
      .from("instagram_codes")
      .insert({ code, ig_user_id: senderId, username: encrypted, mid, expires_at: expiresAt });
    if (!error) {
      await igSendText(token, senderId, codeReply(code));
      return;
    }
    if (error.code !== "23505") throw new Error(error.message);
    // 같은 알림이 동시에 두 번 처리되는 중이면 그만둔다. 아니면 쓰는 중인 코드와 겹친 것이니 새 숫자로
    if (error.message.includes("instagram_codes_mid")) return;
  }
}

export type ClaimResult = { ok: true; username: string } | { ok: false; error: string };

const WRONG = "코드가 맞지 않거나 시간이 지났어요. 한결 인스타에 다시 '인증'을 보내 새 코드를 받아주세요.";
const TAKEN = "이 인스타 계정은 이미 다른 한결 계정에 연결돼 있어요.";
const FAILED = "확인하지 못했어요. 잠시 후 다시 시도해주세요.";

/**
 * 회원이 넣은 코드로 인스타 계정을 연결한다. 코드를 받은 계정의 실제 아이디가 연락처의 인스타 아이디가 된다.
 * 한 인스타 계정은 한 한결 계정에만 (instagram_verifications.ig_user_id unique)
 */
export async function claimIgCode(admin: SupabaseClient, userId: string, code: string): Promise<ClaimResult> {
  const { data: row, error } = await admin
    .from("instagram_codes")
    .select("id, ig_user_id, username, expires_at")
    .eq("code", code)
    .is("used_at", null)
    .maybeSingle();
  if (error) return { ok: false, error: FAILED };
  if (!row || new Date(row.expires_at).getTime() < Date.now()) return { ok: false, error: WRONG };

  const { data: owner } = await admin.from("instagram_verifications").select("user_id").eq("ig_user_id", row.ig_user_id).maybeSingle();
  if (owner && owner.user_id !== userId) return { ok: false, error: TAKEN };

  const now = new Date().toISOString();
  // 같은 코드를 두 번 쓰지 못하게 (동시에 넣어도 한 번만 통과)
  const { data: used } = await admin.from("instagram_codes").update({ used_at: now }).eq("id", row.id).is("used_at", null).select("id");
  if (!used?.length) return { ok: false, error: WRONG };

  const username = decryptText(row.username);
  const encrypted = encryptText(username);
  const { error: vError } = await admin
    .from("instagram_verifications")
    .upsert({ user_id: userId, ig_user_id: row.ig_user_id, username: encrypted, verified_at: now });
  if (vError) return { ok: false, error: vError.code === "23505" ? TAKEN : FAILED };

  // 연락처의 인스타 아이디를 확인한 아이디로 (카카오톡 ID는 그대로 둔다)
  const { error: cError } = await admin.from("contacts").upsert({ user_id: userId, instagram: encrypted, updated_at: now });
  if (cError) {
    await admin.from("instagram_verifications").delete().eq("user_id", userId);
    return { ok: false, error: FAILED };
  }
  return { ok: true, username };
}

/** 연락처를 저장할 때: 인스타 아이디가 확인한 아이디와 달라지면(지우거나 바꾸면) 확인을 푼다 */
export async function syncIgVerification(admin: SupabaseClient, userId: string, instagram: string): Promise<void> {
  const { data } = await admin.from("instagram_verifications").select("username").eq("user_id", userId).maybeSingle();
  if (!data) return;
  let verified = "";
  try {
    verified = decryptText(data.username);
  } catch {
    // 읽을 수 없으면 다시 확인하게
  }
  if (verified !== instagram) await admin.from("instagram_verifications").delete().eq("user_id", userId);
}

/** 내 확인 상태 (연락처 화면) */
export async function myIgVerification(admin: SupabaseClient, userId: string): Promise<{ username: string; verifiedAt: string } | null> {
  const { data } = await admin.from("instagram_verifications").select("username, verified_at").eq("user_id", userId).maybeSingle();
  if (!data) return null;
  try {
    return { username: decryptText(data.username), verifiedAt: data.verified_at };
  } catch {
    return null;
  }
}

/** 인스타 확인을 마친 회원 (추천 카드의 '인스타 확인됨') */
export async function igVerifiedSet(admin: SupabaseClient, userIds: string[]): Promise<Set<string>> {
  if (!userIds.length) return new Set();
  const { data } = await admin.from("instagram_verifications").select("user_id").in("user_id", userIds);
  return new Set((data ?? []).map((r) => r.user_id as string));
}

/** 크론: 하루 지난 코드는 지운다 (처리방침의 보유기간) */
export async function purgeIgCodes(admin: SupabaseClient): Promise<number> {
  const { count } = await admin
    .from("instagram_codes")
    .delete({ count: "exact" })
    .lt("created_at", new Date(Date.now() - 86_400_000).toISOString());
  return count ?? 0;
}

/**
 * 크론: 공식 계정 토큰을 7일마다 새로 받아 둔다 (토큰은 60일이 지나면 끊긴다).
 * force는 관리자 화면의 '지금 갱신'. 받은 지 24시간이 안 된 토큰은 메타가 거절한다
 */
export async function refreshIgToken(admin: SupabaseClient, force = false): Promise<{ ok: boolean; message: string }> {
  const row = await tokenRow(admin);
  const picked = pickToken(row);
  if (!picked) return { ok: false, message: "토큰이 없어요 (INSTAGRAM_ACCESS_TOKEN)" };
  if (!force && picked.source === "db" && row && Date.now() - new Date(row.refreshed_at).getTime() < REFRESH_EVERY_DAYS * 86_400_000) {
    return { ok: true, message: "아직 갱신할 때가 아니에요" };
  }
  const url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(picked.token)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" }).catch(() => null);
  const json = res ? ((await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: { message?: string } }) : {};
  if (!res?.ok || typeof json.access_token !== "string") {
    const message = `갱신 실패${res ? ` HTTP ${res.status}` : ""}${json.error?.message ? `: ${json.error.message.slice(0, 160)}` : ""}`;
    console.error("[instagram]", message);
    return { ok: false, message };
  }
  const seed = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
  const now = Date.now();
  const { error } = await admin.from("instagram_tokens").upsert({
    id: 1,
    token: encryptText(json.access_token),
    seed: seed ? fingerprint(seed) : (row?.seed ?? ""),
    refreshed_at: new Date(now).toISOString(),
    expires_at: typeof json.expires_in === "number" ? new Date(now + json.expires_in * 1000).toISOString() : null,
  });
  if (error) return { ok: false, message: `저장 실패: ${error.message}` };
  return { ok: true, message: "갱신했어요" };
}

/** 관리자: 공식 계정이 메시지 알림(웹훅)을 받도록 앱에 연결한다 */
export async function subscribeIgWebhooks(admin: SupabaseClient): Promise<{ ok: boolean; message: string }> {
  const token = await igAccessToken(admin);
  if (!token) return { ok: false, message: "토큰이 없어요 (INSTAGRAM_ACCESS_TOKEN)" };
  const r = await call(`${base()}/me/subscribed_apps?subscribed_fields=messages`, { token, method: "POST" });
  return r.ok && r.json.success === true ? { ok: true, message: "연결했어요" } : { ok: false, message: apiError(r) };
}

export type IgStatus = {
  official: string | null;
  hasSecret: boolean;
  hasVerifyToken: boolean;
  token: { source: "db" | "env"; refreshedAt: string | null; expiresAt: string | null } | null;
  /** 토큰이 가리키는 계정 (메타에 물어본 값). 토큰이 틀렸으면 error */
  account: { username: string | null; error: string | null } | null;
  subscribedFields: string[] | null;
  verified: number;
  codes7: number;
  used7: number;
  /** DB 표가 없으면(0008을 실행하지 않음) false */
  tablesReady: boolean;
};

/** 관리자 '인스타 확인' 화면: 설정이 다 됐는지, 토큰·웹훅 연결, 이용 숫자 */
export async function loadIgStatus(admin: SupabaseClient): Promise<IgStatus> {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [rowRes, verified, codes7, used7] = await Promise.all([
    admin.from("instagram_tokens").select("token, seed, refreshed_at, expires_at").eq("id", 1).maybeSingle(),
    admin.from("instagram_verifications").select("user_id", { count: "exact", head: true }),
    admin.from("instagram_codes").select("id", { count: "exact", head: true }).gte("created_at", since),
    admin.from("instagram_codes").select("id", { count: "exact", head: true }).gte("created_at", since).not("used_at", "is", null),
  ]);
  const row = (rowRes.data as TokenRow | null) ?? null;
  const picked = pickToken(row);
  let account: IgStatus["account"] = null;
  let subscribedFields: string[] | null = null;
  if (picked) {
    const [me, subs] = await Promise.all([
      call(`${base()}/me?fields=username`, { token: picked.token }).catch(() => null),
      call(`${base()}/me/subscribed_apps`, { token: picked.token }).catch(() => null),
    ]);
    account = me?.ok
      ? { username: typeof me.json.username === "string" ? me.json.username : null, error: null }
      : { username: null, error: me ? apiError(me) : "연결 실패" };
    if (subs?.ok && Array.isArray(subs.json.data)) {
      subscribedFields = (subs.json.data as { subscribed_fields?: unknown }[]).flatMap((d) =>
        Array.isArray(d.subscribed_fields) ? d.subscribed_fields.filter((f): f is string => typeof f === "string") : [],
      );
    }
  }
  return {
    official: igOfficial(),
    hasSecret: igSecrets().length > 0,
    hasVerifyToken: Boolean(igVerifyToken()),
    token: picked
      ? { source: picked.source, refreshedAt: picked.source === "db" ? (row?.refreshed_at ?? null) : null, expiresAt: picked.source === "db" ? (row?.expires_at ?? null) : null }
      : null,
    account,
    subscribedFields,
    verified: verified.count ?? 0,
    codes7: codes7.count ?? 0,
    used7: used7.count ?? 0,
    tablesReady: !verified.error,
  };
}
