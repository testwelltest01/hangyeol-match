// 그림 프로필 규칙 (순수 함수, 테스트용).
// 그림 프로필은 매칭에 꼭 필요하다(2026-10-21): 다 그린 그림이 하나 있어야 추천을 주고받는다. 추천 카드에는 실제 사진 대신 이 그림이 보인다.

/** 이보다 오래 '그리는 중'이면 함수가 멈춘 것으로 본다 */
export const STALE_MS = 6 * 60_000;
/** 자동으로 다시 그리기 전에 쉬는 시간 (실패한 뒤 화면을 열 때마다 OpenAI를 부르지 않게) */
export const AUTO_RETRY_GAP_MS = 30 * 60_000;
/** 24시간 안에 이만큼 실패하면 자동으로는 더 그리지 않는다 (회원이 '다시 그리기'를 누르면 그린다) */
export const AUTO_FAILS_PER_DAY = 3;

export type IllustrationStatus = "pending" | "done" | "failed";

type Attempt = { status: IllustrationStatus; created_at: string; deleted: boolean };

/** 아직 그리는 중인 기록 (멈춘 지 오래된 것은 빼고) */
export function isDrawing(r: { status: IllustrationStatus; created_at: string }, now = Date.now()): boolean {
  return r.status === "pending" && now - new Date(r.created_at).getTime() <= STALE_MS;
}

/**
 * 지금 자동으로 그림을 그릴 차례인지. attempts는 이 계정의 모든 기록(지운 것·실패 포함), used는 횟수에 세는 수(실패 제외).
 * 다 그린 그림이 있거나 그리는 중이면 안 그린다. 횟수가 남아 있어야 하고, 마지막 시도에서 30분이 지났고, 하루 실패가 3번 미만일 때
 */
export function autoDrawDue(attempts: Attempt[], used: number, limit: number, now = Date.now()): boolean {
  const live = attempts.filter((a) => !a.deleted);
  if (live.some((a) => a.status === "done" || isDrawing(a, now))) return false;
  if (used >= limit) return false;
  const times = attempts.map((a) => new Date(a.created_at).getTime());
  if (times.length && now - Math.max(...times) < AUTO_RETRY_GAP_MS) return false;
  const failsToday = attempts.filter((a) => a.status === "failed" && now - new Date(a.created_at).getTime() < 24 * 3600_000).length;
  return failsToday < AUTO_FAILS_PER_DAY;
}

/** 추천 카드에 보여줄 그림: 회원이 고른 그림, 없으면 가장 최근에 다 그린 그림. rows는 다 그린(지우지 않은) 그림만 */
export function pickShown<T extends { shown: boolean; created_at: string }>(rows: T[]): T | null {
  const chosen = rows.find((r) => r.shown);
  if (chosen) return chosen;
  return [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
}

/** 지울 수 있는지: 그리는 중이 아니고, 다 그린 그림이라면 그것 말고도 다 그린 그림이 있어야 한다(그림 없는 회원이 없게) */
export function canDelete(status: IllustrationStatus, doneCount: number): boolean {
  if (status === "pending") return false;
  if (status === "done") return doneCount > 1;
  return true;
}
