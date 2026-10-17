// 매칭 1층(하드 필터)과 2층(소프트 감점). 화면과 서버가 같은 규칙을 쓴다.
// 기획서 '매칭 방식과 필터': 모든 조건에 "꼭 / 되도록" 토글이 있고, "꼭"이 하나라도 어긋나면 서로 노출하지 않는다(양방향).

import { isRegionKey, provinceKeys, provinceOf } from "@/lib/regions";

export type Gender = "male" | "female";
export type Religion = "none" | "protestant" | "catholic" | "buddhist" | "other";

export const RELIGIONS: { id: Religion; label: string }[] = [
  { id: "none", label: "무교" },
  { id: "protestant", label: "기독교" },
  { id: "catholic", label: "천주교" },
  { id: "buddhist", label: "불교" },
  { id: "other", label: "기타" },
];
export const RELIGION_LABEL = Object.fromEntries(RELIGIONS.map((r) => [r.id, r.label])) as Record<Religion, string>;
const RELIGION_IDS = new Set<string>(RELIGIONS.map((r) => r.id));
export const isReligion = (v: unknown): v is Religion => typeof v === "string" && RELIGION_IDS.has(v);

export type HeightMode = "any" | "taller" | "shorter" | "range";
export type SmokingMode = "any" | "no_cigarette" | "none_only";
export type ReligionMode = "any" | "same" | "specific";

export type Filters = {
  age: { min: number; max: number; strict: boolean };
  regions: { list: string[]; strict: boolean };
  height: { mode: HeightMode; min: number; max: number; strict: boolean };
  smoking: { mode: SmokingMode; strict: boolean };
  /** 결혼·자녀 생각이 정반대(원함 vs 원하지 않음)인 상대 */
  family: { strict: boolean };
  religion: { mode: ReligionMode; list: Religion[]; strict: boolean };
};

export type FilterKey = keyof Filters;

/** 매칭 판단에 필요한 한 사람의 정보 */
export type MatchPerson = {
  id: string;
  gender: Gender;
  birthYear: number;
  region: string;
  height: number;
  religion: Religion | null;
  /** 검사 D3: none | ecig | yes */
  smoking: string;
  /** 검사 D1, D2: yes | unsure | no */
  marriage: string;
  children: string;
  filters: Filters;
};

export const MIN_AGE = 19;
export const MAX_AGE = 70;
export const MIN_HEIGHT = 130;
export const MAX_HEIGHT = 230;
/** 자기보고 키는 올려 적는 경향이 있어 경계값에 여유를 둔다 */
export const HEIGHT_TOLERANCE = 2;
/** "되도록" 조건 하나가 어긋날 때마다 곱하는 값 */
export const SOFT_MISS_FACTOR = 0.85;

/** 연 나이 (올해 − 출생연도). 출생연도만 받으므로 만 나이 대신 이걸 쓴다 */
export const ageOf = (birthYear: number, year: number) => year - birthYear;

export function defaultFilters(me: { birthYear: number; region: string }, year: number): Filters {
  const age = ageOf(me.birthYear, year);
  return {
    age: { min: Math.max(MIN_AGE, age - 5), max: Math.min(MAX_AGE, age + 5), strict: true },
    regions: { list: provinceKeys(provinceOf(me.region)), strict: true },
    height: { mode: "any", min: 150, max: 190, strict: false },
    smoking: { mode: "any", strict: true },
    family: { strict: true },
    religion: { mode: "any", list: [], strict: true },
  };
}

const clash = (x: string, y: string) => (x === "yes" && y === "no") || (x === "no" && y === "yes");

/** viewer의 조건 하나를 candidate가 만족하는지. "상관없음"은 항상 만족 */
export function meets(key: FilterKey, viewer: MatchPerson, cand: MatchPerson, year: number): boolean {
  const f = viewer.filters;
  switch (key) {
    case "age": {
      const a = ageOf(cand.birthYear, year);
      return a >= f.age.min && a <= f.age.max;
    }
    case "regions":
      return f.regions.list.includes(cand.region);
    case "height":
      if (f.height.mode === "any") return true;
      if (f.height.mode === "taller") return cand.height > viewer.height - HEIGHT_TOLERANCE;
      if (f.height.mode === "shorter") return cand.height < viewer.height + HEIGHT_TOLERANCE;
      return cand.height >= f.height.min - HEIGHT_TOLERANCE && cand.height <= f.height.max + HEIGHT_TOLERANCE;
    case "smoking":
      if (f.smoking.mode === "any") return true;
      if (f.smoking.mode === "no_cigarette") return cand.smoking !== "yes";
      return cand.smoking === "none";
    case "family":
      return !clash(viewer.marriage, cand.marriage) && !clash(viewer.children, cand.children);
    case "religion":
      if (f.religion.mode === "any") return true;
      // 종교를 입력하지 않은 사람은 종교 조건을 건 사람에게 보이지 않는다
      if (cand.religion === null) return false;
      if (f.religion.mode === "same") return cand.religion === viewer.religion;
      return f.religion.list.includes(cand.religion);
  }
}

/** "상관없음"이면 조건이 없는 것으로 본다 (감점도 없음) */
function isActive(key: FilterKey, f: Filters): boolean {
  if (key === "height") return f.height.mode !== "any";
  if (key === "smoking") return f.smoking.mode !== "any";
  if (key === "religion") return f.religion.mode !== "any";
  return true;
}

const KEYS: FilterKey[] = ["age", "regions", "height", "smoking", "family", "religion"];

export type OneWay = { blocked: boolean; softMisses: number; failed: FilterKey[] };

/** 한 방향 검사: viewer의 조건으로 candidate를 본다 */
export function checkOneWay(viewer: MatchPerson, cand: MatchPerson, year: number): OneWay {
  const failed: FilterKey[] = [];
  let blocked = false;
  let softMisses = 0;
  for (const key of KEYS) {
    if (!isActive(key, viewer.filters)) continue;
    if (meets(key, viewer, cand, year)) continue;
    failed.push(key);
    if (viewer.filters[key].strict) blocked = true;
    else softMisses += 1;
  }
  return { blocked, softMisses, failed };
}

/** 양방향 검사. 둘 다 "꼭" 조건을 통과해야 서로에게 노출된다 */
export function checkMutual(a: MatchPerson, b: MatchPerson, year: number): { ok: boolean; softFactor: number } {
  if (a.id === b.id || a.gender === b.gender) return { ok: false, softFactor: 0 };
  const ab = checkOneWay(a, b, year);
  if (ab.blocked) return { ok: false, softFactor: 0 };
  const ba = checkOneWay(b, a, year);
  if (ba.blocked) return { ok: false, softFactor: 0 };
  return { ok: true, softFactor: SOFT_MISS_FACTOR ** (ab.softMisses + ba.softMisses) };
}

// ---------------------------------------------------------------------------
// 서버에서 입력값 검증
// ---------------------------------------------------------------------------

const int = (v: unknown) => (typeof v === "number" && Number.isInteger(v) ? v : NaN);
const bool = (v: unknown) => v === true;

/** 사용자가 보낸 조건을 검증해 정리한다. 잘못되면 사용자에게 보여줄 문장을 돌려준다 */
export function sanitizeFilters(input: unknown, me: { religion: Religion | null }): Filters | { error: string } {
  if (!input || typeof input !== "object") return { error: "조건을 다시 확인해주세요." };
  const raw = input as Record<string, Record<string, unknown>>;

  const ageMin = int(raw.age?.min);
  const ageMax = int(raw.age?.max);
  if (!(ageMin >= MIN_AGE && ageMax <= MAX_AGE && ageMin <= ageMax)) return { error: "나이 범위를 확인해주세요." };

  const list = Array.isArray(raw.regions?.list) ? [...new Set(raw.regions.list as unknown[])].filter(isRegionKey) : [];
  if (list.length === 0) return { error: "만날 수 있는 지역을 하나 이상 골라주세요." };

  const heightMode = raw.height?.mode;
  if (heightMode !== "any" && heightMode !== "taller" && heightMode !== "shorter" && heightMode !== "range") {
    return { error: "키 조건을 확인해주세요." };
  }
  let hMin = int(raw.height?.min);
  let hMax = int(raw.height?.max);
  if (heightMode === "range") {
    if (!(hMin >= MIN_HEIGHT && hMax <= MAX_HEIGHT && hMin <= hMax)) return { error: "키 범위를 확인해주세요." };
  } else {
    hMin = 150;
    hMax = 190;
  }

  const smokingMode = raw.smoking?.mode;
  if (smokingMode !== "any" && smokingMode !== "no_cigarette" && smokingMode !== "none_only") {
    return { error: "흡연 조건을 확인해주세요." };
  }

  const religionMode = raw.religion?.mode;
  if (religionMode !== "any" && religionMode !== "same" && religionMode !== "specific") {
    return { error: "종교 조건을 확인해주세요." };
  }
  const religionList = Array.isArray(raw.religion?.list) ? [...new Set(raw.religion.list as unknown[])].filter(isReligion) : [];
  if (religionMode !== "any" && me.religion === null) {
    return { error: "종교 조건을 걸려면 내 정보에서 내 종교를 먼저 입력해주세요." };
  }
  if (religionMode === "specific" && religionList.length === 0) return { error: "만나고 싶은 종교를 하나 이상 골라주세요." };

  return {
    age: { min: ageMin, max: ageMax, strict: bool(raw.age?.strict) },
    regions: { list, strict: bool(raw.regions?.strict) },
    height: { mode: heightMode, min: hMin, max: hMax, strict: bool(raw.height?.strict) },
    smoking: { mode: smokingMode, strict: bool(raw.smoking?.strict) },
    family: { strict: bool(raw.family?.strict) },
    religion: { mode: religionMode, list: religionMode === "specific" ? religionList : [], strict: bool(raw.religion?.strict) },
  };
}

// ---------------------------------------------------------------------------
// 자기소개 검증: 연락처는 서로 수락한 뒤에만 공개되므로 자기소개에 적지 못하게 한다
// ---------------------------------------------------------------------------

export const INTRO_MAX = 300;

const CONTACT_PATTERNS: RegExp[] = [
  /@[a-z0-9._]{2,}/i, // @아이디
  /(인스타|insta|ig\s*:|카톡|카카오|kakao|오픈\s*채팅|open\.kakao|텔레그램|telegram|라인\s*아이디)/i,
  /(https?:\/\/|www\.|\.com\b|\.kr\b|\.me\b)/i,
  /01[016789][\s.-]?\d{3,4}[\s.-]?\d{4}/, // 휴대폰 번호
];

export function checkIntro(intro: string): string | null {
  if (intro.length > INTRO_MAX) return `자기소개는 ${INTRO_MAX}자까지 쓸 수 있어요.`;
  if (CONTACT_PATTERNS.some((re) => re.test(intro))) {
    return "자기소개에는 연락처나 SNS 아이디를 적을 수 없어요. 연락처는 서로 수락한 뒤에 공개돼요.";
  }
  return null;
}
