// 한결 추가 검사 (선택). 한결이 직접 만든 시범 문항이라 상업적으로 써도 되고, 추천 계산에는 쓰지 않는다.
// 문항을 고치면 그 검사의 version을 올린다. 하위척도 점수는 문항 평균(1~5).

export type ExtraOption = { value: number; label: string };

export type ExtraItem = {
  id: string;
  text: string;
  /** 하위척도 id. 보기 하나를 고르는 문항이면 없다 */
  scale?: string;
  /** true면 6 − 응답으로 뒤집어 센다 */
  reverse?: boolean;
  /** 리커트가 아닌 선택 문항의 보기 */
  options?: ExtraOption[];
};

export type ExtraTestId = "affection" | "comfort" | "talk";

export type ExtraTest = {
  id: ExtraTestId;
  version: string;
  title: string;
  short: string;
  minutes: number;
  guide: string;
  /** 리커트 보기 (1~5) */
  likert: ExtraOption[];
  scales: { id: string; label: string; group?: string }[];
  items: ExtraItem[];
};

const AGREE: ExtraOption[] = [
  { value: 1, label: "전혀 아니다" },
  { value: 2, label: "아니다" },
  { value: 3, label: "보통" },
  { value: 4, label: "그렇다" },
  { value: 5, label: "매우 그렇다" },
];

const FELT: ExtraOption[] = [
  { value: 1, label: "거의 안 느껴져요" },
  { value: 2, label: "조금" },
  { value: 3, label: "보통" },
  { value: 4, label: "크게" },
  { value: 5, label: "아주 크게" },
];

const AFFECTION_SCALES = [
  { id: "words", label: "말로 하는 표현" },
  { id: "time", label: "함께하는 시간" },
  { id: "care", label: "챙겨 주는 마음" },
  { id: "touch", label: "스킨십" },
  { id: "help", label: "행동으로 돕기" },
];

export const EXTRA_TESTS: ExtraTest[] = [
  {
    id: "affection",
    version: "2026-10-v1",
    title: "마음이 전해지는 순간",
    short: "어떤 표현에서 마음을 크게 느끼는지",
    minutes: 1,
    guide: "연인이 이렇게 해 줄 때 마음이 얼마나 크게 전해지나요?",
    likert: FELT,
    scales: AFFECTION_SCALES,
    items: [
      { id: "A01", scale: "words", text: "좋아한다, 고맙다는 말을 직접 들을 때" },
      { id: "A02", scale: "time", text: "휴대폰을 내려놓고 나에게만 집중해 줄 때" },
      { id: "A03", scale: "care", text: "지나가다 내 생각이 났다며 작은 걸 챙겨 줄 때" },
      { id: "A04", scale: "touch", text: "손을 잡거나 어깨를 기대는 등 가볍게 닿을 때" },
      { id: "A05", scale: "help", text: "바쁠 때 말하지 않아도 내 일을 덜어 줄 때" },
      { id: "A06", scale: "words", text: "내가 한 일을 알아봐 주고 구체적으로 칭찬해 줄 때" },
      { id: "A07", scale: "time", text: "특별한 일 없이도 함께 시간을 보낼 때" },
      { id: "A08", scale: "care", text: "내가 지나가듯 말한 것을 기억해 줄 때" },
      { id: "A09", scale: "touch", text: "만나고 헤어질 때 반갑게 안아 줄 때" },
      { id: "A10", scale: "help", text: "필요한 일을 먼저 알아서 해 줄 때" },
      {
        id: "A11",
        text: "나는 좋아하는 마음을 주로 어떻게 표현하나요?",
        options: AFFECTION_SCALES.map((s, i) => ({ value: i + 1, label: s.label })),
      },
    ],
  },
  {
    id: "comfort",
    version: "2026-10-v1",
    title: "위로가 필요할 때",
    short: "받고 싶은 위로와 내가 주는 위로",
    minutes: 1,
    guide: "평소의 나를 떠올리며 답해주세요.",
    likert: AGREE,
    scales: [
      { id: "want_empathy", label: "누군가 들어주는 것", group: "want" },
      { id: "want_solution", label: "같이 방법을 찾는 것", group: "want" },
      { id: "want_space", label: "혼자 정리할 시간", group: "want" },
      { id: "give_empathy", label: "공감하며 들어주는 편", group: "give" },
      { id: "give_solution", label: "해결 방법을 찾아 주는 편", group: "give" },
    ],
    items: [
      { id: "C01", scale: "want_empathy", text: "힘든 일을 이야기하면 먼저 내 마음을 알아주길 바란다" },
      { id: "C02", scale: "want_solution", text: "힘들 때는 현실적인 조언이 가장 도움이 된다" },
      { id: "C03", scale: "want_space", text: "속상할 때는 혼자 정리할 시간이 먼저 필요하다" },
      { id: "C04", scale: "give_empathy", text: "상대가 힘들어하면 먼저 끝까지 이야기를 들어 준다" },
      { id: "C05", scale: "give_solution", text: "상대가 고민을 말하면 해결 방법부터 떠오른다" },
      { id: "C06", scale: "want_empathy", text: "해결책보다 끝까지 들어주는 게 더 위로가 된다" },
      { id: "C07", scale: "want_solution", text: "같이 방법을 찾아 주면 마음이 놓인다" },
      { id: "C08", scale: "want_space", text: "기분이 가라앉으면 잠시 혼자 두는 게 좋다" },
      { id: "C09", scale: "give_empathy", text: "상대 기분에 맞춰 같이 속상해하고 같이 기뻐한다" },
      { id: "C10", scale: "give_solution", text: "도움이 될 정보나 방법을 찾아 알려 준다" },
    ],
  },
  {
    id: "talk",
    version: "2026-10-v1",
    title: "대화 코드",
    short: "장난, 리액션, 깊은 대화, 말하기와 듣기",
    minutes: 1,
    guide: "편한 사람과 이야기할 때의 나를 떠올리며 답해주세요.",
    likert: AGREE,
    scales: [
      { id: "playful", label: "장난·드립" },
      { id: "reaction", label: "리액션" },
      { id: "deep", label: "깊은 대화" },
      { id: "talker", label: "이야기를 꺼내는 쪽" },
    ],
    items: [
      { id: "T01", scale: "playful", text: "대화 중에 말장난이나 드립을 자주 친다" },
      { id: "T02", scale: "reaction", text: "상대 이야기에 크게 반응하고 잘 웃는 편이다" },
      { id: "T03", scale: "deep", text: "가벼운 이야기보다 깊은 이야기를 나눌 때 가까워진다" },
      { id: "T04", scale: "talker", text: "대화에서 주로 이야기를 꺼내는 쪽이다" },
      { id: "T05", scale: "playful", text: "가벼운 장난을 주고받는 게 즐겁다" },
      { id: "T06", scale: "reaction", text: "맞장구와 표정으로 잘 듣고 있다는 걸 보여 준다" },
      { id: "T07", scale: "deep", text: "가치관이나 앞으로의 계획에 대해 이야기하는 게 좋다" },
      { id: "T08", scale: "talker", reverse: true, text: "이야기하기보다 듣는 쪽이 더 편하다" },
    ],
  },
];

export const findExtraTest = (id: unknown): ExtraTest | null => EXTRA_TESTS.find((t) => t.id === id) ?? null;

export type ExtraAnswers = Record<string, number>;

export type ExtraScores = {
  /** 하위척도 평균 (1~5) */
  scales: Record<string, number>;
  /** 선택 문항 응답 (애정 표현의 '내가 표현하는 방식') */
  choice?: number;
};

/** 모든 문항에 정해진 보기 안의 값이 있는지 */
export function validateExtra(test: ExtraTest, input: unknown): ExtraAnswers | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const out: ExtraAnswers = {};
  for (const item of test.items) {
    const v = raw[item.id];
    const options = item.options ?? test.likert;
    if (typeof v !== "number" || !options.some((o) => o.value === v)) return null;
    out[item.id] = v;
  }
  return out;
}

export function scoreExtra(test: ExtraTest, answers: ExtraAnswers): ExtraScores {
  const scales: Record<string, number> = {};
  for (const s of test.scales) {
    const vals = test.items.filter((i) => i.scale === s.id).map((i) => (i.reverse ? 6 - answers[i.id] : answers[i.id]));
    scales[s.id] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
  }
  const choiceItem = test.items.find((i) => i.options);
  return choiceItem ? { scales, choice: answers[choiceItem.id] } : { scales };
}

/** 가장 높은 하위척도들 (같으면 여러 개). group을 주면 그 묶음 안에서만 */
export function topScales(test: ExtraTest, scores: ExtraScores, group?: string): { id: string; label: string }[] {
  const pool = test.scales.filter((s) => (group ? s.group === group : !s.group));
  const max = Math.max(...pool.map((s) => scores.scales[s.id] ?? 0));
  return pool.filter((s) => scores.scales[s.id] === max);
}

const join = (labels: string[]) => labels.join(", ");

/** '으로/로' (받침 없음이나 ㄹ받침이면 '로') */
function euro(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const jong = code >= 0 && code <= 11171 ? code % 28 : 0;
  return word + (jong === 0 || jong === 8 ? "로" : "으로");
}

/** 결과 요약: 한 줄 설명과 상대에게도 보여줄 짧은 표시 */
export function summarizeExtra(test: ExtraTest, scores: ExtraScores): { headline: string; chips: string[] } {
  switch (test.id) {
    case "affection": {
      const top = topScales(test, scores).map((s) => s.label);
      const express = scores.choice ? AFFECTION_SCALES[scores.choice - 1]?.label : null;
      return {
        headline: `${join(top)}에서 마음이 가장 크게 전해지는 편이에요.${express ? ` 내 마음은 주로 ${euro(express)} 표현해요.` : ""}`,
        chips: [`마음이 전해지는 순간: ${join(top)}`, ...(express ? [`표현은 주로: ${express}`] : [])],
      };
    }
    case "comfort": {
      const want = topScales(test, scores, "want").map((s) => s.label);
      const give = topScales(test, scores, "give").map((s) => s.label);
      return {
        headline: `힘들 땐 ${join(want)}이 가장 위로가 되고, 위로할 땐 ${join(give)}이에요.`,
        chips: [`받고 싶은 위로: ${join(want)}`, `위로할 땐: ${join(give)}`],
      };
    }
    case "talk": {
      const s = scores.scales;
      const chips: string[] = [];
      if (s.playful >= 4) chips.push("장난·드립을 좋아해요");
      if (s.reaction >= 4) chips.push("리액션이 큰 편");
      if (s.deep >= 4) chips.push("깊은 대화를 좋아해요");
      chips.push(s.talker >= 3.5 ? "이야기를 꺼내는 쪽" : s.talker <= 2.5 ? "듣는 쪽이 편해요" : "말하기와 듣기 반반");
      return { headline: chips.join(" · "), chips };
    }
  }
}

/** 두 사람 모두 결과를 보여주기로 했을 때 보이는 공통점·잘 맞는 점 */
export function extraCommonalities(
  mine: Partial<Record<ExtraTestId, ExtraScores>>,
  theirs: Partial<Record<ExtraTestId, ExtraScores>>,
  name: string,
): string[] {
  const out: string[] = [];
  const aff = findExtraTest("affection")!;
  if (mine.affection && theirs.affection) {
    const a = new Set(topScales(aff, mine.affection).map((s) => s.id));
    const same = topScales(aff, theirs.affection).filter((s) => a.has(s.id));
    if (same.length) out.push(`두 분 다 ${join(same.map((s) => s.label))}에서 마음을 크게 느껴요.`);
    const express = theirs.affection.choice ? AFFECTION_SCALES[theirs.affection.choice - 1] : null;
    if (express && a.has(express.id) && !same.some((s) => s.id === express.id)) {
      out.push(`${name}님은 주로 ${euro(express.label)} 마음을 표현해요. 내가 마음을 크게 느끼는 방식이에요.`);
    }
  }
  const com = findExtraTest("comfort")!;
  if (mine.comfort && theirs.comfort) {
    const want = topScales(com, mine.comfort, "want").map((s) => s.id);
    const give = topScales(com, theirs.comfort, "give").map((s) => s.id);
    if ((want.includes("want_empathy") && give.includes("give_empathy")) || (want.includes("want_solution") && give.includes("give_solution"))) {
      out.push(`${name}님이 위로하는 방식이 내가 받고 싶은 위로와 잘 맞아요.`);
    }
  }
  if (mine.talk && theirs.talk) {
    if (mine.talk.scales.deep >= 4 && theirs.talk.scales.deep >= 4) out.push("두 분 다 깊은 대화를 좋아해요.");
    if (mine.talk.scales.playful >= 4 && theirs.talk.scales.playful >= 4) out.push("두 분 다 장난스러운 대화를 즐겨요.");
  }
  return out;
}
