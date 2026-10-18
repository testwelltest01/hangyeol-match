// 그림 프로필 프롬프트. 순수 함수 (DB·비밀값 없음, 테스트 가능).
// 넣는 정보: 성별, 나이대, 키, 자기소개, 생활 성향, 성격, 꾸밈 정도, 추가 검사 요약.
// 넣지 않는 정보: 이름·닉네임, 지역, 종교, 연락처, 위생 점수, 결혼·자녀·흡연·음주 조건, 사진 내부 점수, 친구 평가.
// 입력 타입에 아예 없으므로 실수로도 들어가지 않는다.
import type { Scores } from "@/lib/scoring";

/** 프롬프트를 고치면 올린다 (어떤 프롬프트로 만든 그림인지 기록) */
export const PROMPT_VERSION = "2026-10-v1";

/** 한 계정이 그릴 수 있는 횟수 (평생). 실패는 세지 않고, 지운 그림은 센다 */
export const ILLUSTRATIONS_PER_ACCOUNT = 3;

export type IllustrationInput = {
  gender: "male" | "female";
  birthYear: number;
  /** 한국 기준 올해 */
  year: number;
  height: number | null;
  intro: string;
  scores: Scores;
  /** 추가 검사 결과 요약 문구 (있으면) */
  extraChips: string[];
};

export type IllustrationFeatures = {
  gender: "남성" | "여성";
  ageBand: string;
  height: number | null;
  lifestyle: string[];
  personality: string[];
  grooming: string;
  extras: string[];
  intro: string;
};

export function ageBand(birthYear: number, year: number): string {
  const age = year - birthYear;
  const decade = Math.floor(age / 10) * 10;
  const r = age % 10;
  return `${decade}대 ${r <= 3 ? "초반" : r <= 6 ? "중반" : "후반"}`;
}

const v = (s: Scores, id: string) => s.values.items[id];

/** 가치관 원점수 중 한쪽으로 뚜렷한 것만 생활 장면으로 바꾼다 (1~2 왼쪽, 5~6 오른쪽) */
function lifestyleCues(s: Scores): string[] {
  const out: string[] = [];
  const side = (id: string, left: string, right: string) => {
    const x = v(s, id);
    if (x <= 2) out.push(left);
    else if (x >= 5) out.push(right);
  };
  side("V10", "집에서 쉬며 충전하는 편 (책, 영화, 집안의 아늑한 공간)", "밖에서 활동하며 충전하는 편 (산책, 운동, 나들이)");
  side("V22", "아침형 (이른 아침의 맑은 빛)", "저녁형 (해 질 녘이나 밤의 따뜻한 조명)");
  side("V24", "집에서 요리해 먹는 걸 좋아함", "맛집 탐방과 외식을 좋아함");
  side("V08", "차곡차곡 모으고 아끼는 편", "여행·공연 같은 경험에 쓰는 걸 좋아함");
  side("V12", "혼자 즐기는 취미가 있음", "취미를 함께 즐기는 걸 좋아함");
  side("V19", "늘 정돈된 깔끔한 공간을 좋아함", "생활감 있는 편안한 공간을 좋아함");
  return out;
}

const TRAIT_TEXT: Record<keyof Scores["bigFive"], [string, string]> = {
  extraversion: ["조용하고 차분함", "밝고 사교적임"],
  agreeableness: ["솔직하고 담백함", "다정하고 배려심이 깊음"],
  conscientiousness: ["여유롭고 유연함", "성실하고 꼼꼼함"],
  stability: ["감수성이 풍부함", "마음이 안정되고 느긋함"],
  openness: ["현실적이고 실용적임", "호기심이 많고 상상력이 풍부함"],
};

/** 성격 5요인 중 평균(3)에서 뚜렷하게 벗어난 것만 (1~5점) */
function personalityCues(s: Scores): string[] {
  return (Object.keys(TRAIT_TEXT) as (keyof Scores["bigFive"])[])
    .map((t) => ({ t, x: s.bigFive[t] }))
    .filter(({ x }) => Number.isFinite(x) && Math.abs(x - 3) >= 0.75)
    .sort((a, b) => Math.abs(b.x - 3) - Math.abs(a.x - 3))
    .slice(0, 3)
    .map(({ t, x }) => TRAIT_TEXT[t][x > 3 ? 1 : 0]);
}

function groomingCue(s: Scores): string {
  const g = s.grooming.self;
  if (g <= 1.75) return "꾸밈은 최소한, 편안하고 수수한 차림";
  if (g <= 2.75) return "깔끔하고 자연스러운 차림";
  return "옷차림과 스타일에 신경 쓰는 세련된 차림";
}

export function buildFeatures(input: IllustrationInput): IllustrationFeatures {
  return {
    gender: input.gender === "male" ? "남성" : "여성",
    ageBand: ageBand(input.birthYear, input.year),
    height: input.height,
    lifestyle: lifestyleCues(input.scores),
    personality: personalityCues(input.scores),
    grooming: groomingCue(input.scores),
    extras: input.extraChips.slice(0, 4),
    intro: input.intro.replace(/\s+/g, " ").trim().slice(0, 300),
  };
}

const list = (xs: string[]) => (xs.length ? xs.map((x) => `- ${x}`).join("\n") : "- (특별히 없음)");

/**
 * 그림 프롬프트. 특정 스튜디오·작가·작품 이름은 쓰지 않고 화풍을 직접 묘사한다
 * (상표·저작권 문제를 피하고, 모델 정책이 바뀌어도 같은 결과를 얻기 위해).
 */
export function buildPrompt(f: IllustrationFeatures): string {
  return `Create one illustrated portrait of the adult shown in the reference photos.
Reference image 1 is a face photo and reference image 2 is a full-body photo of the same person.

STYLE
Warm, hand-painted 2D animated film look: soft watercolor backgrounds with gentle brush texture, clean expressive line art, simple cel shading, natural daylight colors, a cozy and slightly nostalgic atmosphere. Do not imitate any specific studio, artist, film, or existing character.

LIKENESS
Keep the person clearly recognizable: face shape, eyes, eyebrows, nose, hairstyle and hair color, skin tone, glasses or accessories, body type, and their usual clothing style from the photos. Do not beautify, slim, age up or down, or change ethnicity. Keep it modest and natural.

ABOUT THE PERSON (use only to choose pose, expression, setting, props and lighting; never write any text in the image)
- ${f.gender}, ${f.ageBand}${f.height ? `, 키 약 ${f.height}cm` : ""}
- 차림: ${f.grooming}
성격:
${list(f.personality)}
생활:
${list(f.lifestyle)}
${f.extras.length ? `대화·마음 표현:\n${list(f.extras)}\n` : ""}자기소개 (본인이 쓴 글, 분위기와 소품을 고르는 데만 참고): "${f.intro || "없음"}"

COMPOSITION
Vertical portrait. One person only, from the knees up, in an everyday setting that reflects their lifestyle and hobbies, with a natural, friendly expression looking toward the viewer. No text, letters, numbers, logos, watermarks, signatures, or frames.`;
}
