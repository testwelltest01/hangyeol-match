import { kstDay } from "@/lib/day";

/**
 * 사진 교체 규칙: 처음 등록은 횟수에 넣지 않고, 교체는 한국 날짜 기준 하루 한 번.
 * createdAts는 그 자리(얼굴/전신)에 등록된 모든 사진의 등록 시각(교체된 것 포함).
 */
export function canUploadToday(createdAts: string[], now: Date = new Date()): boolean {
  if (createdAts.length === 0) return true;
  const today = kstDay(now);
  const sorted = [...createdAts].sort();
  const replacementsToday = sorted.slice(1).filter((t) => kstDay(new Date(t)) === today).length;
  return replacementsToday === 0;
}
