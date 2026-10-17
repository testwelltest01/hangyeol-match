import { describe, expect, it } from "vitest";
import { ALL_ITEMS, isRequired, type Answers } from "@/lib/items";
import { computeScores } from "@/lib/scoring";
import { ageBand, buildFeatures, buildPrompt, type IllustrationInput } from "./prompt";

function scores(overrides: Answers = {}) {
  const a: Answers = {};
  for (const item of ALL_ITEMS) {
    if (!isRequired(item)) continue;
    if (item.kind === "bipolar") a[item.id] = 3;
    else if (item.kind === "importance") a[item.id] = 2;
    else if (item.kind === "likert") a[item.id] = 3;
    else a[item.id] = item.options[0].value;
  }
  return computeScores({ ...a, ...overrides }, "male");
}

const base: IllustrationInput = {
  gender: "male",
  birthYear: 1997,
  year: 2026,
  height: 176,
  intro: "주말엔   한강에서 자전거 타요.\n고양이를 키워요.",
  scores: scores({ V10: 6, V22: 1, P01: 5, P11: 5, P06: 1, P16: 1 }),
  extraChips: ["리액션이 큰 편"],
};

describe("ageBand", () => {
  it("나이대를 초반·중반·후반으로", () => {
    expect(ageBand(2003, 2026)).toBe("20대 초반");
    expect(ageBand(2001, 2026)).toBe("20대 중반");
    expect(ageBand(1997, 2026)).toBe("20대 후반");
    expect(ageBand(1996, 2026)).toBe("30대 초반");
  });
});

describe("buildFeatures", () => {
  it("뚜렷한 성향만 장면으로 바꾸고, 자기소개는 한 줄로 정리한다", () => {
    const f = buildFeatures(base);
    expect(f.gender).toBe("남성");
    expect(f.ageBand).toBe("20대 후반");
    expect(f.lifestyle).toEqual(["밖에서 활동하며 충전하는 편 (산책, 운동, 나들이)", "아침형 (이른 아침의 맑은 빛)"]);
    expect(f.personality).toEqual(["밝고 사교적임"]);
    expect(f.intro).toBe("주말엔 한강에서 자전거 타요. 고양이를 키워요.");
    expect(f.extras).toEqual(["리액션이 큰 편"]);
  });

  it("자기소개는 300자까지", () => {
    expect(buildFeatures({ ...base, intro: "가".repeat(400) }).intro.length).toBe(300);
  });
});

describe("buildPrompt", () => {
  it("화풍은 묘사로만 쓰고 특정 스튜디오 이름은 넣지 않는다", () => {
    const p = buildPrompt(buildFeatures(base));
    expect(p).toContain("hand-painted 2D animated film look");
    expect(p).toContain("Do not imitate any specific studio");
    expect(p.toLowerCase()).not.toContain("ghibli");
    expect(p).not.toContain("지브리");
    expect(p).toContain("남성, 20대 후반, 키 약 176cm");
    expect(p).toContain("No text, letters");
  });

  it("검사 점수의 민감한 값(위생, 결혼·자녀·흡연 조건)은 프롬프트에 없다", () => {
    const p = buildPrompt(buildFeatures(base));
    for (const word of ["위생", "흡연", "결혼", "자녀", "hygiene", "smok"]) expect(p).not.toContain(word);
  });
});
