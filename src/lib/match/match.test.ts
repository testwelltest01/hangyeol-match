import { describe, expect, it } from "vitest";
import { normalizeInstagram, normalizeKakao } from "@/lib/contact";
import { daysBefore, kstDay } from "@/lib/day";
import { ALL_REGION_KEYS, PROVINCES, isRegionKey, regionLabel } from "@/lib/regions";
import { checkPassword } from "@/lib/password";
import { PHOTO_UPLOADS_PER_ACCOUNT, remainingUploads } from "@/lib/photo/rules";
import { computeOverall, postprocess } from "@/lib/photo/score";
import { sniffImage } from "@/lib/sniff";
import { allocate, gateFactor, type Edge } from "./allocate";
import { josa } from "./explain";
import {
  checkIntro,
  checkMutual,
  checkOneWay,
  defaultFilters,
  meets,
  sanitizeFilters,
  type Filters,
  type MatchPerson,
} from "./filters";

const YEAR = 2026;

function person(over: Omit<Partial<MatchPerson>, "filters"> & { filters?: Partial<Filters> } = {}): MatchPerson {
  const base: MatchPerson = {
    id: "a",
    gender: "male",
    birthYear: 1996,
    region: "서울|강남구",
    height: 175,
    religion: "none",
    smoking: "none",
    drinking: "rarely",
    marriage: "yes",
    children: "unsure",
    filters: defaultFilters({ birthYear: 1996, region: "서울|강남구" }, YEAR),
  };
  const { filters, ...rest } = over;
  return { ...base, ...rest, filters: { ...base.filters, ...(filters ?? {}) } };
}

describe("지역 데이터", () => {
  it("시·도별 시·군·구 수가 맞다 (2026년 10월 기준)", () => {
    const count = Object.fromEntries(PROVINCES.map((p) => [p.id, p.districts.length]));
    expect(count).toMatchObject({
      서울: 25, 경기: 31, 인천: 11, 강원: 18, 대전: 5, 세종: 1, 충북: 11, 충남: 15,
      광주전남: 27, 전북: 14, 대구: 9, 경북: 22, 부산: 16, 울산: 5, 경남: 18, 제주: 2,
    });
    expect(ALL_REGION_KEYS.size).toBe(230);
  });

  it("시·도 안에서 이름이 겹치지 않는다", () => {
    for (const p of PROVINCES) expect(new Set(p.districts).size).toBe(p.districts.length);
  });

  it("키 검증과 표시", () => {
    expect(isRegionKey("서울|강남구")).toBe(true);
    expect(isRegionKey("서울|없는구")).toBe(false);
    expect(regionLabel("광주전남|동구")).toBe("광주·전남 동구");
    expect(regionLabel("세종|세종시")).toBe("세종");
  });
});

describe("조건 검사", () => {
  it("나이는 출생연도로 계산한 연 나이로 본다", () => {
    const viewer = person({ filters: { age: { min: 25, max: 30, strict: true } } });
    expect(meets("age", viewer, person({ id: "b", birthYear: 2001 }), YEAR)).toBe(true); // 25세
    expect(meets("age", viewer, person({ id: "b", birthYear: 2002 }), YEAR)).toBe(false); // 24세
  });

  it("키는 경계에 ±2cm 여유를 둔다", () => {
    const viewer = person({ filters: { height: { mode: "range", min: 170, max: 180, strict: true } } });
    expect(meets("height", viewer, person({ id: "b", height: 168 }), YEAR)).toBe(true);
    expect(meets("height", viewer, person({ id: "b", height: 167 }), YEAR)).toBe(false);
    const taller = person({ height: 165, filters: { height: { mode: "taller", min: 150, max: 190, strict: true } } });
    expect(meets("height", taller, person({ id: "b", height: 164 }), YEAR)).toBe(true);
    expect(meets("height", taller, person({ id: "b", height: 163 }), YEAR)).toBe(false);
    const shorter = person({ height: 180, filters: { height: { mode: "shorter", min: 150, max: 190, strict: true } } });
    expect(meets("height", shorter, person({ id: "b", height: 181 }), YEAR)).toBe(true);
    expect(meets("height", shorter, person({ id: "b", height: 182 }), YEAR)).toBe(false);
  });

  it("흡연 조건", () => {
    const noCig = person({ filters: { smoking: { mode: "no_cigarette", strict: true } } });
    expect(meets("smoking", noCig, person({ id: "b", smoking: "ecig" }), YEAR)).toBe(true);
    expect(meets("smoking", noCig, person({ id: "b", smoking: "yes" }), YEAR)).toBe(false);
    const noneOnly = person({ filters: { smoking: { mode: "none_only", strict: true } } });
    expect(meets("smoking", noneOnly, person({ id: "b", smoking: "ecig" }), YEAR)).toBe(false);
  });

  it("음주 조건", () => {
    const notOften = person({ filters: { drinking: { mode: "not_often", strict: true } } });
    expect(meets("drinking", notOften, person({ id: "b", drinking: "weekly" }), YEAR)).toBe(true);
    expect(meets("drinking", notOften, person({ id: "b", drinking: "often" }), YEAR)).toBe(false);
    const rarely = person({ filters: { drinking: { mode: "rarely_or_less", strict: true } } });
    expect(meets("drinking", rarely, person({ id: "b", drinking: "rarely" }), YEAR)).toBe(true);
    expect(meets("drinking", rarely, person({ id: "b", drinking: "weekly" }), YEAR)).toBe(false);
    const noneOnly = person({ filters: { drinking: { mode: "none_only", strict: true } } });
    expect(meets("drinking", noneOnly, person({ id: "b", drinking: "none" }), YEAR)).toBe(true);
    expect(meets("drinking", noneOnly, person({ id: "b", drinking: "rarely" }), YEAR)).toBe(false);
  });

  it("결혼·자녀는 원함 vs 원하지 않음만 걸린다", () => {
    const viewer = person({ marriage: "yes" });
    expect(meets("family", viewer, person({ id: "b", marriage: "no" }), YEAR)).toBe(false);
    expect(meets("family", viewer, person({ id: "b", marriage: "unsure" }), YEAR)).toBe(true);
  });

  it("종교 조건: 같은 종교 또는 고른 종교만", () => {
    const viewer = person({ religion: "catholic", filters: { religion: { mode: "same", list: [], strict: true } } });
    expect(meets("religion", viewer, person({ id: "b", religion: "catholic" }), YEAR)).toBe(true);
    expect(meets("religion", viewer, person({ id: "b", religion: "buddhist" }), YEAR)).toBe(false);
    const specific = person({ religion: "none", filters: { religion: { mode: "specific", list: ["none", "protestant"], strict: true } } });
    expect(meets("religion", specific, person({ id: "b", religion: "protestant" }), YEAR)).toBe(true);
  });

  it("'되도록' 조건은 막지 않고 감점만 한다", () => {
    const viewer = person({ filters: { smoking: { mode: "none_only", strict: false } } });
    const r = checkOneWay(viewer, person({ id: "b", smoking: "yes" }), YEAR);
    expect(r.blocked).toBe(false);
    expect(r.softMisses).toBe(1);
  });

  it("양방향: 한쪽 '꼭' 조건이라도 어긋나면 서로 노출하지 않는다", () => {
    const man = person({ id: "m", gender: "male", region: "서울|강남구" });
    const woman = person({
      id: "w",
      gender: "female",
      region: "서울|마포구",
      birthYear: 1997,
      filters: { regions: { list: ["서울|마포구"], strict: true } },
    });
    expect(checkMutual(man, woman, YEAR).ok).toBe(false); // 여성의 지역 조건에 남성 지역이 없음
    const woman2 = { ...woman, filters: { ...woman.filters, regions: { list: ["서울|마포구", "서울|강남구"], strict: true } } };
    expect(checkMutual(man, woman2, YEAR).ok).toBe(true);
    expect(checkMutual(man, { ...man, id: "m2" }, YEAR).ok).toBe(false); // 같은 성별
  });
});

describe("입력 검증", () => {
  it("조건 정리: 잘못된 지역은 빼고, 잘못된 값은 막는다", () => {
    const f = defaultFilters({ birthYear: 1996, region: "서울|강남구" }, YEAR);
    const ok = sanitizeFilters({ ...f, regions: { list: ["서울|강남구", "가짜|구"], strict: true } });
    expect("error" in ok).toBe(false);
    if (!("error" in ok)) expect(ok.regions.list).toEqual(["서울|강남구"]);

    expect("error" in sanitizeFilters({ ...f, religion: { mode: "specific", list: [], strict: true } })).toBe(true);
    expect("error" in sanitizeFilters({ ...f, age: { min: 40, max: 30, strict: true } })).toBe(true);
    expect("error" in sanitizeFilters("hack")).toBe(true);
    expect("error" in sanitizeFilters({ ...f, drinking: { mode: "hack", strict: true } })).toBe(true);
    expect("error" in sanitizeFilters({ ...f, drinking: undefined })).toBe(true);
  });

  it("자기소개에 연락처를 적을 수 없다", () => {
    expect(checkIntro("주말엔 등산하고 카페 가는 걸 좋아해요.")).toBeNull();
    expect(checkIntro("인스타 hangyeol 로 연락주세요")).not.toBeNull();
    expect(checkIntro("@hangyeol_1")).not.toBeNull();
    expect(checkIntro("010-1234-5678")).not.toBeNull();
    expect(checkIntro("open.kakao.com/o/abc")).not.toBeNull();
  });

  it("연락처 정리", () => {
    expect(normalizeInstagram("@Han.Gyeol_")).toBe("han.gyeol_");
    expect(normalizeInstagram("https://www.instagram.com/hangyeol/")).toBe("hangyeol");
    expect(normalizeInstagram("한결")).toBeNull();
    expect(normalizeKakao("han")).toBeNull();
    expect(normalizeKakao("hangyeol-01")).toBe("hangyeol-01");
    expect(normalizeKakao("")).toBe("");
  });

  it("파일 내용으로 이미지 형식을 판별한다", () => {
    expect(sniffImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImage(Buffer.from("<script>alert(1)</script>"))).toBeNull();
  });
});

describe("추천 배분", () => {
  it("후보가 적은 사람부터 고르고, 노출 상한을 지킨다", () => {
    const edges: Edge[] = [
      { viewer: "A", target: "X", score: 0.9, priority: false },
      { viewer: "A", target: "Y", score: 0.8, priority: false },
      { viewer: "B", target: "X", score: 0.95, priority: false },
      { viewer: "C", target: "X", score: 0.99, priority: false },
      { viewer: "C", target: "Y", score: 0.5, priority: false },
    ];
    const out = allocate(edges, { perUser: 1, exposureCap: 1 });
    expect(out.get("B")!.map((e) => e.target)).toEqual(["X"]); // 후보가 하나뿐인 B가 먼저
    expect(out.get("A")!.map((e) => e.target)).toEqual(["Y"]);
    expect(out.get("C")!).toEqual([]);
  });

  it("먼저 관심을 보낸 사람이 점수와 상관없이 먼저 온다", () => {
    const out = allocate(
      [
        { viewer: "A", target: "X", score: 0.9, priority: false },
        { viewer: "A", target: "Y", score: 0.1, priority: true },
      ],
      { perUser: 1 },
    );
    expect(out.get("A")![0].target).toBe("Y");
  });

  it("만남 후 평가가 나쁘게 쌓이면 노출을 줄인다", () => {
    const bad = { outcome: "met", photo_match: 1, cleanliness: 4, manners: 4 };
    const good = { outcome: "met", photo_match: 5, cleanliness: 5, manners: 5 };
    expect(gateFactor([bad])).toBe(1);
    expect(gateFactor([bad, { outcome: "no_show", photo_match: null, cleanliness: null, manners: null }])).toBe(0.6);
    expect(gateFactor([good, good, good])).toBe(1);
  });

  it("조사", () => {
    expect(josa("연락 빈도 기대", "과", "와")).toBe("연락 빈도 기대와");
    expect(josa("주말 보내는 방식", "이", "가")).toBe("주말 보내는 방식이");
  });
});

describe("사진", () => {
  it("계정당 20번까지: 등록·거절은 세고, AI 장애로 실패한 시도는 세지 않는다", () => {
    expect(PHOTO_UPLOADS_PER_ACCOUNT).toBe(20);
    expect(remainingUploads([])).toBe(20);
    expect(remainingUploads(["registered", "rejected", "error"])).toBe(18);
    expect(remainingUploads(Array(25).fill("rejected"))).toBe(0);
  });

  it("종합 점수는 코드에서 가중합으로 계산하고, 50 미만이면 다시 찍기를 권한다", () => {
    expect(computeOverall({ mood: 10, photo_quality: 10, expression_pose: 10, grooming_style: 10 })).toBe(100);
    expect(computeOverall({ mood: 5, photo_quality: 8, expression_pose: 5, grooming_style: 8 })).toBe(58);
    const r = postprocess(
      { is_valid: true, scores: { mood: 2, photo_quality: 3, expression_pose: 3, grooming_style: 99 }, feedback: { strength: "밝아요", improvements: [] } },
      "m",
    );
    expect(r.valid).toBe(true);
    if (r.valid) {
      expect(r.internal.grooming_style).toBe(10); // 범위 밖 값은 잘라낸다
      expect(r.userView.suggest_retake).toBe(true);
    }
    expect(postprocess({ is_valid: false, reject_reason: "얼굴이 가려졌어요." }, "m")).toEqual({
      ok: true,
      valid: false,
      rejectReason: "얼굴이 가려졌어요.",
    });
  });

  it("한국 날짜 계산", () => {
    expect(kstDay(new Date("2026-10-16T15:00:00Z"))).toBe("2026-10-17");
    expect(daysBefore("2026-10-17", 14)).toBe("2026-10-03");
  });
});

describe("비밀번호 규칙", () => {
  it("8자 이상, 영문과 숫자", () => {
    expect(checkPassword("abc12345")).toBeNull();
    expect(checkPassword("abc1234")).not.toBeNull();
    expect(checkPassword("abcdefgh")).not.toBeNull();
    expect(checkPassword("12345678")).not.toBeNull();
  });
});
