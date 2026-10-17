// 관리자 '추세' 계산. 성별로 날짜·시간대·요일별 건수를 센다. DB 없이 테스트할 수 있는 순수 함수.
import { daysBefore, kstDay } from "@/lib/day";

export type GenderKey = "male" | "female" | "unknown";
export const GENDER_KEYS: GenderKey[] = ["male", "female", "unknown"];
export const GENDER_LABEL: Record<GenderKey, string> = { male: "남", female: "여", unknown: "성별 미입력" };
export const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;

export type TrendEvent = { userId: string; at: string };

type ByGender<T> = Record<GenderKey, T>;
const byGender = <T>(make: () => T): ByGender<T> => ({ male: make(), female: make(), unknown: make() });

/** ISO 시각을 한국 날짜, 시(0~23), 요일(0=월 … 6=일)로 */
export function kstParts(iso: string): { day: string; hour: number; weekday: number } {
  const shifted = new Date(new Date(iso).getTime() + 9 * 3600_000);
  return {
    day: shifted.toISOString().slice(0, 10),
    hour: shifted.getUTCHours(),
    weekday: (shifted.getUTCDay() + 6) % 7,
  };
}

export type Trend = {
  days: string[];
  /** 날짜별 건수 */
  daily: ByGender<number[]>;
  /** 날짜별 고유 회원 수 */
  dailyUsers: ByGender<number[]>;
  hourly: ByGender<number[]>;
  weekday: ByGender<number[]>;
  /** [요일][시] */
  heat: ByGender<number[][]>;
  totals: ByGender<number>;
  users: ByGender<number>;
};

/** 최근 days일(한국 날짜, 오늘 포함) 안의 기록만 센다 */
export function buildTrend(
  events: TrendEvent[],
  genderOf: (userId: string) => GenderKey,
  days: number,
  today: string = kstDay(),
): Trend {
  const dayList = Array.from({ length: days }, (_, i) => daysBefore(today, days - 1 - i));
  const index = new Map(dayList.map((d, i) => [d, i]));
  const t: Trend = {
    days: dayList,
    daily: byGender(() => Array(days).fill(0)),
    dailyUsers: byGender(() => Array(days).fill(0)),
    hourly: byGender(() => Array(24).fill(0)),
    weekday: byGender(() => Array(7).fill(0)),
    heat: byGender(() => Array.from({ length: 7 }, () => Array(24).fill(0))),
    totals: byGender(() => 0),
    users: byGender(() => 0),
  };
  const seenDay = new Set<string>();
  const seenUser = new Set<string>();
  for (const e of events) {
    const p = kstParts(e.at);
    const i = index.get(p.day);
    if (i === undefined) continue;
    const g = genderOf(e.userId);
    t.daily[g][i]++;
    t.hourly[g][p.hour]++;
    t.weekday[g][p.weekday]++;
    t.heat[g][p.weekday][p.hour]++;
    t.totals[g]++;
    const dk = `${p.day}|${e.userId}`;
    if (!seenDay.has(dk)) {
      seenDay.add(dk);
      t.dailyUsers[g][i]++;
    }
    if (!seenUser.has(e.userId)) {
      seenUser.add(e.userId);
      t.users[g]++;
    }
  }
  return t;
}

/** 가장 많은 칸의 위치. 모두 0이면 null */
export function peakIndex(values: number[]): number | null {
  let best = -1;
  let at: number | null = null;
  values.forEach((v, i) => {
    if (v > best && v > 0) {
      best = v;
      at = i;
    }
  });
  return at;
}

/** 합에서 차지하는 비율(%) */
export function shares(values: number[]): number[] {
  const sum = values.reduce((a, b) => a + b, 0);
  return values.map((v) => (sum ? (v / sum) * 100 : 0));
}

export const METRICS = [
  { id: "visit", label: "방문", lead: "로그인한 회원이 서비스를 쓴 기록이에요. 같은 사람은 30분에 한 번만 셉니다." },
  { id: "signup", label: "가입", lead: "계정을 만든 시각이에요. 프로필 전이라 성별을 모르는 가입은 그래프에서 빠져요." },
  { id: "test", label: "검사 완료", lead: "검사를 끝까지 마친 시각이에요 (다시 하면 마지막 시각)." },
  { id: "interest", label: "관심 보냄", lead: "'관심 있어요'를 누른 시각이에요. 보낸 사람의 성별로 셉니다." },
  { id: "accept", label: "수락", lead: "사진을 보고 수락한 시각이에요. 수락한 사람의 성별로 셉니다." },
  { id: "photo", label: "사진 올리기", lead: "사진을 올려 AI 피드백을 받은 시각이에요 (거절된 사진 포함)." },
  { id: "friend", label: "친구 평가 받음", lead: "친구가 '친구가 보는 나'를 남긴 시각이에요. 평가받은 회원의 성별로 셉니다." },
] as const;

export type Metric = (typeof METRICS)[number]["id"];
export const PERIODS = [7, 30, 90] as const;
