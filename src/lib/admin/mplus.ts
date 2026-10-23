// Mplus로 같은 LPA를 다시 돌려볼 수 있게 데이터(.dat)와 입력 파일(.inp)을 만든다.
// Mplus 입력은 영문(ASCII)만, 한 줄 90자 이하로 쓴다.
import type { LoveSampleOptions } from "@/lib/admin/loveSample";
import type { LpaModel } from "@/lib/admin/lpa";
import type { LpaSet } from "@/lib/admin/lpaSets";
import type { GenderKey } from "@/lib/admin/trends";

const GENDER_CODE: Record<GenderKey, number> = { male: 1, female: 2, unknown: 0 };

/** 파일 이름. 연애 상황 검사는 고른 표본(첫/최근 검사, 회원만)을 이름에 붙인다 */
export const mplusFileBase = (set: LpaSet, love?: LoveSampleOptions) =>
  `hangyeol_lpa_${set.id}${set.source === "love" && love ? `_${love.attempt}${love.guests ? "" : "_members"}` : ""}`;

/** 공백으로 나눈 숫자 데이터: 행번호 성별 지표들 */
export function buildMplusData(rows: { gender: GenderKey; x: number[] }[]): string {
  return rows
    .map((r, i) => [i + 1, GENDER_CODE[r.gender], ...r.x.map((v) => (Number.isInteger(v) ? String(v) : v.toFixed(4)))].join(" "))
    .join("\n")
    .concat("\n");
}

/** 행번호와 사용자ID 대응표 (엑셀에서 한글이 깨지지 않게 BOM을 붙인다) */
export function buildIdMap(rows: { userId: string; gender: GenderKey }[]): string {
  const g = { male: "남", female: "여", unknown: "" } as const;
  return "﻿row,user_id,gender\n" + rows.map((r, i) => `${i + 1},${r.userId},${g[r.gender]}`).join("\n") + "\n";
}

/** 이름들을 90자 안에서 줄을 나눈다 */
function wrap(prefix: string, names: string[], indent = "    "): string[] {
  const lines: string[] = [];
  let line = prefix;
  for (const n of names) {
    if ((line + " " + n).length > 86) {
      lines.push(line);
      line = indent + n;
    } else line = line === prefix ? `${prefix} ${n}` : `${line} ${n}`;
  }
  lines.push(line + ";");
  return lines;
}

export function buildMplusInput({
  set,
  k,
  model,
  n,
  stamp,
  love,
}: {
  set: LpaSet;
  k: number;
  model: LpaModel;
  n: number;
  stamp: string;
  love?: LoveSampleOptions;
}): string {
  const vars = set.indicators.map((i) => i.mplus);
  const base = mplusFileBase(set, love);
  const lines: string[] = [
    `TITLE: Hangyeol LPA - ${set.id}, ${k} classes (${model === "equal" ? "equal" : "class-varying"} variances)`,
    `  n = ${n}, exported ${stamp} KST`,
    "",
    "DATA:",
    `  FILE = ${base}.dat;`,
    "",
    "VARIABLE:",
    ...wrap("  NAMES = id gender", vars),
    ...wrap("  USEVARIABLES =", vars),
    "  IDVARIABLE = id;",
    set.source === "love" ? "  AUXILIARY = gender;   ! 1 = male, 2 = female, 0 = unknown (guest)" : "  AUXILIARY = gender;   ! 1 = male, 2 = female",
    `  CLASSES = c(${k});`,
    "",
    "ANALYSIS:",
    "  TYPE = MIXTURE;",
    "  ESTIMATOR = MLR;",
    "  STARTS = 500 100;",
  ];
  if (k > 1) lines.push("  LRTSTARTS = 0 0 100 20;");
  if (model === "varying") {
    lines.push("", "MODEL:", "  %OVERALL%");
    for (let c = 1; c <= k; c++) {
      lines.push(`  %c#${c}%`);
      lines.push(...wrap("   ", vars, "    ").map((l) => l.replace(/^ {3} /, "    ")));
    }
    lines.push("  ! Listing the indicators in each class frees their variances across classes.");
  }
  lines.push("", "OUTPUT:", k > 1 ? "  SAMPSTAT TECH11 TECH14;" : "  SAMPSTAT;", "");
  lines.push("PLOT:", "  TYPE = PLOT3;", ...wrap("  SERIES =", vars).map((l, i, arr) => (i === arr.length - 1 ? l.replace(/;$/, " (*);") : l)), "");
  lines.push("SAVEDATA:", `  FILE = ${base}_c${k}_cprob.dat;`, "  SAVE = CPROBABILITIES;", "");
  return lines.join("\n");
}
