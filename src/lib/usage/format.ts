// 관리자 'API 사용량'의 숫자 표시. 순수 함수(테스트용).

/** 달러: 작은 값은 자릿수를 늘려서 0으로 보이지 않게 */
export function fmtUsd(v: number): string {
  if (v === 0) return "$0";
  const digits = v < 0.01 ? 4 : v < 1 ? 3 : 2;
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

/** 원: 환율을 곱해 반올림 */
export function fmtKrw(usd: number, rate: number): string {
  const won = usd * rate;
  if (won > 0 && won < 1) return "1원 미만";
  return `${Math.round(won).toLocaleString("ko-KR")}원`;
}

/** 토큰 수: 1만 이상은 '만', 1억 이상은 '억' */
export function fmtTokens(n: number): string {
  if (n < 10_000) return Math.round(n).toLocaleString("ko-KR");
  if (n < 100_000_000) return `${(n / 10_000).toFixed(n < 100_000 ? 1 : 0)}만`;
  return `${(n / 100_000_000).toFixed(1)}억`;
}

export const fmtSeconds = (ms: number | null): string => (ms === null ? "–" : `${(ms / 1000).toFixed(1)}초`);

export const fmtPercent = (part: number, whole: number): string => (whole ? `${Math.round((part / whole) * 100)}%` : "–");
