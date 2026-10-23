// LPA에 쓸 지표 묶음. Mplus 변수 이름은 8자 이하 영문.
// source: main = 기본 검사(test_scores, 회원마다 하나), love = 연애 상황 검사(love_reports, 사람마다 한 번 고름 src/lib/admin/loveSample.ts)
import { DOMAINS, TRAITS, VALUE_ITEMS, type Domain, type Trait } from "@/lib/items";
import { LOVE_GROUPS, LOVE_SCALES, type LoveScale } from "@/lib/love/items";
import type { LoveScores } from "@/lib/love/score";
import type { Scores } from "@/lib/scoring";

export type LpaIndicator = { id: string; label: string; mplus: string };

type SetBase = {
  id: "bigfive" | "importance" | "values" | "love_relation" | "love_nature" | "love_all";
  label: string;
  lead: string;
  indicators: LpaIndicator[];
  range: [number, number];
};
export type LpaSet = (SetBase & { source: "main"; get: (s: Scores) => number[] }) | (SetBase & { source: "love"; get: (s: LoveScores) => number[] });

/** 연애 상황 척도의 Mplus 이름 (척도 id 앞 8자, 대문자) */
export const loveMplus = (id: string) => id.toUpperCase().slice(0, 8);

const loveSet = (id: SetBase["id"], label: string, lead: string, scales: LoveScale[]): LpaSet => ({
  id,
  source: "love",
  label,
  lead,
  indicators: scales.map((s) => ({ id: s.id, label: s.label, mplus: loveMplus(s.id) })),
  range: [1, 5],
  get: (sc) => scales.map((s) => sc[s.id]),
});
const partOf = (part: "relation" | "nature") => LOVE_SCALES.filter((s) => LOVE_GROUPS.find((g) => g.id === s.group)?.part === part);

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
    source: "main",
    label: "성격 5요인",
    lead: "Mini-IPIP 특성별 평균 (1~5). 정서 안정성은 높을수록 안정적이에요.",
    indicators: TRAITS.map((t) => ({ id: t.id, label: t.label, mplus: TRAIT_MPLUS[t.id] })),
    range: [1, 5],
    get: (s) => TRAITS.map((t) => s.bigFive[t.id]),
  },
  {
    id: "importance",
    source: "main",
    label: "영역 중요도 8개",
    lead: "가치관 영역마다 상대와 다를 때 신경 쓰이는 정도 (1~4).",
    indicators: DOMAINS.map((d) => ({ id: d.id, label: d.label, mplus: DOMAIN_MPLUS[d.id] })),
    range: [1, 4],
    get: (s) => DOMAINS.map((d) => s.values.importance[d.id]),
  },
  {
    id: "values",
    source: "main",
    label: "가치관 24문항",
    lead: "양극 문항 원점수 (1 = 왼쪽 문장에 매우 가까움, 6 = 오른쪽 문장에 매우 가까움).",
    indicators: VALUE_ITEMS.map((v) => ({ id: v.id, label: `${v.id} ${v.leftShort}↔${v.rightShort}`, mplus: v.id })),
    range: [1, 6],
    get: (s) => VALUE_ITEMS.map((v) => s.values.items[v.id]),
  },
  loveSet("love_relation", "연애 · 관계 척도 12개", "연애 상황 검사의 IPIP 관계 척도 평균 (1~5).", partOf("relation")),
  loveSet("love_nature", "연애 · 기질·성격 7개", "연애 상황 검사의 한결 기질 4·성격 3 척도 평균 (1~5).", partOf("nature")),
  loveSet("love_all", "연애 · 19척도 전체", "연애 상황 검사의 관계 12·기질 4·성격 3 척도 평균 (1~5).", LOVE_SCALES),
];

export const findLpaSet = (id: unknown): LpaSet => LPA_SETS.find((s) => s.id === id) ?? LPA_SETS[0];
