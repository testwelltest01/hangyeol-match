/** 매칭을 시작하려면 필요한 친구 평가 수 (리포트의 '친구가 보는 나') */
export const MIN_FRIENDS_FOR_MATCHING = 1;

/** 리포트에 친구 평가 평균을 보여주는 최소 인원. 한 명의 답이 드러나지 않게 한다 */
export const MIN_FRIEND_RATINGS_TO_SHOW = 3;

/** 사진이 공개되는 관계 단계: 서로 관심(내 수락 차례), 내가 수락하고 기다림, 연결. 그 전에는 얼굴을 보여주지 않는다 */
export const PHOTO_VISIBLE_STAGES = ["photos", "waiting_accept", "connected"] as const;

export function photosVisible(stage: string): boolean {
  return (PHOTO_VISIBLE_STAGES as readonly string[]).includes(stage);
}
