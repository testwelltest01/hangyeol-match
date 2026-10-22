// 연애 상황 보고서 검사 (선택). 순수 모듈(테스트용). 추천 계산에는 쓰지 않는다. 결과는 보고서(AI)와 관리자 통계에만 쓴다.
// 1) 관계 척도 12개: IPIP(퍼블릭 도메인, ipip.ori.org) 척도에서 연애 장면으로 풀기 좋은 것을 골라 4문항씩 우리말로 옮겼다. 원문은 문항 옆 주석.
// 2) 기질 4개·성격 3개: Cloninger의 기질·성격 모델이 말하는 개념(자극추구·위험회피·사회적 민감성·인내력 / 자율성·연대감·자기초월)을
//    재려고 한결이 처음부터 쓴 문항 4개씩. 상업 검사(TCI)의 문항을 옮기거나 고쳐 쓰지 않았고, 화면에는 TCI 이름이나
//    차원 이름(자극추구 등)을 쓰지 않고 한결식 이름을 쓴다. 검증되지 않은 시범 문항이라 관리자 화면에서 α·재검사 r을 본다.
// 문항·보기·척도를 바꾸면 LOVE_VERSION을 올린다 (예전 응답과 섞이지 않게).

export const LOVE_VERSION = "2026-10-v2";

export type LoveGroupId = "close" | "shaken" | "clash" | "together" | "temperament" | "character";

/** part: relation = 관계 척도(IPIP), nature = 기질·성격(한결 문항) */
export const LOVE_GROUPS: { id: LoveGroupId; label: string; part: "relation" | "nature" }[] = [
  { id: "close", label: "가까워질 때", part: "relation" },
  { id: "shaken", label: "마음이 흔들릴 때", part: "relation" },
  { id: "clash", label: "부딪힐 때", part: "relation" },
  { id: "together", label: "함께할 때", part: "relation" },
  { id: "temperament", label: "타고난 기질", part: "nature" },
  { id: "character", label: "다듬어 가는 성격", part: "nature" },
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
  | "gratitude"
  | "seeking"
  | "caution"
  | "attach"
  | "persist"
  | "selfdir"
  | "coop"
  | "meaning";

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
  // 기질: 처음 반응이 어느 쪽으로 쉽게 기우는지 (타고난 경향)
  { id: "seeking", group: "temperament", label: "설렘 찾기", low: "차분하게 가요", high: "끌리는 대로 가요", about: "새롭고 재미있는 것에 끌려 즉흥적으로 움직이는 정도 (낮으면 신중하고 절제하는 편)", source: "한결 문항 · 기질: 자극추구 개념" },
  { id: "caution", group: "temperament", label: "조심성", low: "일단 해 봐요", high: "미리 조심해요", about: "확실하지 않거나 위험해 보이는 일 앞에서 망설이고 조심하는 정도, 쉽게 지치는 정도", source: "한결 문항 · 기질: 위험회피 개념" },
  { id: "attach", group: "temperament", label: "정에 기대기", low: "혼자서도 괜찮아요", high: "정을 나눠야 힘이 나요", about: "따뜻한 말과 인정에 마음이 움직이고 사람에게 기대는 정도", source: "한결 문항 · 기질: 사회적 민감성 개념" },
  { id: "persist", group: "temperament", label: "끈기", low: "아니다 싶으면 바꿔요", high: "끝까지 해내요", about: "보상이 없어도 꾸준히 버티고 목표를 높게 잡는 정도", source: "한결 문항 · 기질: 인내력 개념" },
  // 성격: 그 반응을 살면서 어떻게 다루게 됐는지 (다듬어 온 태도)
  { id: "selfdir", group: "character", label: "스스로 서기", low: "아직 찾는 중이에요", high: "스스로 방향을 정해요", about: "자기 선택에 책임지고, 원하는 방향을 알고, 자신을 받아들이는 정도", source: "한결 문항 · 성격: 자율성 개념" },
  { id: "coop", group: "character", label: "함께하는 마음", low: "내 기준이 먼저예요", high: "함께가 먼저예요", about: "나와 다른 사람을 받아들이고 공정하게 대하며 돕는 정도", source: "한결 문항 · 성격: 연대감 개념" },
  { id: "meaning", group: "character", label: "더 큰 의미", low: "현실에 발 딛고 있어요", high: "의미와 연결을 찾아요", about: "무언가에 깊이 몰입하고, 자연·사람과 이어진 느낌이나 일상의 의미를 느끼는 정도", source: "한결 문항 · 성격: 자기초월 개념" },
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
  // ---- 기질·성격: 한결이 쓴 문항 (원문 없음) ----
  seeking: [
    { id: "MN1", scale: "seeking", reverse: false, text: "재미있어 보이는 일이 생기면 깊이 따지지 않고 일단 뛰어든다" },
    { id: "MN2", scale: "seeking", reverse: false, text: "같은 일이 반복되면 금방 지루해진다" },
    { id: "MN3", scale: "seeking", reverse: true, text: "충동적으로 돈을 쓰는 일이 거의 없다" },
    { id: "MN4", scale: "seeking", reverse: false, text: "정해진 규칙보다 그때그때 마음 가는 대로 움직인다" },
  ],
  caution: [
    { id: "MH1", scale: "caution", reverse: false, text: "확실하지 않으면 시작을 미루는 편이다" },
    { id: "MH2", scale: "caution", reverse: true, text: "위험이 조금 있어도 해 볼 만하면 과감하게 도전한다" },
    { id: "MH3", scale: "caution", reverse: false, text: "결과를 알 수 없는 선택 앞에서 오래 망설인다" },
    { id: "MH4", scale: "caution", reverse: false, text: "남들보다 쉽게 지치고 회복하는 데 시간이 걸린다" },
  ],
  attach: [
    { id: "MR1", scale: "attach", reverse: false, text: "가까운 사람의 따뜻한 말 한마디에 큰 힘을 얻는다" },
    { id: "MR2", scale: "attach", reverse: true, text: "다른 사람이 나를 어떻게 생각하든 크게 신경 쓰지 않는다" },
    { id: "MR3", scale: "attach", reverse: false, text: "영화나 이야기 속 장면에 쉽게 마음이 움직인다" },
    { id: "MR4", scale: "attach", reverse: true, text: "힘든 일이 있어도 누구에게 기대기보다 혼자 해결하는 게 편하다" },
  ],
  persist: [
    { id: "MP1", scale: "persist", reverse: false, text: "한번 시작한 일은 힘들어도 끝까지 해낸다" },
    { id: "MP2", scale: "persist", reverse: true, text: "잘 안 풀리면 쉽게 포기하는 편이다" },
    { id: "MP3", scale: "persist", reverse: false, text: "칭찬이나 보상이 없어도 꾸준히 노력할 수 있다" },
    { id: "MP4", scale: "persist", reverse: false, text: "목표를 세우면 남들보다 높게 잡는다" },
  ],
  selfdir: [
    { id: "MS1", scale: "selfdir", reverse: false, text: "내 선택의 결과는 남 탓을 하지 않고 내가 책임진다" },
    { id: "MS2", scale: "selfdir", reverse: true, text: "내 모습 중 받아들이기 어려운 부분이 많다" },
    { id: "MS3", scale: "selfdir", reverse: false, text: "내가 무엇을 원하고 어디로 가고 싶은지 비교적 분명히 안다" },
    { id: "MS4", scale: "selfdir", reverse: true, text: "고치고 싶은 습관이 있어도 잘 바뀌지 않는다" },
  ],
  coop: [
    { id: "MC1", scale: "coop", reverse: false, text: "나와 생각이 아주 다른 사람에게도 그럴 만한 이유가 있다고 본다" },
    { id: "MC2", scale: "coop", reverse: true, text: "내 이익이 걸리면 상대 사정은 뒤로 미루게 된다" },
    { id: "MC3", scale: "coop", reverse: false, text: "손해를 조금 보더라도 함께하는 사람을 공정하게 대하려 한다" },
    { id: "MC4", scale: "coop", reverse: false, text: "도움이 필요한 사람을 보면 내 일처럼 신경이 쓰인다" },
  ],
  meaning: [
    { id: "MT1", scale: "meaning", reverse: false, text: "무언가에 푹 빠지면 시간 가는 줄 모르고 나를 잊을 만큼 몰입한다" },
    { id: "MT2", scale: "meaning", reverse: true, text: "눈앞의 현실 말고 다른 의미를 찾는 데는 별로 관심이 없다" },
    { id: "MT3", scale: "meaning", reverse: false, text: "자연이나 음악 앞에서 나보다 큰 무언가와 이어진 느낌을 받을 때가 있다" },
    { id: "MT4", scale: "meaning", reverse: false, text: "일상의 작은 일에서도 깊은 의미를 느낄 때가 있다" },
  ],
};

export const LOVE_ITEMS: LoveItem[] = LOVE_SCALES.flatMap((s) => BY_SCALE[s.id]);

/** 화면에 묻는 순서: 같은 척도·같은 묶음이 붙지 않게 여섯 묶음을 번갈아 놓는다 */
const PAGE_SCALE_ORDER: LoveScaleId[] = [
  "warmth", "seeking", "worry", "soft", "novelty", "selfdir", "disclosure", "caution", "trust", "coop",
  "forgive", "humor", "attach", "love", "meaning", "anger", "lead", "persist", "gratitude",
];

/**
 * 4바퀴 × 19문항을 바퀴마다 둘로 나눠 8쪽(10·9문항). 바퀴 r에는 척도마다 한 문항씩, (r + 척도 번호) % 4번째 문항을 놓는다.
 * 그래서 같은 척도 문항은 한 쪽에 하나뿐이고, 한 쪽에 정문항과 역문항이 섞인다
 */
export const LOVE_PAGES: LoveItem[][] = [0, 1, 2, 3].flatMap((r) => {
  const round = PAGE_SCALE_ORDER.map((id, s) => BY_SCALE[id][(r + s) % 4]);
  const half = Math.ceil(round.length / 2);
  return [round.slice(0, half), round.slice(half)];
});

export const LOVE_MINUTES = 10;
