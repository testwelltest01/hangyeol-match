// 관리자 대시보드 계산. DB 없이 테스트할 수 있게 순수 함수만 둔다.
import { daysBefore, kstDay } from "@/lib/day";
import { MIN_FRIENDS_FOR_MATCHING } from "@/lib/match/rules";

export type UserStage = "account" | "testing" | "tested" | "ready";

export const STAGE_LABEL: Record<UserStage, string> = {
  account: "가입만",
  testing: "검사 중",
  tested: "검사 완료",
  ready: "매칭 준비 완료",
};

export type UserFacts = {
  hasProfile: boolean;
  hasScores: boolean;
  friendCount: number;
  hasMatchProfile: boolean;
  /** 지금 등록된 사진 수 (얼굴·전신) */
  photoCount: number;
  hasContact: boolean;
};

/** 회원이 어디까지 왔는지. 매칭 준비 완료는 /match 준비 목록과 같은 기준이다 */
export function userStage(f: UserFacts): UserStage {
  if (!f.hasProfile) return "account";
  if (!f.hasScores) return "testing";
  const ready = f.friendCount >= MIN_FRIENDS_FOR_MATCHING && f.hasMatchProfile && f.photoCount >= 2 && f.hasContact;
  return ready ? "ready" : "tested";
}

export type ReactionRow = {
  from_user: string;
  to_user: string;
  interest: boolean;
  accept: boolean | null;
  interest_at: string;
  accept_at: string | null;
};

export type PersonReactions = { sentInterest: number; receivedInterest: number; mutual: number; connected: number };

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** 관심·수락 기록을 사람별, 전체로 센다. 서로 관심과 연결은 두 사람 모두 같은 답을 했을 때만 센다 */
export function reactionStats(rows: ReactionRow[]): {
  byUser: Map<string, PersonReactions>;
  totals: { interests: number; passes: number; mutualPairs: number; connectedPairs: number };
} {
  const byUser = new Map<string, PersonReactions>();
  const get = (id: string) => {
    let v = byUser.get(id);
    if (!v) byUser.set(id, (v = { sentInterest: 0, receivedInterest: 0, mutual: 0, connected: 0 }));
    return v;
  };
  const byPair = new Map<string, ReactionRow[]>();
  let interests = 0;
  let passes = 0;
  for (const r of rows) {
    if (r.interest) {
      interests++;
      get(r.from_user).sentInterest++;
      get(r.to_user).receivedInterest++;
    } else passes++;
    const k = pairKey(r.from_user, r.to_user);
    byPair.set(k, [...(byPair.get(k) ?? []), r]);
  }
  let mutualPairs = 0;
  let connectedPairs = 0;
  for (const pair of byPair.values()) {
    if (pair.length !== 2 || !pair.every((r) => r.interest)) continue;
    mutualPairs++;
    for (const r of pair) get(r.from_user).mutual++;
    if (pair.every((r) => r.accept === true)) {
      connectedPairs++;
      for (const r of pair) get(r.from_user).connected++;
    }
  }
  return { byUser, totals: { interests, passes, mutualPairs, connectedPairs } };
}

export type FunnelStep = { label: string; count: number; /** 바로 앞 단계 대비 % */ rate: number | null };

/** 단계별 전환. 앞 단계를 지난 사람만 다음 단계에 센다 */
export function funnel(users: (UserFacts & { sentInterest: number; connected: number })[]): FunnelStep[] {
  const steps: [string, (u: (typeof users)[number]) => boolean][] = [
    ["가입", () => true],
    ["프로필 작성", (u) => u.hasProfile],
    ["검사 완료", (u) => u.hasScores],
    [`친구 평가 ${MIN_FRIENDS_FOR_MATCHING}명 이상`, (u) => u.friendCount >= MIN_FRIENDS_FOR_MATCHING],
    ["매칭 준비 완료", (u) => userStage(u) === "ready"],
    ["관심 보낸 적 있음", (u) => u.sentInterest > 0],
    ["연결된 적 있음", (u) => u.connected > 0],
  ];
  const out: FunnelStep[] = [];
  let remaining = users;
  for (const [label, pass] of steps) {
    remaining = remaining.filter(pass);
    const prev = out.at(-1)?.count;
    out.push({ label, count: remaining.length, rate: prev ? Math.round((remaining.length / prev) * 100) : prev === 0 ? 0 : null });
  }
  return out;
}

/** 최근 days일 동안 한국 날짜별 건수 (오래된 날부터) */
export function dailyCounts(isoTimes: (string | null)[], days: number, today: string = kstDay()): { day: string; count: number }[] {
  const start = daysBefore(today, days - 1);
  const counts = new Map<string, number>();
  for (const t of isoTimes) {
    if (!t) continue;
    const d = kstDay(new Date(t));
    if (d >= start && d <= today) counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  return Array.from({ length: days }, (_, i) => {
    const day = daysBefore(today, days - 1 - i);
    return { day, count: counts.get(day) ?? 0 };
  });
}

export const AGE_BANDS = ["24세 이하", "25~29세", "30~34세", "35~39세", "40세 이상"] as const;

/** 연 나이(올해 − 출생연도)로 나이대를 나눈다 */
export function ageBand(birthYear: number, year: number): (typeof AGE_BANDS)[number] {
  const age = year - birthYear;
  if (age <= 24) return AGE_BANDS[0];
  if (age <= 29) return AGE_BANDS[1];
  if (age <= 34) return AGE_BANDS[2];
  if (age <= 39) return AGE_BANDS[3];
  return AGE_BANDS[4];
}
