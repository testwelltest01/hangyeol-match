// 연애 상황 보고서: AI에게 줄 지시문·입력·응답 형식과 응답 검사. 순수 모듈(테스트용).
// 지시문이나 형식을 바꾸면 PROMPT_VERSION을 올린다.
// 보내는 것: 성별, 이 검사 점수, 기본 검사의 성격·관계 가치관, 추가 검사 요약.
// 보내지 않는 것: 닉네임·이메일·나이·사는 곳·종교·연락처·사진·자기소개·위생·꾸밈·조건(결혼·자녀·흡연·음주).

import { DOMAINS, IMPORTANCE_OPTIONS, TRAITS, VALUE_ITEMS } from "@/lib/items";
import { LOVE_GROUPS, LOVE_SCALES } from "@/lib/love/items";
import { loveLevel, type LoveScores } from "@/lib/love/score";
import { traitLevel } from "@/lib/report";
import type { Scores } from "@/lib/scoring";

export const PROMPT_VERSION = "2026-10-v3";

/**
 * 이번 PROMPT_VERSION에서 보고서가 무엇이 달라졌는지 (예전 버전으로 쓴 보고서 위 '새 보고서 받기' 안내에 그대로 보여준다).
 * PROMPT_VERSION을 올릴 때 같이 고친다
 */
export const PROMPT_NEWS = "장면마다 대화 예시가 들어갔어요. 같은 순간을 아쉬운 대화와 좋은 대화로 나눠 보여 주고, 그때 상대의 속마음도 함께 담았어요.";

export type SituationId = "first" | "texting" | "expressing" | "hurt" | "fight" | "makeup" | "hard_day" | "deciding" | "together" | "long_term";

/** 보고서의 장면 10가지 (순서대로 보여준다) */
export const SITUATIONS: { id: SituationId; title: string }[] = [
  { id: "first", title: "처음 만나 알아갈 때" },
  { id: "texting", title: "연락이 뜸하거나 답장이 늦을 때" },
  { id: "expressing", title: "좋아하는 마음을 표현할 때" },
  { id: "hurt", title: "서운한 일이 생겼을 때" },
  { id: "fight", title: "의견이 부딪혀 다툴 때" },
  { id: "makeup", title: "다툰 뒤 화해할 때" },
  { id: "hard_day", title: "둘 중 한 사람이 힘든 날" },
  { id: "deciding", title: "데이트 계획과 중요한 결정을 할 때" },
  { id: "together", title: "함께 보내는 주말" },
  { id: "long_term", title: "오래 만나 익숙해졌을 때" },
];

/** 대화 한 줄. thought는 상대 줄에만 있다 (그 순간 상대의 속마음) */
export type TalkLine = { who: "me" | "partner"; text: string; thought?: string };

/** 대화로 보면: 같은 순간을 아쉬운 대화와 좋은 대화로 */
export type Talk = {
  /** 대화가 일어나는 구체적인 순간 한 문장 */
  moment: string;
  /** 이 사람의 결대로 하면 나오기 쉬운 아쉬운 대화 */
  bad: TalkLine[];
  /** 같은 순간에서 tip을 해 본 좋은 대화 */
  good: TalkLine[];
};

export type Scene = {
  /** 이럴 때 나는 */
  me: string;
  /** 상대에게는 이렇게 보일 수 있어요 */
  seen: string;
  /** 이렇게 해 보면 좋아요 */
  tip: string;
  /** 대화로 보면 (2026-10-v3부터) */
  talk?: Talk;
  /** 이렇게 말해 보세요 한 문장 (2026-10-v3 전에 쓴 보고서에만 있다. '새 보고서 받기' 전까지 그대로 보여준다) */
  say?: string;
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
- talk(대화로 보면)는 그 장면의 한 순간을 실제 대화로 보여 줍니다. 앞의 설명이 대화에서 그대로 보이게 쓰세요.
  - moment: 대화가 일어나는 구체적인 순간 한 문장 (언제, 무슨 일이 있었는지). 예: 금요일 밤, 상대가 회사 일 때문에 약속에 40분 늦게 왔어요.
  - bad(아쉬운 대화): 이 사람의 결대로 하면 나오기 쉬운 대화입니다. 이 사람이 실제로 할 법한 말로 쓰고, 못된 사람이나 과장된 모습으로 그리지 마세요.
    나쁜 뜻은 없지만 상대에게는 다르게 닿는 말이어야 합니다 (seen에서 짚은 오해가 대화에서 드러나게).
  - good(좋은 대화): 같은 순간에서 tip을 해 본 대화입니다. 이 사람의 결을 버리지 않고 말 한두 마디만 바꾼 모습으로, 지나치게 이상적인 대사는 피하세요.
  - 두 대화는 같은 순간에서 시작합니다 (첫 줄이 같아도 됩니다). 각각 3~5줄, 나와 상대가 번갈아 말하고 마지막 줄은 상대(partner)의 말로 끝냅니다.
  - 줄마다 who는 me(이 사람) 또는 partner(상대), text는 실제로 하는 말이나 보내는 메시지 한두 문장(60자 이내, 따옴표 없이)입니다.
  - thought: partner 줄에는 그 순간 상대의 속마음을 한 문장(40자 이내, 따옴표 없이)으로 씁니다. 겉으로 한 말과 속마음이 다를 수 있다는 것,
    바로 앞에서 이 사람이 한 말이 상대에게 어떻게 닿았는지가 보이게 쓰세요. me 줄의 thought는 빈 문자열로 둡니다.
  - 상대도 나쁜 사람으로 그리지 않습니다. 상대의 속마음은 서운함, 안심, 고마움처럼 누구나 느낄 만한 마음입니다.
  - 말투는 실제 연인 사이처럼 씁니다. 처음 알아가는 장면은 해요체, 사귄 뒤 장면은 반말도 괜찮고, 연락 장면은 메시지 말투도 괜찮습니다.

## 각 칸
- headline: 이 사람의 연애 결을 담은 한 줄. 35자 이내, 마침표 없이. (예: 천천히 열지만 한번 열면 깊게 마음을 주는 사람)
- summary: 3~4문장
- nature: 타고난 기질과 다듬어 가는 성격이 연애에서 함께 어떻게 드러나는지 3~4문장. 첫 반응(기질)과 그것을 다루는 방식(성격)을 엮어서 씁니다.
- strengths: 연애에서의 강점 3개, 각 1문장
- situations: 장면마다 me 2~3문장, seen 1~2문장, tip 1~2문장, talk(moment 1문장, bad·good 각 3~5줄)
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
const LINE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["who", "text", "thought"],
  properties: { who: { type: "string", enum: ["me", "partner"] }, text: STR, thought: STR },
} as const;
const TALK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["moment", "bad", "good"],
  properties: { moment: STR, bad: { type: "array", items: LINE_SCHEMA }, good: { type: "array", items: LINE_SCHEMA } },
} as const;
const SCENE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["me", "seen", "tip", "talk"],
  properties: { me: STR, seen: STR, tip: STR, talk: TALK_SCHEMA },
} as const;

/**
 * 한 번에 다 쓰면 오래 걸려서(장면마다 대화 두 개) 두 번에 나눠 동시에 부른다.
 * 0번: 요약·기질·강점·잘 맞는 결·한 가지 + 앞 장면 5개, 1번: 뒤 장면 5개. 받은 뒤 mergeParts로 합친다
 */
export const SCENE_PARTS: SituationId[][] = [SITUATIONS.slice(0, 5).map((s) => s.id), SITUATIONS.slice(5).map((s) => s.id)];

const situationsSchema = (ids: SituationId[]) => ({
  type: "object",
  additionalProperties: false,
  required: ids,
  properties: Object.fromEntries(ids.map((id) => [id, SCENE_SCHEMA])),
});

export const RESPONSE_SCHEMAS = [
  {
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
        situations: situationsSchema(SCENE_PARTS[0]),
        match: {
          type: "object",
          additionalProperties: false,
          required: ["good", "careful"],
          properties: { good: STR, careful: STR },
        },
        one_thing: STR,
      },
    },
  },
  {
    name: "love_report_scenes",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["situations"],
      properties: { situations: situationsSchema(SCENE_PARTS[1]) },
    },
  },
] as const;

/** 나눠 부를 때 입력 글 끝에 붙이는 안내 (이번 응답에 쓸 칸) */
export function partInstruction(part: number): string {
  const scenes = SCENE_PARTS[part].join(", ");
  return part === 0
    ? `\n\n## 이번 응답에 쓸 칸\nheadline, summary, nature, strengths, match, one_thing과 장면 ${scenes}만 씁니다. 나머지 장면은 따로 씁니다.`
    : `\n\n## 이번 응답에 쓸 칸\n장면 ${scenes}만 씁니다. 요약과 다른 장면은 따로 씁니다.`;
}

/** 나눠 받은 응답을 하나로 (장면은 합치고 나머지 칸은 0번에서) */
export function mergeParts(parts: unknown[]): unknown {
  const objs = parts.map((p) => (p && typeof p === "object" ? (p as Record<string, unknown>) : {}));
  const situations = Object.assign({}, ...objs.map((o) => (o.situations && typeof o.situations === "object" ? o.situations : {})));
  return { ...objs[0], situations };
}

/** 앞뒤 공백·감싼 따옴표를 떼고, 너무 길면 자른다. 비었으면 null */
function clean(v: unknown, max: number, unquote = false): string | null {
  if (typeof v !== "string") return null;
  let s = v.trim();
  if (unquote) s = s.replace(/^["'“”‘’「『]+|["'“”‘’」』]+$/g, "").trim();
  if (!s) return null;
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

/** 대화 한쪽: 2~6줄, 나와 상대가 모두 말하고 상대의 속마음이 하나 이상. 내 줄의 속마음은 버린다 */
function parseLines(v: unknown): TalkLine[] | null {
  if (!Array.isArray(v)) return null;
  const lines: TalkLine[] = [];
  for (const raw of v.slice(0, 6)) {
    const o = (raw ?? {}) as Record<string, unknown>;
    const who = o.who === "me" || o.who === "partner" ? o.who : null;
    const text = clean(o.text, 160, true);
    if (!who || !text) return null;
    const thought = who === "partner" ? clean(o.thought, 120, true) : null;
    lines.push(thought ? { who, text, thought } : { who, text });
  }
  if (lines.length < 2 || !lines.some((l) => l.who === "me") || !lines.some((l) => l.thought)) return null;
  return lines;
}

function parseTalk(v: unknown): Talk | null {
  if (!v || typeof v !== "object") return null;
  const t = v as Record<string, unknown>;
  const moment = clean(t.moment, 200);
  const bad = parseLines(t.bad);
  const good = parseLines(t.good);
  return moment && bad && good ? { moment, bad, good } : null;
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
    const me = clean(s.me, 500);
    const seen = clean(s.seen, 300);
    const tip = clean(s.tip, 300);
    const talk = parseTalk(s.talk);
    if (!me || !seen || !tip || !talk) return null;
    situations[id] = { me, seen, tip, talk };
  }
  return { headline: headline.replace(/[.。]$/, ""), summary, nature, strengths, situations, match: { good, careful }, one_thing: oneThing };
}
