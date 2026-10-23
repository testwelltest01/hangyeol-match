// 연락처를 주고받은 뒤 보여주는 '첫 만남 팁'. 순수 모듈(테스트용).
// 팁마다 근거 연구를 붙인다: 여러 번 확인됐거나 실제 만남 자료로 확인된 것만 골랐다(2026-10 조사).
// 재현이 안 되거나 효과가 들쭉날쭉한 흔한 속설은 MYTHS로 따로 둔다(넣지 않은 이유를 보여주려고).
// 링크는 DOI(https://doi.org/...)를 쓴다. DOI를 확인하지 못한 것만 저자 공개본 주소.

export type TipSource = {
  /** 저자 (연도) */
  cite: string;
  /** 논문 제목 (원문) */
  title: string;
  /** 학술지 */
  journal: string;
  url: string;
};

export type DateTip = {
  id: string;
  /** 만나는 동안 / 헤어진 뒤 */
  phase: "during" | "after";
  title: string;
  /** 어떻게 하면 되는지 1~2문장 */
  body: string;
  /** 실제로 건넬 수 있는 말 */
  example?: string;
  /** 두 사람의 검사 결과로 붙이는 한 줄 (common: 가장 비슷한 영역, differ: 둘 다 신경 쓰는데 다른 영역) */
  hint?: "common" | "differ";
  /** 근거의 종류와 규모를 짧게 (근거 칩) */
  basis: string;
  /** 연구에서 무엇을 확인했는지 */
  evidence: string;
  sources: TipSource[];
};

export const DATE_TIPS: DateTip[] = [
  {
    id: "follow-up",
    phase: "during",
    title: "대답을 들으면 한 번 더 물어보기",
    body: "상대의 대답에서 한 단어를 골라 이어서 물어보세요. 내 이야기를 귀담아듣는다는 느낌이 호감으로 이어져요.",
    example: "제주도 다녀오셨어요? 거기서 제일 좋았던 곳은 어디였어요?",
    basis: "실험 2개 + 스피드데이팅 110명",
    evidence:
      "온라인 대화 실험과 실제 스피드데이팅 자료(110명, 대화 2천여 번)에서 질문을 많이 한 사람, 특히 상대의 말에 이어서 물은 사람이 더 호감을 얻었어요. 스피드데이팅에서는 질문을 많이 한 사람이 두 번째 만남 제안도 더 많이 받았어요. 연구진은 '내 말을 듣고 반응해 준다'는 느낌 때문이라고 봤어요.",
    sources: [
      {
        cite: "Huang, Yeomans, Brooks, Minson, Gino (2017)",
        title: "It doesn't hurt to ask: Question-asking increases liking",
        journal: "Journal of Personality and Social Psychology",
        url: "https://doi.org/10.1037/pspi0000097",
      },
    ],
  },
  {
    id: "take-turns",
    phase: "during",
    title: "묻기만 하지 말고 내 이야기도 하나씩",
    body: "질문만 이어지면 면접처럼 느껴질 수 있어요. 상대가 이야기하면 비슷한 내 경험을 하나 꺼내고, 다시 물어보는 식으로 주고받으세요.",
    example: "저도 회사 옮길 때 그 고민 했어요. 결국 뭐가 결정적이었어요?",
    basis: "실험 (처음 만난 두 사람)",
    evidence:
      "처음 만난 두 사람이 번갈아 가며 자기 이야기를 한 쌍은, 한 사람이 12분 내내 이야기하고 나중에 역할을 바꾼 쌍보다 서로를 더 좋아했어요. 가벼운 질문에서 점점 개인적인 이야기로 넘어가며 서로 털어놓는 대화가 처음 만난 사이도 가깝게 만든다는 연구('36가지 질문'으로 알려진 연구)와 같은 방향이에요.",
    sources: [
      {
        cite: "Sprecher, Treger, Wondra, Hilaire, Wallpe (2013)",
        title: "Taking turns: Reciprocal self-disclosure promotes liking in initial interactions",
        journal: "Journal of Experimental Social Psychology",
        url: "https://doi.org/10.1016/j.jesp.2013.03.017",
      },
      {
        cite: "Aron, Melinat, Aron, Vallone, Bator (1997)",
        title: "The experimental generation of interpersonal closeness",
        journal: "Personality and Social Psychology Bulletin",
        url: "https://doi.org/10.1177/0146167297234003",
      },
    ],
  },
  {
    id: "go-deeper",
    phase: "during",
    title: "가벼운 이야기에서 한 걸음 더",
    body: "날씨나 회사 이야기로 시작해도 괜찮아요. 분위기가 풀리면 요즘 마음 쓰이는 일, 소중한 사람, 해 보고 싶은 것처럼 조금 깊은 이야기로 넘어가 보세요. 생각보다 어색하지 않아요.",
    example: "요즘 제일 설레는 일은 뭐예요?",
    hint: "differ",
    basis: "실험 12개, 1,800명 넘게",
    evidence:
      "처음 만난 사람끼리 깊은 질문으로 대화하게 했더니, 사람들은 대화 전에는 어색하고 재미없을 거라고 예상했지만 실제로는 가벼운 대화보다 더 즐겁고 더 가까워졌다고 답했어요. 상대가 내 깊은 생각에 얼마나 관심을 보일지도 실제보다 낮게 짐작했어요.",
    sources: [
      {
        cite: "Kardas, Kumar, Epley (2022)",
        title: "Overly shallow?: Miscalibrated expectations create a barrier to deeper conversation",
        journal: "Journal of Personality and Social Psychology",
        url: "https://doi.org/10.1037/pspa0000281",
      },
    ],
  },
  {
    id: "similar",
    phase: "during",
    title: "공통점을 찾으면 말로 꺼내기",
    body: "'저도요' 한마디면 충분해요. 실제로 얼마나 비슷한지보다 '우리 비슷하다'고 느끼는 게 호감과 더 꾸준히 이어져요.",
    example: "어, 저도 주말엔 집에서 쉬는 게 제일 좋아요!",
    hint: "common",
    basis: "메타분석 (연구 313개)",
    evidence:
      "연구 313개를 모아 다시 분석했더니, 실제로 비슷한 것과 비슷하다고 느끼는 것 모두 호감과 관계가 있었어요. 다만 이미 알고 지내는 사이에서는 실제로 비슷한지는 호감과 거의 관계가 없었고, 비슷하다고 느끼는지는 계속 관계가 있었어요.",
    sources: [
      {
        cite: "Montoya, Horton, Kirchner (2008)",
        title: "Is actual similarity necessary for attraction? A meta-analysis of actual and perceived similarity",
        journal: "Journal of Social and Personal Relationships",
        url: "https://doi.org/10.1177/0265407508096700",
      },
    ],
  },
  {
    id: "phone",
    phase: "during",
    title: "휴대폰은 가방이나 주머니에",
    body: "휴대폰을 꺼내 두면 나도 모르게 보게 되고, 대화가 덜 즐거워져요. 꼭 받아야 할 연락이 있다면 처음에 미리 말해 두세요.",
    basis: "현장 실험 300명",
    evidence:
      "친구·가족과 식당에서 밥을 먹을 때 휴대폰을 식탁에 꺼내 두게 한 사람들은 치워 두게 한 사람들보다 식사가 덜 즐거웠고 더 산만했다고 답했어요. 데이트를 직접 본 연구는 아니지만, 마주 앉아 이야기하는 자리라는 점은 같아요.",
    sources: [
      {
        cite: "Dwyer, Kushlev, Dunn (2018)",
        title: "Smartphone use undermines enjoyment of face-to-face social interactions",
        journal: "Journal of Experimental Social Psychology",
        url: "https://doi.org/10.1016/j.jesp.2017.10.007",
      },
    ],
  },
  {
    id: "liking-gap",
    phase: "after",
    title: "상대는 생각보다 나를 더 좋게 봤을 거예요",
    body: "헤어지고 나면 말실수한 장면부터 떠오르기 쉬워요. 하지만 상대는 대개 내 짐작보다 나를 더 좋게 봤어요. 혼자 결론 내리고 연락을 미루지 마세요.",
    basis: "실험실·기숙사·워크숍 연구",
    evidence:
      "처음 만나 대화한 사람들은 상대가 자기를 얼마나 좋아했는지, 대화를 얼마나 즐겼는지를 실제보다 낮게 짐작했어요. 실험실에서 처음 만난 사람, 대학 기숙사 룸메이트, 워크숍 참가자 모두에서 나타났고, 룸메이트 사이에서는 몇 달 동안 이어졌어요.",
    sources: [
      {
        cite: "Boothby, Cooney, Sandstrom, Clark (2018)",
        title: "The liking gap in conversations: Do people like us more than we think?",
        journal: "Psychological Science",
        url: "https://doi.org/10.1177/0956797618783714",
      },
    ],
  },
  {
    id: "reach-out",
    phase: "after",
    title: "먼저 '오늘 즐거웠어요' 연락하기",
    body: "헤어진 날 짧게 고마움을 전하고, 그 사람이라서 좋았던 점을 하나 콕 집어 말해 보세요. 말을 고르느라 미루기보다 마음을 전하는 게 더 중요해요.",
    example: "오늘 고마웠어요. 여행 이야기할 때 신나 하던 모습이 계속 생각나요.",
    basis: "실험 5,900여 명 + 스피드데이팅 156명",
    evidence:
      "미리 계획을 등록하고 진행한 여러 실험에서, 먼저 연락한 사람은 상대가 얼마나 반가워할지를 실제보다 낮게 짐작했어요. 칭찬도 받는 사람은 하는 사람의 예상보다 더 기뻐했고, 어떻게 말했는지보다 담긴 마음을 더 크게 느꼈어요. 스피드데이팅에서는 누구에게나 호감을 보인 사람보다 '이 사람이 특히 좋다'는 호감을 보인 사람이 호감을 더 많이 돌려받았어요.",
    sources: [
      {
        cite: "Liu, Rim, Min, Min (2023)",
        title: "The surprise of reaching out: Appreciated more than we think",
        journal: "Journal of Personality and Social Psychology",
        url: "https://doi.org/10.1037/pspi0000402",
      },
      {
        cite: "Zhao, Epley (2021)",
        title: "Insufficiently complimentary?: Underestimating the positive impact of compliments creates a barrier to expressing them",
        journal: "Journal of Personality and Social Psychology",
        url: "https://osf.io/preprints/psyarxiv/d7cra",
      },
      {
        cite: "Eastwick, Finkel, Mochon, Ariely (2007)",
        title: "Selective versus unselective romantic desire: Not all reciprocity is created equal",
        journal: "Psychological Science",
        url: "https://doi.org/10.1111/j.1467-9280.2007.01897.x",
      },
    ],
  },
];

export type DateMyth = { id: string; claim: string; why: string; sources: TipSource[] };

/** 흔히 듣지만 근거가 약해서 넣지 않은 것 */
export const DATE_MYTHS: DateMyth[] = [
  {
    id: "warm-drink",
    claim: "따뜻한 음료를 건네면 나를 더 따뜻한 사람으로 본다",
    why: "처음 연구(41명·53명)를 훨씬 많은 사람으로 여러 번 다시 해 봤지만 효과가 거의 없었어요.",
    sources: [
      {
        cite: "Lynott 외 (2014)",
        title: "Replication of “Experiencing physical warmth promotes interpersonal warmth” by Williams & Bargh (2008)",
        journal: "Social Psychology",
        url: "https://doi.org/10.1027/1864-9335/a000187",
      },
      {
        cite: "Chabris 외 (2019)",
        title: "No evidence that experiencing physical warmth promotes interpersonal warmth: Two failures to replicate Williams and Bargh (2008)",
        journal: "Social Psychology",
        url: "https://doi.org/10.1027/1864-9335/a000361",
      },
    ],
  },
  {
    id: "red",
    claim: "빨간 옷을 입으면 더 매력적으로 보인다",
    why: "연구를 모아 보니 효과가 작고 연구마다 크게 달랐어요. 나중에 나온 연구일수록 효과가 작아지는 경향도 있었어요.",
    sources: [
      {
        cite: "Lehmann, Elliot, Calin-Jageman (2018)",
        title: "Meta-analysis of the effect of red on perceived attractiveness",
        journal: "Evolutionary Psychology",
        url: "https://doi.org/10.1177/1474704918802412",
      },
    ],
  },
];

/** 대화방에서 연락처를 주고받은 뒤 이 창을 한 번 자동으로 열었는지 기억하는 기기 저장 키 */
export const dateTipsSeenKey = (otherId: string) => `hg-date-tips:${otherId}`;
