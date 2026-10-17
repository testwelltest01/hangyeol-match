/** 한국 날짜 'YYYY-MM-DD'. 하루 추천과 하루 사진 올리기 횟수는 한국 자정 기준으로 바뀐다. */
export function kstDay(date: Date = new Date()): string {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** 한국 기준 올해 */
export function kstYear(date: Date = new Date()): number {
  return Number(kstDay(date).slice(0, 4));
}

/** 'YYYY-MM-DD'에서 n일 전 */
export function daysBefore(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}
