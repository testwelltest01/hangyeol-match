// 연애 상황 보고서 검사 (선택). IPIP(퍼블릭 도메인, ipip.ori.org) 척도에서 연애 장면으로 풀기 좋은 12개를 골라
// 척도마다 4문항씩(정·역문항 섞음) 우리말로 옮겼다. 원문은 문항 옆 주석. 순수 모듈(테스트용).
// 문항·보기·척도를 바꾸면 LOVE_VERSION을 올린다 (예전 응답과 섞이지 않게).
// 추천 계산에는 쓰지 않는다. 결과는 보고서(AI)와 관리자 통계에만 쓴다.

export const LOVE_VERSION = "2026-10-v1";

export type LoveGroupId = "close" | "shaken" | "clash" | "together";

export const LOVE_GROUPS: { id: LoveGroupId; label: string }[] = [
  { id: "close", label: "가까워질 때" },
  { id: "shaken", label: "마음이 흔들릴 때" },
  { id: "clash", label: "부딪힐 때" },
  { id: "together", label: "함께할 때" },
];

export type LoveScaleId =
  | "warmth"
  | "disclosure"
  | "love"
  | "trust"
  | "worry"
  | "anger"
  | "soft"
  | "forgive"
  | "lead"
  | "novelty"
  | "humor"
  | "gratitude";

export type LoveScale = {
  id: LoveScaleId;
  group: LoveGroupId;
  /** 화면에 보이는 이름 */
  label: string;
  /** 점수가 낮은 쪽·높은 쪽을 부르는 말 (좋고 나쁨이 아니라 방향) */
  low: string;
  high: string;
  /** AI에게 주는 설명: 무엇을 재는지 */
  about: string;
  /** 출처 (관리자·문서용) */
  source: string;
};

export const LOVE_SCALES: LoveScale[] = [
  { id: "warmth", group: "close", label: "마음 여는 속도", low: "천천히 열어요", high: "금방 열어요", about: "처음 만난 사람에게 마음을 열고 친해지는 속도", source: "IPIP-NEO E1 Friendliness" },
  { id: "disclosure", group: "close", label: "속마음 꺼내기", low: "속으로 담아 둬요", high: "털어놓아요", about: "자기 감정과 걱정을 상대에게 드러내는 정도", source: "IPIP TCI RD3 Self-disclosure" },
  { id: "love", group: "close", label: "사랑 주고받기", low: "아직 어색해요", high: "편하게 주고받아요", about: "사랑을 표현하고 상대의 사랑을 받아들이는 것을 편하게 여기는 정도", source: "IPIP VIA Capacity for Love" },
  { id: "trust", group: "shaken", label: "믿음", low: "확인하며 믿어요", high: "먼저 믿어요", about: "상대의 말과 의도를 먼저 믿는 정도", source: "IPIP-NEO A1 Trust" },
  { id: "worry", group: "shaken", label: "걱정", low: "느긋해요", high: "걱정이 많아요", about: "일이 잘못될까 걱정하고 스트레스를 받는 정도", source: "IPIP-NEO N1 Anxiety" },
  { id: "anger", group: "shaken", label: "화", low: "잘 안 나요", high: "빨리 올라와요", about: "짜증이나 화가 빨리 올라오는 정도", source: "IPIP-NEO N2 Anger" },
  { id: "soft", group: "clash", label: "부딪힐 때 말투", low: "분명하게 맞서요", high: "부드럽게 넘겨요", about: "의견이 부딪힐 때 맞서기보다 부드럽게 넘기려는 정도 (낮으면 반박하고 날카롭게 말하는 편)", source: "IPIP-NEO A4 Cooperation" },
  { id: "forgive", group: "clash", label: "털어내기", low: "오래 남아요", high: "금방 털어내요", about: "서운한 일을 털어내고 다시 기회를 주는 정도", source: "IPIP VIA Forgiveness/Mercy" },
  { id: "lead", group: "clash", label: "주도", low: "맞춰 가요", high: "이끌어요", about: "계획과 결정을 앞장서서 이끌고 의견을 내는 정도", source: "IPIP-NEO E3 Assertiveness" },
  { id: "novelty", group: "together", label: "새로움", low: "익숙한 게 좋아요", high: "새로운 게 좋아요", about: "익숙한 것보다 새로운 곳·새로운 일을 좋아하는 정도", source: "IPIP-NEO O4 Adventurousness" },
  { id: "humor", group: "together", label: "유머", low: "차분한 편이에요", high: "웃음을 만들어요", about: "장난과 유머로 분위기를 밝게 만드는 정도", source: "IPIP VIA Humor/Playfulness" },
  { id: "gratitude", group: "together", label: "고마움", low: "덤덤한 편이에요", high: "자주 느끼고 말해요", about: "고마움을 느끼고 표현하는 정도", source: "IPIP VIA Gratitude" },
];

export type LoveItem = { id: string; scale: LoveScaleId; text: string; reverse: boolean };

// 척도마다 4문항. 원문(IPIP)과 채점 방향(+/−)을 주석으로 남긴다
const BY_SCALE: Record<LoveScaleId, LoveItem[]> = {
  warmth: [
    { id: "LW1", scale: "warmth", reverse: false, text: "사람들에게 금방 마음을 연다" }, // + Warm up quickly to others.
    { id: "LW2", scale: "warmth", reverse: true, text: "사람들이 나를 알기까지 시간이 걸리는 편이다" }, // − Am hard to get to know.
    { id: "LW3", scale: "warmth", reverse: false, text: "새로운 사람과 쉽게 친해진다" }, // + Make friends easily.
    { id: "LW4", scale: "warmth", reverse: true, text: "다른 사람과 어느 정도 거리를 둔다" }, // − Keep others at a distance.
  ],
  disclosure: [
    { id: "LD1", scale: "disclosure", reverse: false, text: "내 감정을 솔직하게 드러낸다" }, // + Am open about my feelings.
    { id: "LD2", scale: "disclosure", reverse: true, text: "감정을 속에 꾹 담아 둔다" }, // − Bottle up my feelings.
    { id: "LD3", scale: "disclosure", reverse: false, text: "걱정이 있으면 다른 사람에게 털어놓는다" }, // + Talk about my worries.
    { id: "LD4", scale: "disclosure", reverse: true, text: "나에 대해 잘 드러내지 않는다" }, // − Reveal little about myself.
  ],
  love: [
    { id: "LL1", scale: "love", reverse: false, text: "아끼는 사람에게 사랑한다고 표현할 수 있다" }, // + Can express love to someone else.
    { id: "LL2", scale: "love", reverse: true, text: "누군가 주는 사랑을 받아들이기가 어렵다" }, // − Have difficulty accepting love from anyone.
    { id: "LL3", scale: "love", reverse: false, text: "가까운 관계를 맺기 위해서라면 상처받을 위험도 감수한다" }, // + Am willing to take risks to establish a relationship.
    { id: "LL4", scale: "love", reverse: false, text: "내 부족한 점까지 받아 주는 사람이 있다" }, // + Know that some others accept my shortcomings.
  ],
  trust: [
    { id: "LT1", scale: "trust", reverse: false, text: "사람을 잘 믿는 편이다" }, // + Trust others.
    { id: "LT2", scale: "trust", reverse: true, text: "다른 사람의 말 뒤에 숨은 속뜻이 있을까 의심한다" }, // − Suspect hidden motives in others.
    { id: "LT3", scale: "trust", reverse: false, text: "사람들은 대체로 좋은 뜻으로 행동한다고 생각한다" }, // + Believe that others have good intentions.
    { id: "LT4", scale: "trust", reverse: true, text: "사람을 쉽게 믿지 않고 조심한다" }, // − Am wary of others.
  ],
  worry: [
    { id: "LA1", scale: "worry", reverse: false, text: "이런저런 걱정을 많이 한다" }, // + Worry about things.
    { id: "LA2", scale: "worry", reverse: true, text: "웬만한 일에는 신경이 쓰이지 않는다" }, // − Am not easily bothered by things.
    { id: "LA3", scale: "worry", reverse: false, text: "일이 잘못될까 봐 최악의 경우를 떠올린다" }, // + Fear for the worst.
    { id: "LA4", scale: "worry", reverse: false, text: "쉽게 스트레스를 받는다" }, // + Get stressed out easily.
  ],
  anger: [
    { id: "LN1", scale: "anger", reverse: false, text: "쉽게 화가 난다" }, // + Get angry easily.
    { id: "LN2", scale: "anger", reverse: true, text: "화가 나도 침착함을 지킨다" }, // − Keep my cool.
    { id: "LN3", scale: "anger", reverse: false, text: "쉽게 짜증이 난다" }, // + Get irritated easily.
    { id: "LN4", scale: "anger", reverse: false, text: "화를 참지 못할 때가 있다" }, // + Lose my temper.
  ],
  soft: [
    { id: "LC1", scale: "soft", reverse: true, text: "말을 날카롭게 하는 편이다" }, // − Have a sharp tongue.
    { id: "LC2", scale: "soft", reverse: false, text: "누군가와 부딪히는 상황을 견디기 힘들다" }, // + Can't stand confrontations.
    { id: "LC3", scale: "soft", reverse: true, text: "다른 사람 말에 반박을 잘 한다" }, // − Contradict others.
    { id: "LC4", scale: "soft", reverse: false, text: "웬만하면 만족하는 편이다" }, // + Am easy to satisfy.
  ],
  forgive: [
    { id: "LF1", scale: "forgive", reverse: false, text: "지난 일은 지난 일로 넘긴다" }, // + Let bygones be bygones.
    { id: "LF2", scale: "forgive", reverse: true, text: "서운한 일을 오래 마음에 담아 둔다" }, // − Hold grudges.
    { id: "LF3", scale: "forgive", reverse: false, text: "잘못한 사람에게도 다시 시작할 기회를 준다" }, // + Allow others to make a fresh start.
    { id: "LF4", scale: "forgive", reverse: true, text: "나에게 상처 준 사람에게 두 번째 기회는 주지 않는다" }, // − Do not give anyone a second chance to hurt me.
  ],
  lead: [
    { id: "LE1", scale: "lead", reverse: false, text: "앞장서서 일을 맡아 이끈다" }, // + Take charge.
    { id: "LE2", scale: "lead", reverse: true, text: "다른 사람이 먼저 이끌어 주기를 기다린다" }, // − Wait for others to lead the way.
    { id: "LE3", scale: "lead", reverse: false, text: "일이 돌아가는 방향을 내가 정하는 편이다" }, // + Take control of things.
    { id: "LE4", scale: "lead", reverse: true, text: "내 의견을 말하지 않고 넘어갈 때가 많다" }, // − Hold back my opinions.
  ],
  novelty: [
    { id: "LO1", scale: "novelty", reverse: false, text: "늘 같은 것보다 이것저것 해 보는 게 좋다" }, // + Prefer variety to routine.
    { id: "LO2", scale: "novelty", reverse: true, text: "잘 아는 것을 계속하는 게 편하다" }, // − Prefer to stick with things that I know.
    { id: "LO3", scale: "novelty", reverse: false, text: "가 보지 않은 곳에 가 보는 걸 좋아한다" }, // + Like to visit new places.
    { id: "LO4", scale: "novelty", reverse: true, text: "늘 하던 대로 하는 편이다" }, // − Am a creature of habit.
  ],
  humor: [
    { id: "LH1", scale: "humor", reverse: false, text: "무엇을 하든 유머를 섞으려 한다" }, // + Try to add some humor to whatever I do.
    { id: "LH2", scale: "humor", reverse: true, text: "유머 있다는 말은 잘 듣지 못한다" }, // − Am not known for my sense of humor.
    { id: "LH3", scale: "humor", reverse: false, text: "웃음으로 다른 사람의 하루를 밝게 만든다" }, // + Use laughter to brighten the days of others.
    { id: "LH4", scale: "humor", reverse: false, text: "기분이 가라앉은 친구를 장난으로 웃게 하려 한다" }, // + Try to tease my friends out of their gloomy moods.
  ],
  gratitude: [
    { id: "LG1", scale: "gratitude", reverse: false, text: "나를 아껴 주는 사람에게 고맙다고 표현한다" }, // + Express my thanks to those who care about me.
    { id: "LG2", scale: "gratitude", reverse: true, text: "잘해 주는 사람에게 굳이 고맙다고 할 필요는 없다고 생각한다" }, // − Do not see the need to acknowledge others who are good to me.
    { id: "LG3", scale: "gratitude", reverse: false, text: "살면서 받은 것들에 고마움을 느낀다" }, // + Feel thankful for what I have received in life.
    { id: "LG4", scale: "gratitude", reverse: false, text: "가끔 멈춰서 내가 가진 좋은 것들을 떠올린다" }, // + Stop to count my blessings.
  ],
};

export const LOVE_ITEMS: LoveItem[] = LOVE_SCALES.flatMap((s) => BY_SCALE[s.id]);

/** 화면에 묻는 순서: 같은 척도·같은 묶음이 붙지 않게 네 묶음을 번갈아 놓는다 */
const PAGE_SCALE_ORDER: LoveScaleId[] = ["warmth", "worry", "soft", "novelty", "disclosure", "trust", "forgive", "humor", "love", "anger", "lead", "gratitude"];

/**
 * 4쪽 × 12문항. p쪽에는 척도마다 한 문항씩, 척도 순서에 따라 (p + 척도 번호) % 4번째 문항을 놓는다.
 * 그래서 한 쪽에 정문항과 역문항이 섞인다
 */
export const LOVE_PAGES: LoveItem[][] = [0, 1, 2, 3].map((p) => PAGE_SCALE_ORDER.map((id, s) => BY_SCALE[id][(p + s) % 4]));

export const LOVE_MINUTES = 7;
