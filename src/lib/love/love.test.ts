import { describe, expect, it } from "vitest";
import { hashGuestToken, isGuestToken, newGuestToken } from "./guest";
import { SCENE_PROMPT_VERSION, SCENE_PROMPTS, scenePath, scenePrompt } from "./scenes";
import { LOVE_ITEMS, LOVE_PAGES, LOVE_SCALES } from "./items";
import { buildUserInput, parseLoveReport, RESPONSE_SCHEMA, SITUATIONS } from "./prompt";
import { loveLevel, scoreLove, validateLove } from "./score";
import type { Scores } from "@/lib/scoring";

const allAnswers = (v: number) => Object.fromEntries(LOVE_ITEMS.map((i) => [i.id, v]));

describe("문항 구성", () => {
  it("관계 12 + 기질 4 + 성격 3 = 19척도 × 4문항, id가 겹치지 않고 척도마다 역문항이 1개 이상", () => {
    expect(LOVE_SCALES).toHaveLength(19);
    expect(LOVE_SCALES.filter((s) => s.group === "temperament")).toHaveLength(4);
    expect(LOVE_SCALES.filter((s) => s.group === "character")).toHaveLength(3);
    expect(LOVE_ITEMS).toHaveLength(76);
    expect(new Set(LOVE_ITEMS.map((i) => i.id)).size).toBe(76);
    for (const s of LOVE_SCALES) {
      const items = LOVE_ITEMS.filter((i) => i.scale === s.id);
      expect(items).toHaveLength(4);
      expect(items.some((i) => i.reverse)).toBe(true);
      expect(items.some((i) => !i.reverse)).toBe(true);
    }
  });

  it("8쪽(10·9문항)에 모든 문항이 한 번씩, 같은 척도 문항은 한 쪽에 하나뿐", () => {
    expect(LOVE_PAGES).toHaveLength(8);
    const ids = LOVE_PAGES.flat().map((i) => i.id);
    expect(ids).toHaveLength(76);
    expect(new Set(ids).size).toBe(76);
    for (const page of LOVE_PAGES) {
      expect(page.length === 10 || page.length === 9).toBe(true);
      expect(new Set(page.map((i) => i.scale)).size).toBe(page.length);
      // 한 쪽에 정문항·역문항이 섞인다
      expect(page.some((i) => i.reverse) && page.some((i) => !i.reverse)).toBe(true);
    }
  });
});

describe("채점", () => {
  it("빠진 문항이나 범위 밖 값이 있으면 거절하고, 모르는 문항은 버린다", () => {
    expect(validateLove(null)).toBeNull();
    const ok = allAnswers(3);
    expect(validateLove({ ...ok, LW1: 6 })).toBeNull();
    expect(validateLove({ ...ok, LW1: 2.5 })).toBeNull();
    const { LW1: _drop, ...missing } = ok;
    void _drop;
    expect(validateLove(missing)).toBeNull();
    expect(validateLove({ ...ok, EXTRA: 1 })).toEqual(ok);
  });

  it("역문항은 6 − 응답으로 센다", () => {
    const answers = Object.fromEntries(LOVE_ITEMS.map((i) => [i.id, i.reverse ? 1 : 5]));
    const scores = scoreLove(answers);
    for (const s of LOVE_SCALES) expect(scores[s.id]).toBe(5);
    expect(scoreLove(allAnswers(3)).warmth).toBe(3);
    // warmth: LW1 5, LW2(역) 5→1, LW3 5, LW4(역) 5→1 → 3
    expect(scoreLove(allAnswers(5)).warmth).toBe(3);
  });

  it("수준 기준은 기본 검사 성격과 같다", () => {
    expect(loveLevel(3.75)).toBe("high");
    expect(loveLevel(3)).toBe("mid");
    expect(loveLevel(2.25)).toBe("low");
  });
});

const MAIN: Scores = {
  version: "t",
  values: {
    items: Object.fromEntries(Array.from({ length: 24 }, (_, i) => [`V${String(i + 1).padStart(2, "0")}`, (i % 6) + 1])),
    importance: { marriage: 4, contact: 3, money: 2, leisure: 1, conflict: 3, chores: 2, tidiness: 1, routine: 1 },
  },
  dealbreakers: { marriage: "yes", children: "no", smoking: "none", drinking: "rarely" },
  bigFive: { extraversion: 4, agreeableness: 3, conscientiousness: 2, stability: 3.5, openness: 4.5 },
  hygiene: 18,
  grooming: { self: 2, preferred: null, importance: 1 },
} as Scores;

describe("AI 입력", () => {
  const text = buildUserInput({ gender: "female", love: scoreLove(allAnswers(4)), main: MAIN, extraChips: ["마음이 전해지는 순간: 함께하는 시간"] });

  it("검사 점수·성격·가치관·추가 검사 요약이 들어간다", () => {
    expect(text).toContain("성별: 여성 (매칭 상대는 남성)");
    expect(text).toContain("마음 여는 속도");
    expect(text).toContain("## 기질과 성격");
    expect(text).toContain("[타고난 기질]");
    expect(text).toContain("- 스스로 서기:");
    expect(text).toContain("외향성: 4.00 (높은 편)");
    expect(text).toContain("연애 중 연락은 하루 몇 번이면 충분하다");
    expect(text).toContain("[연락] 이 영역에서 생각이 다른 상대: 많이 신경 쓰인다");
    expect(text).toContain("마음이 전해지는 순간: 함께하는 시간");
  });

  it("기질·성격은 한결식 이름으로만 보낸다 (상업 검사 이름·차원 이름 없음)", () => {
    expect(text).not.toMatch(/TCI|Cloninger|자극추구|위험회피|사회적 민감성|인내력|자율성|연대감|자기초월/);
  });

  it("조건(결혼·자녀·흡연·음주)·위생·꾸밈은 보내지 않는다", () => {
    expect(text).not.toMatch(/흡연|음주|위생|꾸밈|결혼 의사|자녀 계획/);
  });
});

describe("AI 입력 (가입 전 비회원)", () => {
  const text = buildUserInput({ gender: null, love: scoreLove(allAnswers(4)), main: null, extraChips: [] });
  it("성별·기본 검사 없이 연애 상황 검사 결과만 보낸다", () => {
    expect(text).toContain("성별: 알 수 없음");
    expect(text).toContain("## 관계 척도");
    expect(text).toContain("## 기질과 성격");
    expect(text).toContain("기본 검사 결과: 없음");
    expect(text).not.toContain("성격 5요인");
    expect(text).not.toContain("관계 가치관");
  });
});

describe("비회원 열쇠", () => {
  it("32자 base64url, 해시는 열쇠마다 다르고 같은 열쇠는 같다", () => {
    const t = newGuestToken();
    expect(isGuestToken(t)).toBe(true);
    expect(isGuestToken("short")).toBe(false);
    expect(isGuestToken(`${t.slice(0, 31)}!`)).toBe(false);
    expect(hashGuestToken(t)).toBe(hashGuestToken(t));
    expect(hashGuestToken(t)).not.toBe(hashGuestToken(newGuestToken()));
    expect(hashGuestToken(t)).toMatch(/^[0-9a-f]{64}$/);
  });
});

const scene = { me: "나는 이래요.", seen: "이렇게 보여요.", tip: "해 보세요.", say: "“우리 천천히 알아가요.”" };
const VALID_RAW = {
  headline: "천천히 열지만 깊게 주는 사람.",
  summary: "요약이에요.",
  nature: "기질과 성격이에요.",
  strengths: ["하나", "둘", "셋", "넷"],
  situations: Object.fromEntries(SITUATIONS.map((s) => [s.id, scene])),
  match: { good: "잘 맞아요.", careful: "이야기가 필요해요." },
  one_thing: "한 가지예요.",
};

describe("AI 응답 검사", () => {
  it("형식이 맞으면 다듬어서 돌려준다 (마침표·따옴표 떼기, 강점 3개까지)", () => {
    const r = parseLoveReport(VALID_RAW)!;
    expect(r.headline).toBe("천천히 열지만 깊게 주는 사람");
    expect(r.strengths).toEqual(["하나", "둘", "셋"]);
    expect(r.situations.first.say).toBe("우리 천천히 알아가요.");
  });

  it("장면이 하나라도 빠지거나 비면 실패", () => {
    const { first: _f, ...rest } = VALID_RAW.situations;
    void _f;
    expect(parseLoveReport({ ...VALID_RAW, situations: rest })).toBeNull();
    expect(parseLoveReport({ ...VALID_RAW, situations: { ...VALID_RAW.situations, fight: { ...scene, tip: "  " } } })).toBeNull();
    expect(parseLoveReport({ ...VALID_RAW, strengths: ["하나"] })).toBeNull();
    expect(parseLoveReport({ ...VALID_RAW, nature: "" })).toBeNull();
    expect(parseLoveReport("x")).toBeNull();
  });

  it("응답 형식(JSON schema)의 장면 키가 화면 장면과 같다", () => {
    expect(RESPONSE_SCHEMA.schema.properties.situations.required).toEqual(SITUATIONS.map((s) => s.id));
  });
});

describe("장면 사진 프롬프트", () => {
  it("장면 10가지마다 프롬프트가 있고 공통 화풍(글자 없음·실제 사진풍)이 붙는다", () => {
    for (const s of SITUATIONS) {
      const p = scenePrompt(s.id);
      expect(SCENE_PROMPTS[s.id].length).toBeGreaterThan(40);
      expect(p).toContain("No readable text");
      expect(p).toContain("Candid lifestyle photograph");
    }
    expect(scenePath("first", 123)).toBe(`first-${SCENE_PROMPT_VERSION}-123.webp`);
  });
});
