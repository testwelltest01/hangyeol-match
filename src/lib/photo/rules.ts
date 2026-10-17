/**
 * 사진 올리기 규칙: 한 계정당 20번까지 (평생, 얼굴·전신 합산).
 * 등록된 사진과 기준에 맞지 않아 거절된 사진을 모두 센다. AI 쪽 장애로 실패한 시도는 사용자 탓이 아니라서 세지 않는다.
 */
export const PHOTO_UPLOADS_PER_ACCOUNT = 20;

/** 횟수에 세는 시도 결과값 (photo_attempts.result) */
export const COUNTED_RESULTS = ["registered", "rejected"] as const;

/** 남은 횟수. results는 이 계정의 photo_attempts.result 전체 */
export function remainingUploads(results: string[]): number {
  const used = results.filter((r) => (COUNTED_RESULTS as readonly string[]).includes(r)).length;
  return Math.max(0, PHOTO_UPLOADS_PER_ACCOUNT - used);
}

/** 한국 날짜 기준 오늘 0시(UTC ISO 문자열) */
export function kstDayStartIso(day: string): string {
  return new Date(`${day}T00:00:00+09:00`).toISOString();
}
