import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { daysBefore, kstYear } from "@/lib/day";
import { allocate, gateFactor, type Edge, type FeedbackReceived } from "@/lib/match/allocate";
import { recommendationReason } from "@/lib/match/explain";
import { checkMutual, withFilterDefaults, type Filters, type Gender, type MatchPerson, type Religion } from "@/lib/match/filters";
import { mutualScore, type Scores } from "@/lib/scoring";

type Admin = SupabaseClient;

/** Supabase는 한 번에 1000행까지 주므로 끝까지 나눠 읽는다 */
export async function fetchAll<T>(
  make: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const out: T[] = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    const { data, error } = await make(from, from + size - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < size) break;
  }
  return out;
}

export type PoolEntry = {
  person: MatchPerson;
  scores: Scores;
  nickname: string;
  gate: number;
};

/**
 * 지금 매칭에 참여할 수 있는 사람 전체.
 * 조건: 검사 완료, 매칭 정보 입력, 사진 2장, 연락처, 매칭 쉬는 중 아님, 이용 정지 아님. (친구 평가는 조건이 아니다: 새로고침 쿠폰)
 */
export async function loadPool(admin: Admin): Promise<Map<string, PoolEntry>> {
  const [profiles, matchProfiles, scores, photos, contacts, flags, feedback] = await Promise.all([
    fetchAll<{ id: string; gender: Gender; birth_year: number; nickname: string }>((a, b) =>
      admin.from("profiles").select("id, gender, birth_year, nickname").range(a, b),
    ),
    fetchAll<{ user_id: string; region: string; height: number; religion: Religion | null; filters: Filters }>((a, b) =>
      admin.from("match_profiles").select("user_id, region, height, religion, filters").eq("paused", false).range(a, b),
    ),
    fetchAll<{ user_id: string; scores: Scores }>((a, b) => admin.from("test_scores").select("user_id, scores").range(a, b)),
    fetchAll<{ user_id: string; slot: string }>((a, b) =>
      admin.from("photos").select("user_id, slot").is("replaced_at", null).range(a, b),
    ),
    fetchAll<{ user_id: string }>((a, b) => admin.from("contacts").select("user_id").range(a, b)),
    fetchAll<{ user_id: string }>((a, b) =>
      admin.from("user_flags").select("user_id").not("suspended_at", "is", null).range(a, b),
    ),
    fetchAll<FeedbackReceived & { to_user: string }>((a, b) =>
      admin.from("meeting_feedback").select("to_user, outcome, photo_match, cleanliness, manners").range(a, b),
    ),
  ]);

  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const scoreById = new Map(scores.map((s) => [s.user_id, s.scores]));
  const photoSlots = new Map<string, Set<string>>();
  for (const p of photos) photoSlots.set(p.user_id, (photoSlots.get(p.user_id) ?? new Set()).add(p.slot));
  const hasContact = new Set(contacts.map((c) => c.user_id));
  const suspended = new Set(flags.map((f) => f.user_id));
  const feedbackByUser = new Map<string, FeedbackReceived[]>();
  for (const f of feedback) feedbackByUser.set(f.to_user, [...(feedbackByUser.get(f.to_user) ?? []), f]);

  const pool = new Map<string, PoolEntry>();
  for (const mp of matchProfiles) {
    const profile = profileById.get(mp.user_id);
    const s = scoreById.get(mp.user_id);
    const slots = photoSlots.get(mp.user_id);
    if (!profile || !s || !slots?.has("face") || !slots.has("body")) continue;
    if (!hasContact.has(mp.user_id) || suspended.has(mp.user_id)) continue;
    pool.set(mp.user_id, {
      person: {
        id: mp.user_id,
        gender: profile.gender,
        birthYear: profile.birth_year,
        region: mp.region,
        height: mp.height,
        religion: mp.religion,
        smoking: s.dealbreakers.smoking,
        drinking: s.dealbreakers.drinking ?? null,
        marriage: s.dealbreakers.marriage,
        children: s.dealbreakers.children,
        filters: withFilterDefaults(mp.filters),
      },
      scores: s,
      nickname: profile.nickname,
      gate: gateFactor(feedbackByUser.get(mp.user_id) ?? []),
    });
  }
  return pool;
}

/** 조건 화면의 "지금 조건에 맞는 사람 n명". 양방향 "꼭" 조건을 모두 통과하는 사람 수 */
export function countMutualMatches(me: MatchPerson, pool: Map<string, PoolEntry>, year = kstYear()): number {
  let n = 0;
  for (const entry of pool.values()) {
    if (entry.person.id === me.id) continue;
    if (checkMutual(me, entry.person, year).ok) n += 1;
  }
  return n;
}

/** 같은 사람을 다시 추천하기까지 쉬는 날 (새로고침 쿠폰으로 바꾼 사람도 같다) */
export const REPEAT_AFTER_DAYS = 14;

type Recent = { user_id: string; target_id: string };

/** 최근에 새로고침 쿠폰으로 바꾼(뺀) 추천. 0008 SQL 전이면 빈 목록 */
async function recentlyReplaced(admin: Admin, since: string): Promise<Recent[]> {
  const { data, error } = await admin.from("recommendation_refreshes").select("user_id, replaced").gte("day", since);
  if (error || !data) return [];
  return data.flatMap((r) => ((r.replaced as string[] | null) ?? []).map((t) => ({ user_id: r.user_id as string, target_id: t })));
}

/**
 * 추천 후보를 고르는 공통 규칙 (매일 추천과 새로고침이 같이 쓴다).
 * 다른 성별, 차단 없음, 내가 이미 답하지 않음, 상대가 넘기지 않음, 최근 14일 안에 추천했거나 바꾼 사람 아님(상대가 먼저 관심이면 예외),
 * 서로의 '꼭' 조건 통과. 점수는 상호 점수 × '되도록' 감점 × 행동 게이트
 */
async function candidateEdges(
  admin: Admin,
  pool: Map<string, PoolEntry>,
  viewers: string[],
  day: string,
  exclude: Map<string, Set<string>> = new Map(),
): Promise<Edge[]> {
  const since = daysBefore(day, REPEAT_AFTER_DAYS);
  const [reactions, blocks, recent, replaced] = await Promise.all([
    fetchAll<{ from_user: string; to_user: string; interest: boolean }>((a, b) =>
      admin.from("reactions").select("from_user, to_user, interest").range(a, b),
    ),
    fetchAll<{ blocker: string; blocked: string }>((a, b) => admin.from("blocks").select("blocker, blocked").range(a, b)),
    fetchAll<Recent>((a, b) => admin.from("recommendations").select("user_id, target_id").gte("day", since).lt("day", day).range(a, b)),
    recentlyReplaced(admin, since),
  ]);

  const key = (a: string, b: string) => `${a}>${b}`;
  const reaction = new Map(reactions.map((r) => [key(r.from_user, r.to_user), r.interest]));
  const blocked = new Set(blocks.flatMap((b) => [key(b.blocker, b.blocked), key(b.blocked, b.blocker)]));
  const recentSet = new Set([...recent, ...replaced].map((r) => key(r.user_id, r.target_id)));
  const year = kstYear();

  const edges: Edge[] = [];
  for (const v of viewers) {
    const me = pool.get(v);
    if (!me) continue;
    const skip = exclude.get(v);
    for (const c of pool.values()) {
      const cid = c.person.id;
      if (cid === v || c.person.gender === me.person.gender) continue;
      if (skip?.has(cid)) continue;
      if (blocked.has(key(v, cid))) continue;
      if (reaction.has(key(v, cid))) continue; // 이미 답한 사람
      const theirs = reaction.get(key(cid, v));
      if (theirs === false) continue; // 상대가 이미 넘긴 사람
      const priority = theirs === true;
      if (!priority && recentSet.has(key(v, cid))) continue;
      const check = checkMutual(me.person, c.person, year);
      if (!check.ok) continue;
      edges.push({ viewer: v, target: cid, score: mutualScore(me.scores, c.scores) * check.softFactor * c.gate, priority });
    }
  }
  return edges;
}

type RecRow = { user_id: string; target_id: string; day: string; score: number; reason: string };

function toRows(picked: Map<string, Edge[]>, pool: Map<string, PoolEntry>, day: string): RecRow[] {
  return [...picked.entries()].flatMap(([viewer, list]) =>
    list.map((e) => ({
      user_id: viewer,
      target_id: e.target,
      day,
      score: Number(e.score.toFixed(4)),
      reason: recommendationReason(pool.get(viewer)!.scores, pool.get(e.target)!.scores),
    })),
  );
}

/**
 * 하루 추천을 만들어 저장한다. onlyViewer를 주면 그 사람 것만 만든다(오늘 처음 들어왔는데 추천이 없을 때).
 * 이미 오늘 추천이 있는 사람은 건너뛴다. 오늘 다른 사람 추천에 들어간 횟수도 노출 상한에 반영한다.
 */
export async function generateRecommendations(
  admin: Admin,
  day: string,
  onlyViewer?: string,
): Promise<{ created: number; perViewer: Map<string, number> }> {
  const none = { created: 0, perViewer: new Map<string, number>() };
  const pool = await loadPool(admin);
  const candidates = onlyViewer ? (pool.has(onlyViewer) ? [onlyViewer] : []) : [...pool.keys()];
  if (candidates.length === 0) return none;

  const today = await fetchAll<{ user_id: string; target_id: string }>((a, b) =>
    admin.from("recommendations").select("user_id, target_id").eq("day", day).range(a, b),
  );
  const done = new Set(today.map((r) => r.user_id));
  const exposure = new Map<string, number>();
  for (const r of today) exposure.set(r.target_id, (exposure.get(r.target_id) ?? 0) + 1);

  const viewers = candidates.filter((v) => !done.has(v));
  if (viewers.length === 0) return none;

  const edges = await candidateEdges(admin, pool, viewers, day);
  const rows = toRows(allocate(edges, { exposure }), pool, day);
  if (rows.length === 0) return none;
  const { error } = await admin.from("recommendations").insert(rows);
  if (error) throw new Error(error.message);
  const perViewer = new Map<string, number>();
  for (const r of rows) perViewer.set(r.user_id, (perViewer.get(r.user_id) ?? 0) + 1);
  return { created: rows.length, perViewer };
}

/**
 * 새로고침 쿠폰: 오늘 추천 중 바꿀 사람(replace) 수만큼 새 사람을 고른다. 저장은 하지 않는다(부르는 쪽이 쿠폰 기록과 함께 바꾼다).
 * 오늘 이미 받은 사람(남길 사람·바꿀 사람 모두)은 다시 고르지 않고, 노출 상한은 바꿀 사람을 뺀 오늘 기록으로 센다
 */
export async function pickRefresh(admin: Admin, day: string, viewer: string, replace: string[]): Promise<RecRow[]> {
  if (replace.length === 0) return [];
  const pool = await loadPool(admin);
  if (!pool.has(viewer)) return [];
  const today = await fetchAll<{ user_id: string; target_id: string }>((a, b) =>
    admin.from("recommendations").select("user_id, target_id").eq("day", day).range(a, b),
  );
  const mineToday = new Set(today.filter((r) => r.user_id === viewer).map((r) => r.target_id));
  const leaving = new Set(replace);
  const exposure = new Map<string, number>();
  for (const r of today) {
    if (r.user_id === viewer && leaving.has(r.target_id)) continue;
    exposure.set(r.target_id, (exposure.get(r.target_id) ?? 0) + 1);
  }
  const edges = await candidateEdges(admin, pool, [viewer], day, new Map([[viewer, mineToday]]));
  return toRows(allocate(edges, { exposure, perUser: replace.length }), pool, day);
}

/** 두 사람 사이의 관계 */
export type Pair = {
  mine: { interest: boolean; accept: boolean | null; accept_at: string | null } | null;
  theirs: { interest: boolean; accept: boolean | null; accept_at: string | null } | null;
  blocked: boolean;
  recommended: boolean;
};

export async function loadPair(admin: Admin, me: string, other: string): Promise<Pair> {
  const [mine, theirs, blocks, rec] = await Promise.all([
    admin.from("reactions").select("interest, accept, accept_at").eq("from_user", me).eq("to_user", other).maybeSingle(),
    admin.from("reactions").select("interest, accept, accept_at").eq("from_user", other).eq("to_user", me).maybeSingle(),
    admin
      .from("blocks")
      .select("blocker")
      .or(`and(blocker.eq.${me},blocked.eq.${other}),and(blocker.eq.${other},blocked.eq.${me})`),
    admin.from("recommendations").select("day").eq("user_id", me).eq("target_id", other).limit(1),
  ]);
  return {
    mine: mine.data ?? null,
    theirs: theirs.data ?? null,
    blocked: (blocks.data ?? []).length > 0,
    recommended: (rec.data ?? []).length > 0,
  };
}

export type PairStage =
  | "hidden" // 볼 수 없음 (관계 없음, 차단, 상대가 넘김·거절)
  | "new" // 추천받았고 아직 답하지 않음
  | "waiting_interest" // 내가 관심, 상대 답 기다림
  | "photos" // 서로 관심: 사진 공개, 내 수락 차례
  | "waiting_accept" // 내가 수락, 상대 기다림
  | "connected"; // 서로 수락: 연락처 공개

export function pairStage(p: Pair): PairStage {
  if (p.blocked) return "hidden";
  const { mine, theirs } = p;
  if (!mine) {
    // 추천받았거나 상대가 먼저 관심을 보낸 경우에만 볼 수 있다
    if (p.recommended || theirs?.interest === true) return "new";
    return "hidden";
  }
  if (!mine.interest) return "hidden";
  if (theirs?.interest === false || mine.accept === false || theirs?.accept === false) return "hidden";
  if (!theirs) return "waiting_interest";
  if (mine.accept === true && theirs.accept === true) return "connected";
  if (mine.accept === true) return "waiting_accept";
  return "photos";
}
