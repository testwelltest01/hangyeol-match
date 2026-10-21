import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/admin/auth";
import { reactionStats, userStage, type ReactionRow, type UserStage } from "@/lib/admin/stats";
import type { Gender } from "@/lib/match/filters";
import { fetchAll, illustratedUsers } from "@/lib/match/server";

type Admin = SupabaseClient;

/** 관리자 목록·대시보드·엑셀이 함께 쓰는 회원 한 줄 */
export type MemberRow = {
  id: string;
  email: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  isAdmin: boolean;
  nickname: string | null;
  gender: Gender | null;
  birthYear: number | null;
  hasProfile: boolean;
  hasScores: boolean;
  testVersion: string | null;
  scoredAt: string | null;
  region: string | null;
  height: number | null;
  hasMatchProfile: boolean;
  paused: boolean;
  photoCount: number;
  hasContact: boolean;
  suspended: boolean;
  suspendReason: string | null;
  friendCount: number;
  sentInterest: number;
  receivedInterest: number;
  mutual: number;
  connected: number;
  stage: UserStage;
};

/** 가입한 계정 전체 (Supabase Auth). 한 번에 1000명씩 읽는다 */
export async function listAuthUsers(admin: Admin): Promise<User[]> {
  const out: User[] = [];
  const perPage = 1000;
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    out.push(...data.users);
    if (data.users.length < perPage) break;
  }
  return out;
}

export async function loadMembers(admin: Admin): Promise<{ members: MemberRow[]; reactions: ReactionRow[] }> {
  const [users, profiles, scores, matchProfiles, photos, contacts, flags, friends, reactions, illustrated] = await Promise.all([
    listAuthUsers(admin),
    fetchAll<{ id: string; nickname: string; gender: Gender; birth_year: number }>((a, b) =>
      admin.from("profiles").select("id, nickname, gender, birth_year").range(a, b),
    ),
    fetchAll<{ user_id: string; version: string; computed_at: string }>((a, b) =>
      admin.from("test_scores").select("user_id, version, computed_at").range(a, b),
    ),
    fetchAll<{ user_id: string; region: string; height: number; paused: boolean }>((a, b) =>
      admin.from("match_profiles").select("user_id, region, height, paused").range(a, b),
    ),
    fetchAll<{ user_id: string }>((a, b) => admin.from("photos").select("user_id").is("replaced_at", null).range(a, b)),
    fetchAll<{ user_id: string }>((a, b) => admin.from("contacts").select("user_id").range(a, b)),
    fetchAll<{ user_id: string; suspended_at: string | null; reason: string | null }>((a, b) =>
      admin.from("user_flags").select("user_id, suspended_at, reason").range(a, b),
    ),
    fetchAll<{ user_id: string }>((a, b) => admin.from("friend_ratings").select("user_id").range(a, b)),
    fetchAll<ReactionRow>((a, b) =>
      admin.from("reactions").select("from_user, to_user, interest, accept, interest_at, accept_at").range(a, b),
    ),
    illustratedUsers(admin),
  ]);

  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const scoreById = new Map(scores.map((s) => [s.user_id, s]));
  const mpById = new Map(matchProfiles.map((m) => [m.user_id, m]));
  const flagById = new Map(flags.map((f) => [f.user_id, f]));
  const contactIds = new Set(contacts.map((c) => c.user_id));
  const tally = (rows: { user_id: string }[]) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.user_id, (m.get(r.user_id) ?? 0) + 1);
    return m;
  };
  const photoCount = tally(photos);
  const friendCount = tally(friends);
  const { byUser } = reactionStats(reactions);

  const members = users.map((u): MemberRow => {
    const p = profileById.get(u.id);
    const s = scoreById.get(u.id);
    const mp = mpById.get(u.id);
    const flag = flagById.get(u.id);
    const rx = byUser.get(u.id);
    const facts = {
      hasProfile: Boolean(p),
      hasScores: Boolean(s),
      friendCount: friendCount.get(u.id) ?? 0,
      hasMatchProfile: Boolean(mp),
      photoCount: photoCount.get(u.id) ?? 0,
      hasContact: contactIds.has(u.id),
      hasIllustration: illustrated ? illustrated.has(u.id) : undefined,
    };
    return {
      id: u.id,
      email: u.email ?? null,
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
      isAdmin: isAdminEmail(u.email),
      nickname: p?.nickname ?? null,
      gender: p?.gender ?? null,
      birthYear: p?.birth_year ?? null,
      hasProfile: facts.hasProfile,
      hasScores: facts.hasScores,
      testVersion: s?.version ?? null,
      scoredAt: s?.computed_at ?? null,
      region: mp?.region ?? null,
      height: mp?.height ?? null,
      hasMatchProfile: facts.hasMatchProfile,
      paused: mp?.paused ?? false,
      photoCount: facts.photoCount,
      hasContact: facts.hasContact,
      suspended: Boolean(flag?.suspended_at),
      suspendReason: flag?.suspended_at ? flag.reason : null,
      friendCount: facts.friendCount,
      sentInterest: rx?.sentInterest ?? 0,
      receivedInterest: rx?.receivedInterest ?? 0,
      mutual: rx?.mutual ?? 0,
      connected: rx?.connected ?? 0,
      stage: userStage(facts),
    };
  });
  members.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return { members, reactions };
}

export type ReportRow = {
  id: number;
  reporter: string | null;
  target: string;
  reason: string;
  detail: string | null;
  created_at: string;
  resolved_at: string | null;
};

export async function loadReports(admin: Admin): Promise<ReportRow[]> {
  return fetchAll<ReportRow>((a, b) =>
    admin
      .from("reports")
      .select("id, reporter, target, reason, detail, created_at, resolved_at")
      .order("created_at", { ascending: false })
      .range(a, b),
  );
}

export { OUTCOME_LABEL, REPORT_REASON_LABEL } from "@/lib/admin/labels";

/** 화면에 보일 이름: 닉네임 → 이메일 → ID 앞자리 */
export function memberName(m: Pick<MemberRow, "nickname" | "email" | "id"> | undefined): string {
  if (!m) return "탈퇴한 회원";
  return m.nickname ?? m.email ?? m.id.slice(0, 8);
}

/** 화면 표시용 한국 시각 'YYYY-MM-DD HH:mm' */
export function kstTime(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(new Date(iso).getTime() + 9 * 3600_000).toISOString().slice(0, 16).replace("T", " ");
}
