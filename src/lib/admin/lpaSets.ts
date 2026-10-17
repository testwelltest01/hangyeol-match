// LPA에 쓸 지표 묶음. Mplus 변수 이름은 8자 이하 영문.
import { DOMAINS, TRAITS, VALUE_ITEMS, type Domain, type Trait } from "@/lib/items";
import type { Scores } from "@/lib/scoring";

export type LpaIndicator = { id: string; label: string; mplus: string };

export type LpaSet = {
  id: "bigfive" | "importance" | "values";
  label: string;
  lead: string;
  indicators: LpaIndicator[];
  range: [number, number];
  get: (s: Scores) => number[];
};

const TRAIT_MPLUS: Record<Trait, string> = { extraversion: "EXT", agreeableness: "AGR", conscientiousness: "CON", stability: "EMO", openness: "OPE" };
const DOMAIN_MPLUS: Record<Domain, string> = {
  marriage: "I_MAR",
  contact: "I_CON",
  money: "I_MON",
  leisure: "I_LEI",
  conflict: "I_CFL",
  chores: "I_CHO",
  tidiness: "I_TID",
  routine: "I_ROU",
};

export const LPA_SETS: LpaSet[] = [
  {
    id: "bigfive",
    label: "성격 5요인",
    lead: "Mini-IPIP 특성별 평균 (1~5). 정서 안정성은 높을수록 안정적이에요.",
    indicators: TRAITS.map((t) => ({ id: t.id, label: t.label, mplus: TRAIT_MPLUS[t.id] })),
    range: [1, 5],
    get: (s) => TRAITS.map((t) => s.bigFive[t.id]),
  },
  {
    id: "importance",
    label: "영역 중요도 8개",
    lead: "가치관 영역마다 상대와 다를 때 신경 쓰이는 정도 (1~4).",
    indicators: DOMAINS.map((d) => ({ id: d.id, label: d.label, mplus: DOMAIN_MPLUS[d.id] })),
    range: [1, 4],
    get: (s) => DOMAINS.map((d) => s.values.importance[d.id]),
  },
  {
    id: "values",
    label: "가치관 24문항",
    lead: "양극 문항 원점수 (1 = 왼쪽 문장에 매우 가까움, 6 = 오른쪽 문장에 매우 가까움).",
    indicators: VALUE_ITEMS.map((v) => ({ id: v.id, label: `${v.id} ${v.leftShort}↔${v.rightShort}`, mplus: v.id })),
    range: [1, 6],
    get: (s) => VALUE_ITEMS.map((v) => s.values.items[v.id]),
  },
];

export const findLpaSet = (id: unknown): LpaSet => LPA_SETS.find((s) => s.id === id) ?? LPA_SETS[0];
