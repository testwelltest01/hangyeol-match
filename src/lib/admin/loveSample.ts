// 연애 상황 검사 통계·LPA에 쓸 표본 고르기. 순수 함수(테스트용).
// - 지금 문항 버전(LOVE_VERSION)만 쓴다 (문항이 바뀌면 척도 점수를 비교할 수 없다)
// - 한 사람에 한 번: 첫 검사(연습 효과 없이, 기본) 또는 가장 최근 검사
// - 가입 전 비회원 검사는 한 번이 한 사람이다 (같은 사람이 다시 했는지 알 수 없다). 빼고 볼 수도 있다
import { LOVE_VERSION } from "@/lib/love/items";

export type LoveSampleOptions = { attempt: "first" | "latest"; guests: boolean };
export const DEFAULT_LOVE_SAMPLE: LoveSampleOptions = { attempt: "first", guests: true };

type Attempt = { id: string; user_id: string | null; version: string; created_at: string };

/** 주소의 attempt·guests 값을 읽는다 (모르는 값은 기본값) */
export function parseLoveSample(sp: { attempt?: unknown; guests?: unknown }): LoveSampleOptions {
  return { attempt: sp.attempt === "latest" ? "latest" : "first", guests: sp.guests !== "0" };
}

/** 주소에 붙일 값 (기본값이면 빼서 짧게) */
export function loveSampleQuery(o: LoveSampleOptions): Record<string, string> {
  return { ...(o.attempt === "latest" ? { attempt: "latest" } : {}), ...(o.guests ? {} : { guests: "0" }) };
}

export const personKey = (r: Attempt) => r.user_id ?? `guest:${r.id}`;

/** 사람마다 시도 묶음 (지금 문항 버전만, 시도는 오래된 순) */
export function attemptsByPerson<T extends Attempt>(rows: T[], guests = true): T[][] {
  const map = new Map<string, T[]>();
  for (const r of [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    if (r.version !== LOVE_VERSION || (!guests && !r.user_id)) continue;
    const key = personKey(r);
    map.set(key, [...(map.get(key) ?? []), r]);
  }
  return [...map.values()];
}

/** 한 사람에 한 번씩 고른 표본 */
export function pickLoveSample<T extends Attempt>(rows: T[], o: LoveSampleOptions): T[] {
  return attemptsByPerson(rows, o.guests).map((list) => (o.attempt === "latest" ? list[list.length - 1] : list[0]));
}

/** 두 번 이상 검사한 사람의 [첫 검사, 가장 최근 검사] */
export function retestPairs<T extends Attempt>(rows: T[], guests = true): [T, T][] {
  return attemptsByPerson(rows, guests)
    .filter((list) => list.length >= 2)
    .map((list) => [list[0], list[list.length - 1]]);
}
