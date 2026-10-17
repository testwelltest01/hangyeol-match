import { EXTRA_TESTS, summarizeExtra, type ExtraTestId } from "@/lib/extra/tests";

/** 리포트의 '더 알아보기' 카드 한 장 */
export type ExtraCard = {
  id: string;
  title: string;
  short: string;
  minutes: number;
  result: { headline: string; chips: string[]; share: boolean } | null;
};

/** 리포트 '더 알아보기' 카드. 결과는 저장된 점수로 다시 요약한다 (문구를 고쳐도 바로 반영) */
export function extraCards(rows: Partial<Record<ExtraTestId, { scores: Parameters<typeof summarizeExtra>[1]; share: boolean }>>): ExtraCard[] {
  return EXTRA_TESTS.map((t) => {
    const r = rows[t.id];
    return {
      id: t.id,
      title: t.title,
      short: t.short,
      minutes: t.minutes,
      result: r ? { ...summarizeExtra(t, r.scores), share: r.share } : null,
    };
  });
}
