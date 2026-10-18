import { DOMAINS, TRAITS, VALUE_ITEMS, type Domain, type Trait } from "./items";
import type { Scores } from "./scoring";

export type Lean = "strong-left" | "left" | "right" | "strong-right";

export function leanOf(value: number): Lean {
  if (value <= 2) return "strong-left";
  if (value === 3) return "left";
  if (value === 4) return "right";
  return "strong-right";
}

const IMPORTANCE_LABEL: Record<number, string> = {
  1: "달라도 괜찮은 영역",
  2: "조금 신경 쓰이는 영역",
  3: "많이 신경 쓰이는 영역",
  4: "꼭 맞아야 하는 영역",
};

/** 뚜렷하게 한쪽으로 기운 응답에만 붙이는 관계 팁. 상대와 다를 때 오해가 생기기 쉬운 지점을 짚는다. */
const TIPS: Record<string, { left?: string; right?: string }> = {
  V04: {
    left: "연락이 적어도 마음이 식은 게 아닌 편이에요. 연락을 자주 원하는 상대에게는 \"바쁠 땐 답이 늦을 수 있어\"라고 미리 말해두면 좋아요.",
    right: "연락을 자주 주고받을 때 편안함을 느끼는 편이에요. 처음 만날 때 서로 원하는 연락 빈도를 이야기해두면 서운함이 줄어요.",
  },
  V05: {
    right: "답장이 늦으면 신경이 쓰이는 편이에요. 상대의 하루 일정을 먼저 알고 있으면 기다리는 시간이 덜 불안해요.",
  },
  V08: {
    left: "모아두는 데 의미를 두는 편이에요. 돈 쓰는 기준은 오래 만날수록 중요해지니, 서로의 기준을 일찍 이야기해보세요.",
    right: "지금의 경험에 쓰는 데 의미를 두는 편이에요. 돈 쓰는 기준은 오래 만날수록 중요해지니, 서로의 기준을 일찍 이야기해보세요.",
  },
  V10: {
    left: "집에서 쉬어야 충전되는 편이에요. 밖에서 충전하는 상대와는 주말 하루는 집, 하루는 밖처럼 나누면 서로 편해요.",
    right: "밖에서 활동해야 충전되는 편이에요. 집에서 쉬어야 하는 상대에게는 혼자 쉬는 시간을 먼저 챙겨주세요.",
  },
  V11: {
    left: "주말 계획을 미리 세우는 편이에요. 즉흥적인 상대와는 큰 틀만 정해두면 서로 편해요.",
    right: "주말을 즉흥적으로 보내는 편이에요. 계획을 좋아하는 상대에게는 하루 전에라도 대략 알려주세요.",
  },
  V13: {
    left: "갈등은 바로 풀어야 마음이 편한 편이에요. 시간이 필요한 상대에게는 \"언제쯤 이야기할 수 있을까?\"라고 물어보세요.",
    right: "갈등이 생기면 생각을 정리할 시간이 필요한 편이에요. \"잠깐 생각하고 이야기하자\"고 먼저 말해주면 상대가 덜 불안해해요.",
  },
  V14: {
    left: "다툴 때 잠시 거리를 두는 게 편한 편이에요. 연락을 쉬기 전에 \"시간 갖고 다시 연락할게\"라고 남겨주세요.",
    right: "다투는 중에도 연락이 이어져야 안심이 되는 편이에요. 거리가 필요한 상대라면 다시 이야기할 시간을 함께 정해두세요.",
  },
  V15: {
    left: "원인을 분명히 짚어야 마음이 풀리는 편이에요. 감정이 가라앉은 뒤에 이야기하면 대화가 덜 날카로워져요.",
  },
  V19: {
    left: "정돈된 공간에서 편안함을 느끼는 편이에요. 생활감을 편하게 여기는 상대와는 같이 쓰는 공간의 기준만 맞춰두세요.",
  },
};

export type DomainReport = {
  domain: Domain;
  label: string;
  importanceLabel: string;
  items: { id: string; left: string; right: string; value: number; lean: Lean; chosen: string }[];
};

export type TraitReport = { trait: Trait; label: string; score: number; level: "high" | "mid" | "low"; text: string };

export type Report = {
  domains: DomainReport[];
  tips: string[];
  traits: TraitReport[];
  groomingLabel: string;
  groomingPreferenceLabel: string;
  dealbreakers: { label: string; value: string }[];
};

const TRAIT_TEXT: Record<Trait, Record<"high" | "mid" | "low", string>> = {
  extraversion: {
    high: "사람들과 어울릴 때 에너지가 생기는 편이에요.",
    mid: "상황에 따라 사람들과 어울리기도, 혼자 쉬기도 하는 편이에요.",
    low: "조용한 자리나 소수의 사람과 있을 때 편안한 편이에요.",
  },
  agreeableness: {
    high: "다른 사람의 감정에 쉽게 공감하는 편이에요.",
    mid: "공감하면서도 자기 기준을 지키는 편이에요.",
    low: "감정보다 사실과 판단을 먼저 보는 편이에요.",
  },
  conscientiousness: {
    high: "할 일을 미루지 않고 정돈된 상태를 좋아하는 편이에요.",
    mid: "필요할 때 집중해서 일을 해내는 편이에요.",
    low: "계획보다 그때그때 유연하게 움직이는 편이에요.",
  },
  stability: {
    high: "웬만한 일에는 마음이 크게 흔들리지 않는 편이에요.",
    mid: "대체로 안정적이지만 상황에 따라 감정이 오르내리기도 해요.",
    low: "감정을 섬세하게 느끼는 편이에요. 마음이 힘들 때 그 사실을 상대에게 말해주면 관계에 도움이 돼요.",
  },
  openness: {
    high: "새로운 생각과 상상을 즐기는 편이에요.",
    mid: "익숙한 것과 새로운 것을 고르게 즐기는 편이에요.",
    low: "익숙하고 구체적인 것을 편하게 느끼는 편이에요.",
  },
};

export function traitLevel(score: number): "high" | "mid" | "low" {
  if (score >= 3.67) return "high";
  if (score <= 2.33) return "low";
  return "mid";
}

export function groomingLabel(level: number): string {
  if (level < 1.75) return "자연스러운 편";
  if (level < 2.5) return "기본만 챙기는 편";
  if (level < 3.25) return "적당히 꾸미는 편";
  return "많이 꾸미는 편";
}

const PREF_LABEL: Record<number, string> = {
  1: "자연스러운 편",
  2: "기본만 챙기는 편",
  3: "적당히 꾸미는 편",
  4: "많이 꾸미는 편",
};

const DEALBREAKER_LABEL: Record<string, Record<string, string>> = {
  marriage: { yes: "결혼하고 싶다", unsure: "아직 모르겠다", no: "결혼 생각이 없다" },
  children: { yes: "원한다", unsure: "아직 모르겠다", no: "원하지 않는다" },
  smoking: { none: "피우지 않는다", ecig: "전자담배만 피운다", yes: "피운다" },
  drinking: { none: "마시지 않는다", rarely: "가끔 마신다", weekly: "주 1~2번 마신다", often: "주 3번 이상 마신다" },
};

export function buildReport(scores: Scores): Report {
  const domains: DomainReport[] = DOMAINS.map(({ id, label }) => ({
    domain: id,
    label,
    importanceLabel: IMPORTANCE_LABEL[scores.values.importance[id]] ?? "",
    items: VALUE_ITEMS.filter((v) => v.domain === id).map((v) => {
      const value = scores.values.items[v.id];
      const lean = leanOf(value);
      return {
        id: v.id,
        left: v.leftShort,
        right: v.rightShort,
        value,
        lean,
        chosen: lean.endsWith("left") ? v.leftShort : v.rightShort,
      };
    }),
  }));

  // 가장 뚜렷하게 기운 응답부터 팁을 최대 3개 고른다.
  const tips = VALUE_ITEMS.map((v) => ({ id: v.id, value: scores.values.items[v.id] }))
    .filter(({ value }) => value <= 2 || value >= 5)
    .map(({ id, value }) => ({ strength: Math.abs(value - 3.5), text: value <= 2 ? TIPS[id]?.left : TIPS[id]?.right }))
    .filter((t): t is { strength: number; text: string } => Boolean(t.text))
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 3)
    .map((t) => t.text);

  const traits: TraitReport[] = TRAITS.map(({ id, label }) => {
    const score = scores.bigFive[id];
    const level = traitLevel(score);
    return { trait: id, label, score, level, text: TRAIT_TEXT[id][level] };
  });

  return {
    domains,
    tips,
    traits,
    groomingLabel: groomingLabel(scores.grooming.self),
    groomingPreferenceLabel:
      scores.grooming.preferred === null ? "상관없음" : PREF_LABEL[scores.grooming.preferred],
    dealbreakers: [
      { label: "결혼", value: DEALBREAKER_LABEL.marriage[scores.dealbreakers.marriage] },
      { label: "자녀", value: DEALBREAKER_LABEL.children[scores.dealbreakers.children] },
      { label: "흡연", value: DEALBREAKER_LABEL.smoking[scores.dealbreakers.smoking] },
      {
        label: "음주",
        value: scores.dealbreakers.drinking ? DEALBREAKER_LABEL.drinking[scores.dealbreakers.drinking] : "아직 답하지 않았어요",
      },
    ],
  };
}

/** 성격 점수(1~5)를 막대 너비용 0~100으로 */
export const toPercent = (score: number) => Math.round(((score - 1) / 4) * 100);
