// 한결 검사 문항 (기획서 '척도 문항 초안' 탭과 같은 내용)
// 문항을 고치면 TEST_VERSION을 올려서, 어떤 버전으로 응답했는지 구분한다.

export const TEST_VERSION = "2026-10-v1";

export type Domain =
  | "marriage"
  | "contact"
  | "money"
  | "leisure"
  | "conflict"
  | "chores"
  | "tidiness"
  | "routine";

export const DOMAINS: { id: Domain; label: string }[] = [
  { id: "marriage", label: "결혼·자녀" },
  { id: "contact", label: "연락" },
  { id: "money", label: "돈" },
  { id: "leisure", label: "여가" },
  { id: "conflict", label: "갈등" },
  { id: "chores", label: "집안일" },
  { id: "tidiness", label: "정리정돈" },
  { id: "routine", label: "수면·식사" },
];

export type Trait = "extraversion" | "agreeableness" | "conscientiousness" | "stability" | "openness";

export const TRAITS: { id: Trait; label: string }[] = [
  { id: "extraversion", label: "외향성" },
  { id: "agreeableness", label: "우호성" },
  { id: "conscientiousness", label: "성실성" },
  { id: "stability", label: "정서 안정성" },
  { id: "openness", label: "개방성" },
];

export type BipolarItem = {
  kind: "bipolar";
  id: string;
  domain: Domain;
  left: string;
  right: string;
  leftShort: string;
  rightShort: string;
};

export type ImportanceItem = {
  kind: "importance";
  id: string;
  domain: Domain | "grooming";
  text: string;
};

export type Option = { value: number | string; label: string };

export type SingleItem = {
  kind: "single";
  id: string;
  question: string;
  options: Option[];
  required: boolean;
};

export type LikertItem = {
  kind: "likert";
  id: string;
  text: string;
  /** 친구 평가용 3인칭 문장. {name} 자리에 닉네임이 들어간다. 없으면 친구 평가에 쓰지 않는다. */
  observerText?: string;
  trait: Trait;
  /** true면 점수를 뒤집는다. 정서 안정성은 신경증 문항을 뒤집어서 만든다. */
  reverse: boolean;
};

export type Item = BipolarItem | ImportanceItem | SingleItem | LikertItem;

// ---------------------------------------------------------------------------
// 관계 가치관: 양극 문항 24 (1 = 왼쪽에 매우 가까움, 6 = 오른쪽에 매우 가까움)
// ---------------------------------------------------------------------------

export const VALUE_ITEMS: BipolarItem[] = [
  { kind: "bipolar", id: "V01", domain: "marriage", left: "연애를 시작할 때부터 결혼 가능성을 생각한다", right: "만나면서 결혼은 자연스럽게 생각한다", leftShort: "처음부터 결혼을 생각", rightShort: "결혼은 자연스럽게" },
  { kind: "bipolar", id: "V02", domain: "marriage", left: "결혼 후 양가와는 필요할 때 왕래한다", right: "결혼 후 양가와 자주 왕래한다", leftShort: "양가 왕래는 필요할 때", rightShort: "양가와 자주 왕래" },
  { kind: "bipolar", id: "V03", domain: "marriage", left: "자녀는 부부가 직접 키우는 게 좋다", right: "가족이나 기관의 도움을 적극 받는 게 좋다", leftShort: "아이는 부부가 직접", rightShort: "주변 도움 적극 활용" },
  { kind: "bipolar", id: "V04", domain: "contact", left: "연애 중 연락은 하루 몇 번이면 충분하다", right: "틈날 때마다 자주 연락하고 싶다", leftShort: "연락은 적당히", rightShort: "연락은 자주" },
  { kind: "bipolar", id: "V05", domain: "contact", left: "답장이 늦어도 크게 신경 쓰지 않는다", right: "가능하면 답장을 빨리 받고 싶다", leftShort: "답장 속도는 상관없음", rightShort: "답장은 빨리" },
  { kind: "bipolar", id: "V06", domain: "contact", left: "메시지로 연락하는 게 편하다", right: "통화로 연락하는 게 편하다", leftShort: "메시지 선호", rightShort: "통화 선호" },
  { kind: "bipolar", id: "V07", domain: "money", left: "데이트 비용은 번갈아 내거나 나누는 게 편하다", right: "여유 있는 사람이 더 내도 괜찮다", leftShort: "데이트 비용은 나눠서", rightShort: "여유 있는 쪽이 더" },
  { kind: "bipolar", id: "V08", domain: "money", left: "모아두는 데 더 의미를 둔다", right: "지금의 경험에 쓰는 데 더 의미를 둔다", leftShort: "모으는 편", rightShort: "경험에 쓰는 편" },
  { kind: "bipolar", id: "V09", domain: "money", left: "큰 지출은 미리 계획해서 한다", right: "큰 지출도 필요할 때 바로 결정한다", leftShort: "큰 지출은 계획적으로", rightShort: "큰 지출도 그때그때" },
  { kind: "bipolar", id: "V10", domain: "leisure", left: "집에서 쉬어야 에너지가 채워진다", right: "밖에서 활동해야 에너지가 채워진다", leftShort: "집에서 충전", rightShort: "밖에서 충전" },
  { kind: "bipolar", id: "V11", domain: "leisure", left: "주말 계획은 미리 세워두는 편이다", right: "주말은 그때그때 정하는 편이다", leftShort: "주말은 계획", rightShort: "주말은 즉흥" },
  { kind: "bipolar", id: "V12", domain: "leisure", left: "취미는 각자 즐기는 게 좋다", right: "취미를 함께 즐기는 게 좋다", leftShort: "취미는 각자", rightShort: "취미는 함께" },
  { kind: "bipolar", id: "V13", domain: "conflict", left: "갈등이 생기면 바로 이야기해서 푼다", right: "시간을 두고 정리한 뒤 이야기한다", leftShort: "갈등은 바로 대화", rightShort: "갈등은 정리 후 대화" },
  { kind: "bipolar", id: "V14", domain: "conflict", left: "다투는 중에 잠시 연락이 끊겨도 괜찮다", right: "다투는 중에도 연락은 이어가야 한다", leftShort: "다툴 땐 잠시 거리", rightShort: "다퉈도 연락 유지" },
  { kind: "bipolar", id: "V15", domain: "conflict", left: "원인을 분명히 짚고 넘어가야 마음이 풀린다", right: "마음이 풀리면 원인은 덮고 넘어가도 된다", leftShort: "원인을 짚고 넘어감", rightShort: "마음이 풀리면 넘어감" },
  { kind: "bipolar", id: "V16", domain: "chores", left: "집안일은 항목별로 정확히 나누는 게 좋다", right: "집안일은 여유 있는 사람이 하는 게 좋다", leftShort: "집안일은 정확히 분담", rightShort: "여유 있는 사람이" },
  { kind: "bipolar", id: "V17", domain: "chores", left: "집안일은 직접 하는 게 편하다", right: "청소·세탁 서비스에 맡겨도 괜찮다", leftShort: "집안일은 직접", rightShort: "서비스 맡겨도 괜찮음" },
  { kind: "bipolar", id: "V18", domain: "chores", left: "집안일을 상대가 다른 방식으로 해도 괜찮다", right: "집안일은 정해진 방식대로 해야 편하다", leftShort: "방식이 달라도 괜찮음", rightShort: "정해진 방식대로" },
  { kind: "bipolar", id: "V19", domain: "tidiness", left: "집이 늘 정돈되어 있어야 편하다", right: "생활감 있는 집이 편하다", leftShort: "늘 정돈된 집", rightShort: "생활감 있는 집" },
  { kind: "bipolar", id: "V20", domain: "tidiness", left: "설거지·빨래는 바로 처리한다", right: "설거지·빨래는 모아서 처리한다", leftShort: "설거지·빨래는 바로", rightShort: "모아서 처리" },
  { kind: "bipolar", id: "V21", domain: "tidiness", left: "물건은 정해진 자리에 둔다", right: "물건은 쓰기 편한 곳에 둔다", leftShort: "물건은 제자리에", rightShort: "쓰기 편한 곳에" },
  { kind: "bipolar", id: "V22", domain: "routine", left: "아침에 일찍 일어나는 편이다", right: "밤늦게까지 깨어 있는 편이다", leftShort: "아침형", rightShort: "저녁형" },
  { kind: "bipolar", id: "V23", domain: "routine", left: "주말에도 평일과 비슷하게 일어난다", right: "주말에는 늦게까지 잔다", leftShort: "주말도 평소처럼 기상", rightShort: "주말엔 늦잠" },
  { kind: "bipolar", id: "V24", domain: "routine", left: "집에서 해 먹는 게 좋다", right: "외식이나 배달이 좋다", leftShort: "집밥 선호", rightShort: "외식·배달 선호" },
];

export const IMPORTANCE_OPTIONS: Option[] = [
  { value: 1, label: "전혀 상관없다" },
  { value: 2, label: "조금 신경 쓰인다" },
  { value: 3, label: "많이 신경 쓰인다" },
  { value: 4, label: "꼭 맞아야 한다" },
];

/** 중요도 응답(1~4)을 채점 가중치로 바꾼다. "꼭 맞아야 한다"가 확실히 크게 반영되게 0, 1, 3, 9를 쓴다. */
export const IMPORTANCE_WEIGHT: Record<number, number> = { 1: 0, 2: 1, 3: 3, 4: 9 };

export const IMPORTANCE_ITEMS: ImportanceItem[] = DOMAINS.map((d, i) => ({
  kind: "importance",
  id: `W${i + 1}`,
  domain: d.id,
  text: `'${d.label}'에서 생각이 다른 상대와 만나는 건 어떤가요?`,
}));

export const DEALBREAKER_ITEMS: SingleItem[] = [
  {
    kind: "single",
    id: "D1",
    question: "결혼 의사",
    required: true,
    options: [
      { value: "yes", label: "결혼하고 싶다" },
      { value: "unsure", label: "아직 모르겠다" },
      { value: "no", label: "결혼 생각이 없다" },
    ],
  },
  {
    kind: "single",
    id: "D2",
    question: "자녀 계획",
    required: true,
    options: [
      { value: "yes", label: "원한다" },
      { value: "unsure", label: "아직 모르겠다" },
      { value: "no", label: "원하지 않는다" },
    ],
  },
  {
    kind: "single",
    id: "D3",
    question: "흡연",
    required: true,
    options: [
      { value: "none", label: "피우지 않는다" },
      { value: "ecig", label: "전자담배만 피운다" },
      { value: "yes", label: "피운다" },
    ],
  },
];

// ---------------------------------------------------------------------------
// 성격: Mini-IPIP 20문항 (IPIP, 퍼블릭 도메인) 한국어 번안. 1~5점
// 정서 안정성은 원래 신경증 문항이라 reverse를 반대로 둔다.
// ---------------------------------------------------------------------------

export const LIKERT_OPTIONS: Option[] = [
  { value: 1, label: "전혀 아니다" },
  { value: 2, label: "아니다" },
  { value: 3, label: "보통이다" },
  { value: 4, label: "그렇다" },
  { value: 5, label: "매우 그렇다" },
];

export const PERSONALITY_ITEMS: LikertItem[] = [
  { kind: "likert", id: "P01", trait: "extraversion", reverse: false, text: "나는 모임에서 분위기를 띄우는 사람이다", observerText: "{name}님은 모임에서 분위기를 띄우는 사람이다" },
  { kind: "likert", id: "P02", trait: "agreeableness", reverse: false, text: "나는 다른 사람의 감정에 공감한다", observerText: "{name}님은 다른 사람의 감정에 공감한다" },
  { kind: "likert", id: "P03", trait: "conscientiousness", reverse: false, text: "나는 해야 할 일을 바로 처리한다", observerText: "{name}님은 해야 할 일을 바로 처리한다" },
  { kind: "likert", id: "P04", trait: "stability", reverse: true, text: "나는 기분 변화가 잦다", observerText: "{name}님은 기분 변화가 잦다" },
  { kind: "likert", id: "P05", trait: "openness", reverse: false, text: "나는 상상력이 풍부하다", observerText: "{name}님은 상상력이 풍부하다" },
  { kind: "likert", id: "P06", trait: "extraversion", reverse: true, text: "나는 말을 많이 하지 않는다" },
  { kind: "likert", id: "P07", trait: "agreeableness", reverse: true, text: "나는 다른 사람의 문제에 관심이 없다", observerText: "{name}님은 다른 사람의 문제에 관심이 없다" },
  { kind: "likert", id: "P08", trait: "conscientiousness", reverse: true, text: "나는 물건을 제자리에 두는 것을 자주 잊는다", observerText: "{name}님은 물건을 제자리에 두는 것을 자주 잊는다" },
  { kind: "likert", id: "P09", trait: "stability", reverse: false, text: "나는 대부분의 시간에 마음이 편안하다", observerText: "{name}님은 대부분의 시간에 마음이 편안해 보인다" },
  { kind: "likert", id: "P10", trait: "openness", reverse: true, text: "나는 추상적인 생각에 관심이 없다" },
  { kind: "likert", id: "P11", trait: "extraversion", reverse: false, text: "나는 모임에서 여러 사람과 이야기를 나눈다" },
  { kind: "likert", id: "P12", trait: "agreeableness", reverse: false, text: "나는 다른 사람의 감정을 함께 느낀다" },
  { kind: "likert", id: "P13", trait: "conscientiousness", reverse: false, text: "나는 정돈된 것을 좋아한다" },
  { kind: "likert", id: "P14", trait: "stability", reverse: true, text: "나는 쉽게 속상해한다" },
  { kind: "likert", id: "P15", trait: "openness", reverse: true, text: "나는 추상적인 개념을 이해하기 어렵다" },
  { kind: "likert", id: "P16", trait: "extraversion", reverse: true, text: "나는 앞에 나서기보다 뒤에 있는 편이다", observerText: "{name}님은 앞에 나서기보다 뒤에 있는 편이다" },
  { kind: "likert", id: "P17", trait: "agreeableness", reverse: true, text: "나는 다른 사람에게 별로 관심이 없다" },
  { kind: "likert", id: "P18", trait: "conscientiousness", reverse: true, text: "나는 일을 엉망으로 만들곤 한다" },
  { kind: "likert", id: "P19", trait: "stability", reverse: false, text: "나는 우울한 기분이 드는 일이 드물다" },
  { kind: "likert", id: "P20", trait: "openness", reverse: true, text: "나는 상상력이 부족한 편이다", observerText: "{name}님은 상상력이 부족한 편이다" },
];

/** 친구 평가에 쓰는 10문항 (특성마다 정방향 1 + 역방향 1) */
export const OBSERVER_ITEMS = PERSONALITY_ITEMS.filter((i) => i.observerText);

// ---------------------------------------------------------------------------
// 기본 위생 6문항 (각 0~3점, 총점 0~18). 점수는 화면에 보여주지 않는다.
// ---------------------------------------------------------------------------

export const HYGIENE_ITEMS: SingleItem[] = [
  { kind: "single", id: "H1", question: "지난 7일 중 하루 한 번 이상 샤워한 날은 며칠인가요?", required: true, options: [{ value: 3, label: "7일" }, { value: 2, label: "5~6일" }, { value: 1, label: "3~4일" }, { value: 0, label: "2일 이하" }] },
  { kind: "single", id: "H2", question: "외출하고 돌아오면 바로 씻거나 옷을 갈아입나요?", required: true, options: [{ value: 3, label: "거의 매번" }, { value: 2, label: "절반 이상" }, { value: 1, label: "가끔" }, { value: 0, label: "거의 안 함" }] },
  { kind: "single", id: "H3", question: "평소 하루에 양치를 몇 번 하나요?", required: true, options: [{ value: 3, label: "3번 이상" }, { value: 2, label: "2번" }, { value: 1, label: "1번" }, { value: 0, label: "안 하는 날도 있음" }] },
  { kind: "single", id: "H4", question: "외출복 상의는 몇 번 입고 세탁하나요?", required: true, options: [{ value: 3, label: "1번" }, { value: 2, label: "2번" }, { value: 1, label: "3~4번" }, { value: 0, label: "5번 이상" }] },
  { kind: "single", id: "H5", question: "침구(이불·베개 커버)는 얼마나 자주 세탁하나요?", required: true, options: [{ value: 3, label: "1주 이내" }, { value: 2, label: "2주" }, { value: 1, label: "한 달" }, { value: 0, label: "그 이상" }] },
  { kind: "single", id: "H6", question: "운동 등으로 땀을 흘린 뒤 씻기까지 얼마나 걸리나요?", required: true, options: [{ value: 3, label: "바로" }, { value: 2, label: "1시간 이내" }, { value: 1, label: "몇 시간 뒤" }, { value: 0, label: "다음 날" }] },
];

// ---------------------------------------------------------------------------
// 꾸밈·스타일 관심도: 본인 수준 G1~G6(1~4), 선택 문항 S1~S4(점수 미포함), 원하는 수준 P1~P2
// ---------------------------------------------------------------------------

const FREQ: Option[] = [
  { value: 1, label: "거의 안 함" },
  { value: 2, label: "가끔" },
  { value: 3, label: "자주" },
  { value: 4, label: "매일" },
];

export const GROOMING_ITEMS: SingleItem[] = [
  { kind: "single", id: "G1", question: "외출 전에 헤어를 손질한다", required: true, options: FREQ },
  { kind: "single", id: "G2", question: "스킨케어 루틴을 지킨다", required: true, options: FREQ },
  { kind: "single", id: "G3", question: "향수나 바디 미스트를 쓴다", required: true, options: FREQ },
  { kind: "single", id: "G4", question: "옷을 고를 때 조합과 핏을 신경 쓴다", required: true, options: FREQ },
  { kind: "single", id: "G5", question: "패션·뷰티 콘텐츠를 찾아본다", required: true, options: FREQ },
  { kind: "single", id: "G6", question: "평소 외출 준비 시간", required: true, options: [{ value: 1, label: "15분 이내" }, { value: 2, label: "15~30분" }, { value: 3, label: "30분~1시간" }, { value: 4, label: "1시간 이상" }] },
];

export const GROOMING_OPTIONAL_ITEMS: SingleItem[] = [
  { kind: "single", id: "S1", question: "면도나 수염 정돈을 얼마나 자주 하나요?", required: false, options: [{ value: "daily", label: "매일" }, { value: "often", label: "자주" }, { value: "sometimes", label: "가끔" }, { value: "na", label: "해당 없음" }] },
  { kind: "single", id: "S2", question: "눈썹을 정리하나요?", required: false, options: [{ value: "regular", label: "정기적으로" }, { value: "sometimes", label: "가끔" }, { value: "no", label: "안 함" }] },
  { kind: "single", id: "S3", question: "메이크업을 얼마나 자주 하나요?", required: false, options: [{ value: "daily", label: "매일" }, { value: "often", label: "자주" }, { value: "sometimes", label: "가끔" }, { value: "no", label: "안 함" }] },
  { kind: "single", id: "S4", question: "나에게 맞는 퍼스널컬러(쿨톤·웜톤)를 알고 있나요?", required: false, options: [{ value: "yes", label: "알고 있다" }, { value: "roughly", label: "대충 안다" }, { value: "no", label: "모른다" }] },
];

export const GROOMING_PREF_ITEMS: (SingleItem | ImportanceItem)[] = [
  {
    kind: "single",
    id: "P1",
    question: "상대의 꾸밈 정도로 가장 편한 것은?",
    required: true,
    options: [
      { value: 1, label: "자연스러운 편" },
      { value: 2, label: "기본만" },
      { value: 3, label: "적당히 꾸미는 편" },
      { value: 4, label: "많이 꾸미는 편" },
      { value: 0, label: "상관없음" },
    ],
  },
  { kind: "importance", id: "P2", domain: "grooming", text: "꾸밈 정도가 나와 다른 상대와 만나는 건 어떤가요?" },
];

// ---------------------------------------------------------------------------
// 검사 단계 (한 화면 = 한 단계). 단계가 끝날 때마다 서버에 저장한다.
// ---------------------------------------------------------------------------

export type Step = {
  id: string;
  title: string;
  guide: string;
  items: Item[];
};

const valueSteps: Step[] = DOMAINS.map((d) => ({
  id: `values-${d.id}`,
  title: d.label,
  guide: "두 문장 중 내 생각에 더 가까운 쪽을 골라주세요. 어느 쪽도 정답은 없어요.",
  items: [
    ...VALUE_ITEMS.filter((v) => v.domain === d.id),
    IMPORTANCE_ITEMS.find((w) => w.domain === d.id)!,
  ],
}));

export const STEPS: Step[] = [
  ...valueSteps,
  {
    id: "dealbreakers",
    title: "꼭 맞아야 하는 조건",
    guide: "나중에 매칭 조건으로 쓸 수 있어요. 지금 생각에 가장 가까운 걸 골라주세요.",
    items: DEALBREAKER_ITEMS,
  },
  {
    id: "personality-1",
    title: "성격 (1/2)",
    guide: "평소의 나를 떠올리며 답해주세요.",
    items: PERSONALITY_ITEMS.slice(0, 10),
  },
  {
    id: "personality-2",
    title: "성격 (2/2)",
    guide: "평소의 나를 떠올리며 답해주세요.",
    items: PERSONALITY_ITEMS.slice(10),
  },
  {
    id: "hygiene",
    title: "생활 습관",
    guide: "있는 그대로 답해주세요. 이 답은 다른 사람에게 보이지 않아요.",
    items: HYGIENE_ITEMS,
  },
  {
    id: "grooming",
    title: "꾸밈과 스타일",
    guide: "평소 모습 기준으로 답해주세요. 아래 선택 문항은 건너뛰어도 돼요.",
    items: [...GROOMING_ITEMS, ...GROOMING_OPTIONAL_ITEMS, ...GROOMING_PREF_ITEMS],
  },
];

export const ALL_ITEMS: Item[] = STEPS.flatMap((s) => s.items);

export type Answers = Record<string, number | string>;

export function isRequired(item: Item): boolean {
  return item.kind === "single" ? item.required : true;
}

/** 한 단계의 필수 문항에 모두 답했는지 */
export function isStepComplete(step: Step, answers: Answers): boolean {
  return step.items.every((item) => !isRequired(item) || answers[item.id] !== undefined);
}

/** 처음으로 덜 끝난 단계의 번호. 모두 끝났으면 STEPS.length */
export function firstIncompleteStep(answers: Answers): number {
  const i = STEPS.findIndex((s) => !isStepComplete(s, answers));
  return i === -1 ? STEPS.length : i;
}

/** 응답 값이 해당 문항에서 허용되는 값인지 확인한다 (서버에서 저장 전에 사용). */
export function isValidAnswer(item: Item, value: unknown): boolean {
  switch (item.kind) {
    case "bipolar":
      return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 6;
    case "importance":
      return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 4;
    case "likert":
      return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 5;
    case "single":
      return item.options.some((o) => o.value === value);
  }
}

const ITEM_BY_ID = new Map(ALL_ITEMS.map((i) => [i.id, i]));

/** 알 수 없는 문항이나 허용되지 않는 값을 걸러낸 응답만 돌려준다. */
export function sanitizeAnswers(input: Record<string, unknown>): Answers {
  const out: Answers = {};
  for (const [id, value] of Object.entries(input)) {
    const item = ITEM_BY_ID.get(id);
    if (item && isValidAnswer(item, value)) out[id] = value as number | string;
  }
  return out;
}
