// 연애 상황 보고서: AI에게 줄 지시문·입력·응답 형식과 응답 검사. 순수 모듈(테스트용).
// 지시문이나 형식을 바꾸면 PROMPT_VERSION을 올린다.
// 보내는 것: 성별, 이 검사 점수, 기본 검사의 성격·관계 가치관, 추가 검사 요약.
// 보내지 않는 것: 닉네임·이메일·나이·사는 곳·종교·연락처·사진·자기소개·위생·꾸밈·조건(결혼·자녀·흡연·음주).

import { DOMAINS, IMPORTANCE_OPTIONS, TRAITS, VALUE_ITEMS } from "@/lib/items";
import { LOVE_GROUPS, LOVE_SCALES } from "@/lib/love/items";
import { loveLevel, type LoveScores } from "@/lib/love/score";
import { traitLevel } from "@/lib/report";
import type { Scores } from "@/lib/scoring";

export const PROMPT_VERSION = "2026-10-v2";

export type SituationId = "first" | "texting" | "expressing" | "hurt" | "fight" | "makeup" | "hard_day" | "deciding" | "together" | "long_term";

/** 보고서의 장면 10가지 (순서대로 보여준다). short는 바로가기 칩 */
export const SITUATIONS: { id: SituationId; title: string; short: string }[] = [
  { id: "first", title: "처음 만나 알아갈 때", short: "알아갈 때" },
  { id: "texting", title: "연락이 뜸하거나 답장이 늦을 때", short: "연락이 뜸할 때" },
  { id: "expressing", title: "좋아하는 마음을 표현할 때", short: "마음 표현" },
  { id: "hurt", title: "서운한 일이 생겼을 때", short: "서운할 때" },
  { id: "fight", title: "의견이 부딪혀 다툴 때", short: "다툴 때" },
  { id: "makeup", title: "다툰 뒤 화해할 때", short: "화해할 때" },
  { id: "hard_day", title: "둘 중 한 사람이 힘든 날", short: "힘든 날" },
  { id: "deciding", title: "데이트 계획과 중요한 결정을 할 때", short: "계획·결정" },
  { id: "together", title: "함께 보내는 주말", short: "주말" },
  { id: "long_term", title: "오래 만나 익숙해졌을 때", short: "오래 만날 때" },
];

export type Scene = {
  /** 이럴 때 나는 */
  me: string;
  /** 상대에게는 이렇게 보일 수 있어요 */
  seen: string;
  /** 이렇게 해 보면 좋아요 */
  tip: string;
  /** 이렇게 말해 보세요 (한 문장) */
  say: string;
};

export type LoveReport = {
  headline: string;
  summary: string;
  /** 타고난 기질과 다듬어 가는 성격이 연애에서 함께 드러나는 모습 (2026-10-v2부터) */
  nature: string;
  strengths: string[];
  situations: Record<SituationId, Scene>;
  match: { good: string; careful: string };
  one_thing: string;
};

export const SYSTEM_PROMPT = `당신은 소개팅 서비스 '한결'의 연애 코치입니다.
한 사람의 검사 결과를 받아, 연애의 여러 장면에서 이 사람이 어떻게 느끼고 행동하기 쉬운지, 결이 다른 상대에게는 어떻게 보일 수 있는지,
무엇을 해 보면 좋은지를 이 사람에게 직접 들려주는 보고서를 씁니다.

## 받는 정보
- 관계 척도 12가지 (1~5점, 3이 중간). 각 항목이 무엇을 재는지와 낮은 쪽·높은 쪽의 뜻이 함께 옵니다.
- 기질 4가지와 성격 3가지 (1~5점). 기질은 상황에 처음 반응하는 타고난 경향(설렘 찾기, 조심성, 정에 기대기, 끈기)이고,
  성격은 그 반응을 살면서 어떻게 다루게 되었는지 보여 주는 태도(스스로 서기, 함께하는 마음, 더 큰 의미)입니다.
- 기본 검사 결과: 성격 5요인(1~5점), 관계 가치관(두 문장 중 어느 쪽에 가까운지 1~6점), 영역마다 생각이 다른 상대가 얼마나 신경 쓰이는지.
  가입 전에 한 검사라 기본 검사 결과나 성별이 없을 수 있습니다. 없으면 연애 상황 검사 결과만으로 쓰고, 없는 정보를 짐작해 채우지 마세요.
- 추가 검사 요약 (추가 검사를 한 사람만 있음).
점수는 이 사람이 스스로 답한 결과이고, 다른 사람과 비교한 순위가 아닙니다.

## 쓰는 방법
- 결과 하나씩 풀지 말고 여러 결과를 엮어 해석하세요. 이 보고서의 가치는 조합에서 나옵니다.
  예: 속마음은 담아 두는 편인데 걱정이 많은 편이면, 서운함이 말없이 쌓였다가 한꺼번에 나올 수 있다.
  예: 먼저 믿는 편이고 연락은 적당히를 좋아하면, 답장이 늦어도 크게 흔들리지 않는다.
- 기질과 성격은 함께 읽으세요. 기질이 만드는 첫 반응을 성격이 어떻게 다루는지가 핵심입니다.
  예: 조심성이 높은데 스스로 서기도 높으면, 처음엔 오래 망설여도 한번 정하면 흔들리지 않는다.
  예: 설렘 찾기가 높은데 함께하는 마음이 높으면, 즉흥적이어도 상대의 속도를 살피며 맞춘다.
  예: 정에 기대기가 높은데 스스로 서기가 아직 찾는 중이면, 상대의 반응 하나에 하루 기분이 크게 달라질 수 있다.
  장면을 쓸 때도 관계 척도와 함께 이 조합을 근거로 쓰세요.
- 장면마다 그 장면과 관계있는 결과를 근거로 쓰세요. 관계 가치관 응답(연락 빈도, 답장 속도, 다툴 때 연락, 갈등을 푸는 방식, 주말 계획, 집·밖 충전 등)이
  그 장면과 관계있으면 반드시 반영하세요.
- 3점 근처(중간)인 결과는 상황에 따라 다르다는 쪽으로 가볍게 다루고, 높은 편·낮은 편인 결과에 무게를 두세요.
- 그 순간이 그려지게 구체적으로 쓰세요. "소통이 중요해요" 같은 일반론 대신 "답장이 몇 시간 없으면 ~" 처럼.
- 좋은 점과 조심할 점을 함께 쓰되, 어느 방향도 나쁜 성격이 아니라 결이 다를 뿐이라는 태도로 씁니다.
- seen(상대에게는 이렇게 보일 수 있어요)은 이 사람의 행동이 결이 다른 상대에게 오해를 살 수 있는 지점을 짚습니다. 한결이 가장 중요하게 여기는 부분입니다.
  누구 탓도 아니고 서로 다르게 받아들일 수 있다는 점을 쓰세요.
- say(이렇게 말해 보세요)는 이 사람이 그 장면에서 연인에게 실제로 건넬 수 있는 한 문장입니다. 따옴표 없이, 그 장면에 맞는 자연스러운 말투로
  (처음 알아가는 장면은 해요체, 오래 만난 장면은 반말도 괜찮습니다).

## 각 칸
- headline: 이 사람의 연애 결을 담은 한 줄. 35자 이내, 마침표 없이. (예: 천천히 열지만 한번 열면 깊게 마음을 주는 사람)
- summary: 3~4문장
- nature: 타고난 기질과 다듬어 가는 성격이 연애에서 함께 어떻게 드러나는지 3~4문장. 첫 반응(기질)과 그것을 다루는 방식(성격)을 엮어서 씁니다.
- strengths: 연애에서의 강점 3개, 각 1문장
- situations: 장면마다 me 2~3문장, seen 1~2문장, tip 1~2문장, say 1문장(50자 이내)
  first 처음 만나 알아갈 때 / texting 연락이 뜸하거나 답장이 늦을 때 / expressing 좋아하는 마음을 표현할 때 / hurt 서운한 일이 생겼을 때 /
  fight 의견이 부딪혀 다툴 때 / makeup 다툰 뒤 화해할 때 / hard_day 둘 중 한 사람이 힘든 날 / deciding 데이트 계획과 중요한 결정을 할 때 /
  together 함께 보내는 주말 / long_term 오래 만나 익숙해졌을 때
- match.good: 잘 맞는 상대의 결 1~2문장
- match.careful: 맞춰 가는 데 이야기가 필요한 상대의 결과, 그런 상대와 무엇을 먼저 이야기하면 좋은지 1~2문장
- one_thing: 이 사람의 연애를 더 편하게 만들어 줄 한 가지 1~2문장

## 지킬 것
- 친근한 존댓말(해요체)로 이 사람에게 직접 말하듯 씁니다. 이름이나 '당신' 같은 호칭은 쓰지 않습니다. (예: "~하는 편이에요")
- "~하는 편이에요", "~할 수 있어요"처럼 경향으로 말하고 단정하지 않습니다.
- 점수, 숫자, 척도·검사 이름(IPIP, 5요인, TCI, 자극추구·위험회피 같은 학술 용어 등)을 쓰지 않습니다. 필요하면 받은 한결식 이름(설렘 찾기, 조심성 등)을 씁니다.
- 진단·병리 용어를 쓰지 않습니다 (불안장애, 우울, 분노조절장애, 회피형·불안형 같은 애착 유형, 나르시시즘 등). MBTI·에니어그램 같은 다른 검사의 유형 이름도 쓰지 않습니다.
- 성별 고정관념을 쓰지 않습니다 ("남자는 원래 ~" 등). 이 서비스는 이성끼리 이어 주지만, 상대는 특정 인물이 아니라 앞으로 만날 사람입니다.
- 바꾸라고 다그치지 않고, 해 볼 만한 작은 행동을 제안합니다.
- 외모, 종교, 돈의 액수, 성적인 내용은 다루지 않습니다.
- 모든 글은 한국어로 씁니다.`;

export type LoveContext = {
  /** 모르면 null (가입 전 비회원 검사) */
  gender: "male" | "female" | null;
  love: LoveScores;
  /** 기본 검사 점수. 없으면 null (가입 전 비회원 검사, 기본 검사 전 회원) */
  main: Scores | null;
  /** 추가 검사 요약 (src/lib/extra/tests.ts summarizeExtra의 chips) */
  extraChips: string[];
};

const LEVEL_KO = { high: "높은 편", mid: "중간", low: "낮은 편" } as const;
const GENDER_KO = { male: "남성", female: "여성" } as const;
const fmt = (n: number) => n.toFixed(2);

function leanText(value: number, left: string, right: string): string {
  if (value <= 2) return `'${left}' 쪽 (뚜렷함)`;
  if (value === 3) return `'${left}' 쪽 (약간)`;
  if (value === 4) return `'${right}' 쪽 (약간)`;
  return `'${right}' 쪽 (뚜렷함)`;
}

/** AI에게 보내는 입력 글 */
export function buildUserInput(ctx: LoveContext): string {
  const lines: string[] = [];
  lines.push(
    ctx.gender ? `성별: ${GENDER_KO[ctx.gender]} (매칭 상대는 ${GENDER_KO[ctx.gender === "male" ? "female" : "male"]})` : "성별: 알 수 없음 (상대를 성별로 부르지 말고 '상대'로 쓰세요)",
    "",
  );

  const scaleLines = (part: "relation" | "nature") => {
    for (const g of LOVE_GROUPS.filter((x) => x.part === part)) {
      lines.push(`[${g.label}]`);
      for (const s of LOVE_SCALES.filter((x) => x.group === g.id)) {
        const v = ctx.love[s.id];
        lines.push(`- ${s.label}: ${s.about}. 낮으면 '${s.low}', 높으면 '${s.high}' → ${fmt(v)} (${LEVEL_KO[loveLevel(v)]})`);
      }
    }
  };
  lines.push("## 관계 척도 (1~5점, 3이 중간)");
  scaleLines("relation");
  lines.push("", "## 기질과 성격 (1~5점, 3이 중간. 기질은 타고난 첫 반응의 경향, 성격은 살면서 다듬어 온 태도)");
  scaleLines("nature");
  lines.push("");

  const main = ctx.main;
  if (!main) {
    lines.push("## 기본 검사 결과: 없음 (가입 전에 한 검사라 연애 상황 검사 결과만 있어요)");
    if (ctx.extraChips.length) {
      lines.push("", "## 추가 검사 요약");
      for (const c of ctx.extraChips) lines.push(`- ${c}`);
    }
    return lines.join("\n");
  }

  lines.push("## 성격 5요인 (1~5점, 정서 안정성은 높을수록 안정적)");
  for (const t of TRAITS) {
    const v = main.bigFive[t.id];
    lines.push(`- ${t.label}: ${fmt(v)} (${LEVEL_KO[traitLevel(v)]})`);
  }
  lines.push("");

  lines.push("## 관계 가치관 (1~6점, 1은 왼쪽 문장에 매우 가까움, 6은 오른쪽 문장에 매우 가까움)");
  for (const d of DOMAINS) {
    const imp = IMPORTANCE_OPTIONS.find((o) => o.value === main.values.importance[d.id])?.label ?? "모름";
    lines.push(`[${d.label}] 이 영역에서 생각이 다른 상대: ${imp}`);
    for (const v of VALUE_ITEMS.filter((x) => x.domain === d.id)) {
      const value = main.values.items[v.id];
      lines.push(`- ${v.left} ↔ ${v.right}: ${value} → ${leanText(value, v.leftShort, v.rightShort)}`);
    }
  }

  if (ctx.extraChips.length) {
    lines.push("", "## 추가 검사 요약");
    for (const c of ctx.extraChips) lines.push(`- ${c}`);
  }
  return lines.join("\n");
}

const STR = { type: "string" } as const;
const SCENE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["me", "seen", "tip", "say"],
  properties: { me: STR, seen: STR, tip: STR, say: STR },
} as const;

export const RESPONSE_SCHEMA = {
  name: "love_report",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["headline", "summary", "nature", "strengths", "situations", "match", "one_thing"],
    properties: {
      headline: STR,
      summary: STR,
      nature: STR,
      strengths: { type: "array", items: STR },
      situations: {
        type: "object",
        additionalProperties: false,
        required: SITUATIONS.map((s) => s.id),
        properties: Object.fromEntries(SITUATIONS.map((s) => [s.id, SCENE_SCHEMA])),
      },
      match: {
        type: "object",
        additionalProperties: false,
        required: ["good", "careful"],
        properties: { good: STR, careful: STR },
      },
      one_thing: STR,
    },
  },
} as const;

/** 앞뒤 공백·감싼 따옴표를 떼고, 너무 길면 자른다. 비었으면 null */
function clean(v: unknown, max: number, unquote = false): string | null {
  if (typeof v !== "string") return null;
  let s = v.trim();
  if (unquote) s = s.replace(/^["'“”‘’「『]+|["'“”‘’」』]+$/g, "").trim();
  if (!s) return null;
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

/** AI 응답을 검사해 보고서로. 칸이 빠졌거나 비었으면 null (실패로 처리해 다시 쓴다) */
export function parseLoveReport(raw: unknown): LoveReport | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const headline = clean(r.headline, 60);
  const summary = clean(r.summary, 600);
  const nature = clean(r.nature, 600);
  const oneThing = clean(r.one_thing, 300);
  const strengths = Array.isArray(r.strengths) ? r.strengths.map((s) => clean(s, 200)).filter((s): s is string => Boolean(s)).slice(0, 3) : [];
  const m = (r.match ?? {}) as Record<string, unknown>;
  const good = clean(m.good, 300);
  const careful = clean(m.careful, 300);
  if (!headline || !summary || !nature || !oneThing || strengths.length < 2 || !good || !careful) return null;

  const rawScenes = (r.situations ?? {}) as Record<string, Record<string, unknown> | undefined>;
  const situations = {} as Record<SituationId, Scene>;
  for (const { id } of SITUATIONS) {
    const s = rawScenes[id] ?? {};
    const scene = { me: clean(s.me, 500), seen: clean(s.seen, 300), tip: clean(s.tip, 300), say: clean(s.say, 120, true) };
    if (!scene.me || !scene.seen || !scene.tip || !scene.say) return null;
    situations[id] = scene as Scene;
  }
  return { headline: headline.replace(/[.。]$/, ""), summary, nature, strengths, situations, match: { good, careful }, one_thing: oneThing };
}
