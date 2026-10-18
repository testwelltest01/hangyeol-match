/** 한국 날짜 'YYYY-MM-DD' (한국 자정 기준). 하루 상한·통계는 이 날짜를 쓴다. 추천은 matchDay를 쓴다 */
export function kstDay(date: Date = new Date()): string {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** 새 추천이 나오는 한국 시각 (저녁 8시). vercel.json의 크론(11:00 UTC)과 맞춘다 */
export const MATCH_HOUR_KST = 20;

/**
 * 추천의 '하루' 'YYYY-MM-DD'. 저녁 8시에 다음 날로 넘어간다.
 * 10월 19일 20:00 ~ 10월 20일 19:59(한국)에 받은 추천은 '2026-10-20' 추천이다.
 * (예전에 자정에 만든 '그날' 추천이 저녁 8시까지 그대로 이어지도록 다음 날 이름을 붙인다)
 */
export function matchDay(date: Date = new Date()): string {
  return kstDay(new Date(date.getTime() + (24 - MATCH_HOUR_KST) * 60 * 60 * 1000));
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
