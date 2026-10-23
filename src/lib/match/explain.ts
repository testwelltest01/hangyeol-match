// 추천 이유와 카드 요약. 기획서: "추천 이유는 항상 보여준다."

import { DOMAINS, VALUE_ITEMS, type Domain } from "@/lib/items";
import { domainSimilarity, type Scores } from "@/lib/scoring";

/** 문장 속에서 영역을 부르는 말 */
const DOMAIN_PHRASE: Record<Domain, string> = {
  marriage: "결혼·자녀에 대한 생각",
  contact: "연락 빈도 기대",
  money: "돈 쓰는 방식",
  leisure: "주말 보내는 방식",
  conflict: "다툰 뒤 푸는 방식",
  chores: "집안일을 나누는 생각",
  tidiness: "정리정돈 습관",
  routine: "수면·식사 리듬",
};

/** 마지막 글자에 받침이 있는지 (한글이 아니면 받침 없음으로 본다) */
function hasBatchim(word: string): boolean {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0;
}

/** 조사 붙이기: josa("방식", "과", "와") → "방식과" */
export function josa(word: string, withBatchim: string, without: string): string {
  return word + (hasBatchim(word) ? withBatchim : without);
}

type DomainSim = { domain: Domain; sim: number; weight: number };

function domainSims(viewer: Scores, cand: Scores): DomainSim[] {
  return DOMAINS.map(({ id }) => ({
    domain: id,
    sim: domainSimilarity(viewer, cand, id),
    // 두 사람이 모두 중요하게 여길수록 이유로 꺼낼 가치가 크다
    weight: viewer.values.importance[id] + cand.values.importance[id],
  }));
}

/** 예: "연락 빈도 기대와 주말 보내는 방식이 비슷해서 추천했어요." */
export function recommendationReason(viewer: Scores, cand: Scores): string {
  const top = domainSims(viewer, cand)
    .sort((a, b) => b.sim - a.sim || b.weight - a.weight)
    .slice(0, 2);
  const [a, b] = top.map((t) => DOMAIN_PHRASE[t.domain]);
  if (top[0].sim < 0.7) return `${josa(a, "이", "가")} 가장 비슷해요. 나머지는 만나서 맞춰갈 부분이 있어요.`;
  return `${josa(a, "과", "와")} ${josa(b, "이", "가")} 비슷해서 추천했어요.`;
}

/** 둘 다 신경 쓰는데 가장 다른 영역. 없으면 null */
export function talkingPoint(viewer: Scores, cand: Scores): string | null {
  const diff = domainSims(viewer, cand)
    .filter((d) => viewer.values.importance[d.domain] >= 3 && d.sim < 0.7)
    .sort((a, b) => a.sim - b.sim)[0];
  if (!diff) return null;
  return `${josa(DOMAIN_PHRASE[diff.domain], "은", "는")} 조금 달라요. 만나면 먼저 이야기해보세요.`;
}

/** 두 사람이 가장 비슷한 영역 한 줄 (첫 만남 팁의 '공통점'). 충분히 비슷한 영역이 없으면 null */
export function commonGround(viewer: Scores, cand: Scores): string | null {
  const top = domainSims(viewer, cand).sort((a, b) => b.sim - a.sim || b.weight - a.weight)[0];
  if (!top || top.sim < 0.7) return null;
  return `${josa(DOMAIN_PHRASE[top.domain], "이", "가")} 가장 비슷해요. 만나서 '저도요'가 나오기 쉬운 이야기예요.`;
}

/** 카드에 붙이는 짧은 성향 3개: 가장 뚜렷하게 기운 답부터 */
export function profileChips(scores: Scores, count = 3): string[] {
  return VALUE_ITEMS.map((v) => ({ v, value: scores.values.items[v.id] }))
    .filter(({ value }) => value <= 2 || value >= 5)
    .sort((x, y) => Math.abs(y.value - 3.5) - Math.abs(x.value - 3.5))
    .slice(0, count)
    .map(({ v, value }) => (value <= 3 ? v.leftShort : v.rightShort));
}

/** 두 사람이 영역별로 얼마나 비슷한지 (0~100, 높은 순) */
export function domainComparison(viewer: Scores, cand: Scores): { domain: Domain; label: string; percent: number }[] {
  const label = Object.fromEntries(DOMAINS.map((d) => [d.id, d.label])) as Record<Domain, string>;
  return domainSims(viewer, cand)
    .map((d) => ({ domain: d.domain, label: label[d.domain], percent: Math.round(d.sim * 100) }))
    .sort((a, b) => b.percent - a.percent);
}
