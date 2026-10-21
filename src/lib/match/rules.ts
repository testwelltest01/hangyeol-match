/**
 * 친구 평가는 매칭 조건이 아니다(2026-10-21 변경). 대신 평가 1명당 오늘의 추천 새로고침 쿠폰 1장(개수 제한 없음).
 * 새로고침은 추천 하루(저녁 8시 기준 matchDay)에 한 번까지, 아직 답하지 않은 추천만 새 사람으로 바꾼다
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
 * 새로고침 때 바꿀 오늘 추천: 아직 답하지 않았고, 상대가 먼저 관심을 보내지도 않은 사람(그 사람을 숨기면 생긴 기회를 잃는다).
 * 새 사람이 바꿀 수보다 적으면 점수가 낮은 사람부터 그 수만큼만 바꾼다
 */
export function refreshTargets(
  today: { target: string; score: number }[],
  answered: Set<string>,
  likedMe: Set<string>,
): string[] {
  return today
    .filter((r) => !answered.has(r.target) && !likedMe.has(r.target))
    .sort((a, b) => a.score - b.score)
    .map((r) => r.target);
}
