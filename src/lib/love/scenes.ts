// 연애 상황 보고서의 장면 사진: 장면 10가지마다 실제 상황 같은 사진 한 장(모든 보고서가 같이 쓴다, 회원 사진이 아니다).
// 관리자 화면에서 OpenAI 이미지 생성으로 만들어 Supabase Storage 공개 버킷 'scenes'에 둔다 (src/lib/love/sceneImages.ts).
// 순수 모듈(테스트용). 프롬프트를 바꾸면 SCENE_PROMPT_VERSION을 올리고 관리자 화면에서 다시 만든다.
import type { SituationId } from "@/lib/love/prompt";

export const SCENE_PROMPT_VERSION = "2026-10-v1";

/**
 * 모든 장면에 붙는 공통 화풍. 실제 생활 사진처럼 보이되 광고 사진처럼 꾸미지 않는다.
 * 얼굴이 정면으로 크게 나오지 않게(옆모습·뒷모습·살짝 흐린 얼굴) 해서 장면마다 다른 사람이어도 어색하지 않고, 실존 인물처럼 보이지 않게 한다.
 * 화면 속 글자는 깨지기 쉬워 넣지 않는다
 */
const STYLE = [
  "Candid lifestyle photograph, documentary style, shot on a 35mm lens with natural light and soft film grain.",
  "Ordinary Korean adults in their late 20s to early 30s in modest everyday clothing, set in Seoul.",
  "Faces shown in profile, from behind, partly turned away or softly out of focus; natural, not glamorized, no posing for the camera.",
  "Warm, gentle color grading, shallow depth of field, landscape 3:2 composition with the people slightly off-center.",
  "No readable text, no screens with text, no logos, no brand names, no watermark, no captions.",
].join(" ");

/** 장면마다 그 순간이 한눈에 보이는 상황. 성별 역할이 한쪽으로 몰리지 않게 장면마다 번갈아 둔다 */
export const SCENE_PROMPTS: Record<SituationId, string> = {
  first:
    "A man and a woman on an early date at a small, cozy neighborhood café, sitting across a little wooden table with two cups of coffee, slightly shy smiles, leaning in a bit while talking, warm afternoon light through the window.",
  texting:
    "A young man sitting alone on a sofa at night, holding his phone with the screen dimly glowing toward him (screen not visible to the viewer), looking at it thoughtfully while waiting for a reply, a warm floor lamp beside him, quiet apartment.",
  expressing:
    "On a city street at dusk with soft bokeh lights, a young woman holding out a small wrapped gift to a young man, who looks pleasantly surprised; a tender, slightly awkward and happy moment.",
  hurt:
    "A couple sitting at the two ends of a park bench in autumn, a little distance between them, one looking down at their hands and the other looking away at the trees, a quiet and slightly heavy mood, fallen leaves.",
  fight:
    "A couple standing in a small apartment kitchen having a serious, tense conversation, one with arms crossed and the other gesturing with an open hand while explaining, no aggression, natural daylight from a window.",
  makeup:
    "A couple sitting close together on a sofa in the evening, one gently holding the other's hand, both with soft, relieved smiles after a talk, warm lamp light, two mugs of tea on the low table.",
  hard_day:
    "A tired young man sitting at a kitchen table after a long day, head lowered, while a young woman sets a warm cup of tea in front of him and rests a comforting hand on his shoulder, soft evening light.",
  deciding:
    "A couple sitting side by side at a café table planning a trip together, a paper map and an open notebook in front of them, one pointing at the map while the other thinks, a laptop closed at the side.",
  together:
    "A couple walking side by side along the Han River park in Seoul on a sunny weekend afternoon, casual clothes, a picnic bag in hand, bicycles and families blurred in the background, relaxed and happy.",
  long_term:
    "A couple in comfortable home clothes cooking dinner together in a small, lived-in kitchen, one stirring a pot and the other tasting from a spoon, both laughing naturally, warm evening light.",
};

export const scenePrompt = (id: SituationId): string => `${SCENE_PROMPTS[id]} ${STYLE}`;

/** 저장 경로: 만들 때마다 새 이름(브라우저·CDN 캐시에 예전 사진이 남지 않게) */
export const scenePath = (id: SituationId, stamp: number): string => `${id}-${SCENE_PROMPT_VERSION}-${stamp}.webp`;
