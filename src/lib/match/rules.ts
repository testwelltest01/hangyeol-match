/**
 * 친구 평가는 매칭 조건이 아니다(2026-10-21 변경). 대신 평가 1명당 오늘의 추천 새로고침 쿠폰 1장(개수 제한 없음).
 * 새로고침은 추천 하루(저녁 8시 기준 matchDay)에 한 번까지, 오늘 추천을 '넘기기'한 뒤에만 바로 새 사람을 받는다
 * (2026-10-23: 답하지 않은 추천은 답할 때까지 그대로 두기로 해서, 답하지 않은 추천을 바꾸는 쿠폰은 없앴다)
 */
export const COUPONS_PER_FRIEND = 1;
export const REFRESHES_PER_DAY = 1;

/** 남은 쿠폰: 받은 친구 평가 수 × 1장 − 쓴 수 */
export function couponBalance(friendRatings: number, used: number): number {
  return Math.max(0, friendRatings * COUPONS_PER_FRIEND - used);
}

/** 리포트에 친구 평가 평균을 보여주는 최소 인원. 한 명의 답이 드러나지 않게 한다 */
export const MIN_FRIEND_RATINGS_TO_SHOW = 3;

/** 사진이 공개되는 관계 단계: 서로 관심(내 수락 차례), 내가 수락하고 기다림, 연결. 그 전에는 얼굴을 보여주지 않는다 */
export const PHOTO_VISIBLE_STAGES = ["photos", "waiting_accept", "connected"] as const;

export function photosVisible(stage: string): boolean {
  return (PHOTO_VISIBLE_STAGES as readonly string[]).includes(stage);
}

/**
 * 새로고침으로 새 사람을 받을 자리: 오늘 추천 중 내가 넘긴 사람(관심을 보냈거나 아직 답하지 않은 사람은 아니다).
 * 새 사람이 모자라면 점수가 낮은 자리부터 그 수만큼만
 */
export function refreshTargets(today: { target: string; score: number }[], passed: Set<string>): string[] {
  return today
    .filter((r) => passed.has(r.target))
    .sort((a, b) => a.score - b.score)
    .map((r) => r.target);
}

/** 받은 관심에 답할 수 있는 날 수. 지나면 크론이 '응답 없음'(넘긴 것과 같이)으로 정리한다 */
export const INTEREST_RESPONSE_DAYS = 5;

/** 받은 관심에 답할 수 있는 남은 날 (올려서 센다: 방금 받았으면 5, 하루가 안 남았으면 1, 지났으면 0) */
export function responseDaysLeft(interestAt: string, now: number = Date.now()): number {
  const left = (new Date(interestAt).getTime() + INTEREST_RESPONSE_DAYS * 86_400_000 - now) / 86_400_000;
  return Math.max(0, Math.ceil(left));
}

/** 남은 날 표시 */
export function daysLeftLabel(days: number): string {
  return days >= 2 ? `${days}일 남음` : days === 1 ? "하루 남음" : "곧 마감";
}

/**
 * 응답 없음으로 정리할 관심: 관심을 보낸 지 5일이 지났는데 받은 사람이 아무 답(관심·넘기기)도 하지 않은 것.
 * 돌려주는 값은 받은 사람 쪽에 넣을 '넘김' (from = 받은 사람)
 */
export function unansweredInterests(
  rows: { from_user: string; to_user: string; interest: boolean; interest_at: string }[],
  now: number = Date.now(),
): { from_user: string; to_user: string }[] {
  const answered = new Set(rows.map((r) => `${r.from_user}>${r.to_user}`));
  const cutoff = now - INTEREST_RESPONSE_DAYS * 86_400_000;
  return rows
    .filter((r) => r.interest && new Date(r.interest_at).getTime() <= cutoff && !answered.has(`${r.to_user}>${r.from_user}`))
    .map((r) => ({ from_user: r.to_user, to_user: r.from_user }));
}
