// 가상 매칭 둘러보기(/tour)에 나오는 체험용 가상 인물. 실제 회원이 아니고 DB에도 없다.
// 남성 회원에게는 여성 인물을, 여성 회원에게는 남성 인물을 보여준다.
// 사진은 public/tour/ (가상 인물 사진). 바꾸려면 파일만 같은 이름으로 교체한다.

export type TourGender = "male" | "female";

/** 대화 한 차례: 내가 고를 수 있는 답장과 그에 대한 상대의 답 */
export type TourReply = { text: string; answer: string[] };
export type TourRound = { replies: TourReply[]; /** 내가 직접 쓴 답장에 대한 상대의 답 */ freeAnswer: string[] };

export type TourPersona = {
  nickname: string;
  birthYear: number;
  region: string;
  height: number;
  reason: string;
  talkingPoint: string;
  chips: string[];
  intro: string;
  /** '나와 비슷한 정도' 예시 값 (높은 순) */
  domains: { label: string; percent: number }[];
  photos: { face: string; body: string };
  /** 대화방이 열리면 상대가 먼저 보내는 인사. {name}은 내 닉네임(없으면 지운다) */
  opening: string[];
  rounds: TourRound[];
  /** 마지막에 상대가 연락처를 주고받자고 하는 말 */
  contactAsk: string;
};

const WOMAN: TourPersona = {
  nickname: "윤슬",
  birthYear: 1997,
  region: "서울|마포구",
  height: 163,
  reason: "연락 빈도 기대와 다툰 뒤 푸는 방식이 비슷해서 추천했어요.",
  talkingPoint: "주말 보내는 방식은 조금 달라요. 만나면 먼저 이야기해보세요.",
  chips: ["답장은 빨리", "갈등은 바로 대화", "밖에서 충전"],
  intro:
    "평일엔 회사와 집을 오가고, 주말엔 한강을 따라 걷거나 새로 생긴 카페를 찾아다녀요.\n연락은 자주 하는 편이고, 서운한 건 그날 바로 이야기하는 게 편해요. 맛있는 걸 먹으면 같이 먹고 싶은 사람이 떠오르는 연애를 하고 싶어요.",
  domains: [
    { label: "연락", percent: 92 },
    { label: "갈등", percent: 88 },
    { label: "결혼·자녀", percent: 81 },
    { label: "돈", percent: 76 },
    { label: "수면·식사", percent: 72 },
    { label: "집안일", percent: 70 },
    { label: "정리정돈", percent: 64 },
    { label: "여가", percent: 58 },
  ],
  photos: { face: "/tour/woman-face.webp", body: "/tour/woman-body.webp" },
  opening: ["안녕하세요{name}! 추천 이유에 연락 스타일이 비슷하다고 나와서 반가웠어요.", "저는 답장 빠른 편인데, 혹시 메시지랑 통화 중에 뭐가 더 편하세요?"],
  rounds: [
    {
      replies: [
        { text: "안녕하세요! 저는 메시지가 더 편해요. 저도 답장은 빠른 편이에요.", answer: ["오 다행이다 ㅎㅎ 저도 메시지가 편해요.", "주말엔 보통 뭐 하면서 보내세요? 저는 날 좋으면 무조건 밖으로 나가요."] },
        { text: "반가워요! 저는 통화가 편한데, 처음엔 메시지로 천천히 알아가는 것도 좋아요.", answer: ["배려해주셔서 고마워요 ㅎㅎ 친해지면 통화도 좋아요.", "주말엔 보통 뭐 하면서 보내세요? 저는 날 좋으면 무조건 밖으로 나가요."] },
      ],
      freeAnswer: ["앗 그렇구나 ㅎㅎ 이야기해보니까 편하네요.", "주말엔 보통 뭐 하면서 보내세요? 저는 날 좋으면 무조건 밖으로 나가요."],
    },
    {
      replies: [
        { text: "저는 집에서 쉬면서 영화 보는 게 좋아요. 그래서 여가가 조금 다르게 나왔나 봐요.", answer: ["그런가 봐요 ㅋㅋ 그래도 영화 좋아해요! 요즘 본 것 중에 추천할 만한 거 있으면 알려주세요.", "가끔은 같이 걷고, 가끔은 집에서 영화 보면 딱이겠네요."] },
        { text: "저도 밖이 좋아요. 요즘은 맛집 찾아다니는 재미로 지내요.", answer: ["헉 맛집 리스트 공유하면 주말 일정 금방 나오겠어요 ㅎㅎ", "마포 쪽에 아끼는 파스타집이 하나 있는데 나중에 알려드릴게요."] },
      ],
      freeAnswer: ["오 좋다 ㅎㅎ 서로 주말 이야기만 해도 시간 가는 줄 모르겠어요."],
    },
  ],
  contactAsk: "이야기 더 나누고 싶어요. 괜찮으면 연락처 주고받을래요? 저 방금 '연락처 전달' 눌렀어요!",
};

const MAN: TourPersona = {
  nickname: "도담",
  birthYear: 1994,
  region: "경기|성남시",
  height: 179,
  reason: "결혼·자녀에 대한 생각과 돈 쓰는 방식이 비슷해서 추천했어요.",
  talkingPoint: "수면·식사 리듬은 조금 달라요. 만나면 먼저 이야기해보세요.",
  chips: ["처음부터 결혼을 생각", "큰 지출은 계획적으로", "연락은 자주"],
  intro:
    "판교에서 일하고, 퇴근하면 동네 헬스장에 들렀다 와요. 주말 아침엔 커피를 내려 마시면서 책 읽는 걸 좋아하고, 파스타 정도는 자신 있게 만들어요.\n서로의 하루를 궁금해하고, 다툰 날에도 그날 안에 푸는 연애를 하고 싶어요.",
  domains: [
    { label: "결혼·자녀", percent: 94 },
    { label: "돈", percent: 89 },
    { label: "연락", percent: 84 },
    { label: "갈등", percent: 80 },
    { label: "집안일", percent: 75 },
    { label: "정리정돈", percent: 71 },
    { label: "여가", percent: 66 },
    { label: "수면·식사", percent: 55 },
  ],
  photos: { face: "/tour/man-face.webp", body: "/tour/man-body.webp" },
  opening: ["안녕하세요{name}, 반가워요. 결혼에 대한 생각이 비슷하다고 나와서 먼저 인사드려요.", "주말엔 보통 어떻게 보내세요?"],
  rounds: [
    {
      replies: [
        { text: "안녕하세요! 저는 주말엔 카페 가서 책 읽거나 전시 보러 다녀요.", answer: ["오 저도 주말 아침엔 꼭 책 읽어요 ㅎㅎ 취향이 비슷하네요.", "쉬는 날엔 뭐 먹는 걸 제일 좋아하세요? 저는 파스타 만드는 게 소소한 낙이에요."] },
        { text: "반가워요! 저는 집에서 푹 쉬는 편이에요. 평일에 에너지를 다 써서요.", answer: ["완전 이해해요. 저도 평일엔 퇴근하면 녹초예요 ㅎㅎ", "쉬는 날엔 뭐 먹는 걸 제일 좋아하세요? 저는 파스타 만드는 게 소소한 낙이에요."] },
      ],
      freeAnswer: ["그렇군요 ㅎㅎ 이야기 들으니까 더 궁금해져요.", "쉬는 날엔 뭐 먹는 걸 제일 좋아하세요? 저는 파스타 만드는 게 소소한 낙이에요."],
    },
    {
      replies: [
        { text: "저는 야행성이라 주말엔 늦잠 자고 브런치 먹는 게 행복이에요.", answer: ["아 그래서 수면 리듬이 조금 다르게 나왔나 봐요 ㅋㅋ", "저는 아침형이라, 제가 커피 내려놓고 기다리면 되겠네요."] },
        { text: "파스타 좋아해요! 오일 파스타 제일 좋아해요.", answer: ["오 알리오 올리오 제 주특기예요 ㅎㅎ", "맛있는 집도 몇 군데 알아요. 나중에 같이 가봐요."] },
      ],
      freeAnswer: ["오 좋네요 ㅎㅎ 대화가 편해서 시간 가는 줄 몰랐어요."],
    },
  ],
  contactAsk: "이야기가 잘 통해서 더 대화하고 싶어요. 괜찮으면 연락처 주고받을까요? 저는 '연락처 전달' 눌렀어요.",
};

/** 내 성별의 반대 성별 가상 인물 */
export const personaFor = (myGender: TourGender): TourPersona => (myGender === "male" ? WOMAN : MAN);
