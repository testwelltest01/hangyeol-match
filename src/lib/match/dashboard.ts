import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { chatState, myChatRooms, unreadCounts } from "@/lib/chat/server";
import { matchDay } from "@/lib/day";
import { shownIllustrationUrls } from "@/lib/illustration/server";
import { profileChips, recommendationReason, talkingPoint } from "@/lib/match/explain";
import { pairStage, type Pair, type PairStage } from "@/lib/match/server";
import type { Scores } from "@/lib/scoring";

export type PersonCard = {
  id: string;
  nickname: string;
  birthYear: number;
  region: string;
  height: number;
  intro: string;
  chips: string[];
  reason: string;
  talkingPoint: string | null;
  stage: PairStage;
  /** 상대가 먼저 관심을 보냄 */
  likedMe: boolean;
  /** 상대가 추천 카드에 보여주기로 한 그림 프로필 (10분 서명 주소) */
  illustrationUrl: string | null;
};

/** 연결된 사람과의 대화방 요약 */
export type ChatSummary = {
  unread: number;
  myCount: number;
  theirCount: number;
  contactMine: boolean;
  contactTheirs: boolean;
  exchanged: boolean;
  closed: boolean;
  lastMessageAt: string | null;
};

export type Dashboard = {
  /** 오늘 추천받은 사람. 관심·수락이 진행돼도 하루 동안은 그대로 보여준다 */
  today: PersonCard[];
  /** 서로 관심: 사진 공개, 내 수락 차례 */
  photos: PersonCard[];
  /** 내가 수락, 상대 답 기다림 */
  waitingAccept: PersonCard[];
  /** 내가 관심, 상대 답 기다림 */
  sentInterest: PersonCard[];
  connected: (PersonCard & { needsFeedback: boolean; chat: ChatSummary | null })[];
  /** 0005 SQL을 실행했는지 (대화방이 있는지) */
  chatAvailable: boolean;
  contactNotFound: boolean;
};

type ReactionRow = { from_user: string; to_user: string; interest: boolean; accept: boolean | null; accept_at: string | null };

/** 연락처 공개 후 며칠 뒤에 만남 피드백을 묻는지 */
const FEEDBACK_AFTER_DAYS = 3;
/** "아직 못 만났어요"라고 답한 뒤 다시 묻기까지 */
const FEEDBACK_REASK_DAYS = 7;

export async function loadDashboard(admin: SupabaseClient, me: string, myScores: Scores): Promise<Dashboard> {
  const day = matchDay();
  const [todayRecs, allRecs, reactions, blocks, myFeedback, contact, notFound] = await Promise.all([
    admin.from("recommendations").select("target_id, reason, score").eq("user_id", me).eq("day", day).order("score", { ascending: false }),
    admin.from("recommendations").select("target_id").eq("user_id", me),
    admin.from("reactions").select("from_user, to_user, interest, accept, accept_at").or(`from_user.eq.${me},to_user.eq.${me}`),
    admin.from("blocks").select("blocker, blocked").or(`blocker.eq.${me},blocked.eq.${me}`),
    admin.from("meeting_feedback").select("to_user, outcome, updated_at").eq("from_user", me),
    admin.from("contacts").select("updated_at").eq("user_id", me).maybeSingle(),
    admin.from("reports").select("created_at").eq("target", me).eq("reason", "contact_not_found").order("created_at", { ascending: false }).limit(1),
  ]);

  const rows = (reactions.data ?? []) as ReactionRow[];
  const mine = new Map(rows.filter((r) => r.from_user === me).map((r) => [r.to_user, r]));
  const theirs = new Map(rows.filter((r) => r.to_user === me).map((r) => [r.from_user, r]));
  const blocked = new Set((blocks.data ?? []).map((b) => (b.blocker === me ? b.blocked : b.blocker)));
  const recommended = new Set((allRecs.data ?? []).map((r) => r.target_id));
  const todayReason = new Map((todayRecs.data ?? []).map((r) => [r.target_id, r.reason as string]));

  const pairOf = (other: string): Pair => {
    const m = mine.get(other);
    const t = theirs.get(other);
    return {
      mine: m ? { interest: m.interest, accept: m.accept, accept_at: m.accept_at } : null,
      theirs: t ? { interest: t.interest, accept: t.accept, accept_at: t.accept_at } : null,
      blocked: blocked.has(other),
      recommended: recommended.has(other),
    };
  };

  const ids = [...new Set([...todayReason.keys(), ...mine.keys(), ...theirs.keys()])];
  const stages = new Map(ids.map((id) => [id, pairStage(pairOf(id))]));
  const visible = ids.filter((id) => stages.get(id) !== "hidden");

  const [profiles, matchProfiles, scores] = visible.length
    ? await Promise.all([
        admin.from("profiles").select("id, nickname, birth_year").in("id", visible),
        admin.from("match_profiles").select("user_id, region, height, intro").in("user_id", visible),
        admin.from("test_scores").select("user_id, scores").in("user_id", visible),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const illustrations = await shownIllustrationUrls(admin, visible);
  const profileById = new Map((profiles.data ?? []).map((p) => [p.id, p]));
  const mpById = new Map((matchProfiles.data ?? []).map((p) => [p.user_id, p]));
  const scoreById = new Map((scores.data ?? []).map((s) => [s.user_id, s.scores as Scores]));

  const card = (id: string): PersonCard | null => {
    const p = profileById.get(id);
    const mp = mpById.get(id);
    const s = scoreById.get(id);
    if (!p || !mp || !s) return null; // 탈퇴했거나 정보를 지운 사람
    return {
      id,
      nickname: p.nickname,
      birthYear: p.birth_year,
      region: mp.region,
      height: mp.height,
      intro: mp.intro,
      chips: profileChips(s),
      reason: todayReason.get(id) ?? recommendationReason(myScores, s),
      talkingPoint: talkingPoint(myScores, s),
      stage: stages.get(id)!,
      likedMe: theirs.get(id)?.interest === true,
      illustrationUrl: illustrations.get(id) ?? null,
    };
  };

  const feedbackByUser = new Map((myFeedback.data ?? []).map((f) => [f.to_user, f]));
  const now = Date.now();
  const daysSince = (iso: string | null | undefined) => (iso ? (now - new Date(iso).getTime()) / 86_400_000 : 0);

  const cards = visible.map(card).filter((c): c is PersonCard => c !== null);
  const today = cards.filter((c) => todayReason.has(c.id));
  const byStage = (s: PairStage) => cards.filter((c) => c.stage === s);

  const { available: chatAvailable, rooms } = await myChatRooms(admin, me);
  const roomByOther = new Map(rooms.map((r) => [r.user_a === me ? r.user_b : r.user_a, r]));
  const unread = await unreadCounts(admin, rooms, me);

  const connected = byStage("connected")
    .map((c) => {
      const room = roomByOther.get(c.id) ?? null;
      // 만남은 연락처를 주고받은 뒤에 묻는다. 대화방이 없던 때(0005 전)는 서로 수락한 시각부터
      const since = chatAvailable ? (room?.exchanged_at ?? null) : [mine.get(c.id)?.accept_at, theirs.get(c.id)?.accept_at].sort().at(-1);
      const fb = feedbackByUser.get(c.id);
      const needsFeedback = since
        ? fb
          ? fb.outcome === "not_yet" && daysSince(fb.updated_at) >= FEEDBACK_REASK_DAYS
          : daysSince(since) >= FEEDBACK_AFTER_DAYS
        : false;
      const chat: ChatSummary | null = room
        ? { ...chatState(room, me), unread: unread.get(room.id) ?? 0, lastMessageAt: room.last_message_at }
        : null;
      return { ...c, needsFeedback, chat };
    })
    // 최근에 대화한 방이 위로
    .sort((a, b) => ((a.chat?.lastMessageAt ?? "") < (b.chat?.lastMessageAt ?? "") ? 1 : -1));

  const lastNotFound = notFound.data?.[0]?.created_at;
  return {
    today,
    photos: byStage("photos"),
    waitingAccept: byStage("waiting_accept"),
    sentInterest: byStage("waiting_interest"),
    connected,
    chatAvailable,
    contactNotFound: Boolean(lastNotFound && contact.data && lastNotFound > contact.data.updated_at),
  };
}
