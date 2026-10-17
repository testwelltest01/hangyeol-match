import { describe, expect, it } from "vitest";
import { findLpaSet } from "./lpaSets";
import { buildIdMap, buildMplusData, buildMplusInput } from "./mplus";

describe("Mplus 파일", () => {
  it("입력 파일은 영문만, 한 줄 90자 이하", () => {
    for (const id of ["bigfive", "importance", "values"]) {
      for (const model of ["equal", "varying"] as const) {
        const inp = buildMplusInput({ set: findLpaSet(id), k: 3, model, n: 120, stamp: "2026-10-17 16:50" });
        for (const line of inp.split("\n")) {
          expect(line.length).toBeLessThanOrEqual(90);
          expect(/^[\x20-\x7E]*$/.test(line)).toBe(true);
        }
        expect(inp).toContain("CLASSES = c(3);");
        expect(inp).toContain(`FILE = hangyeol_lpa_${id}.dat;`);
        expect(inp.includes("%c#3%")).toBe(model === "varying");
      }
    }
  });

  it("24문항은 이름을 여러 줄로 나누고 빠뜨리지 않는다", () => {
    const inp = buildMplusInput({ set: findLpaSet("values"), k: 2, model: "equal", n: 50, stamp: "x" });
    const use = inp.slice(inp.indexOf("USEVARIABLES"), inp.indexOf("IDVARIABLE"));
    for (let i = 1; i <= 24; i++) expect(use).toContain(`V${String(i).padStart(2, "0")}`);
    expect(inp).toContain("SERIES =");
    expect(inp).toMatch(/V24 \(\*\);/);
  });

  it("1개 프로필은 TECH11·14를 빼고, 데이터는 행번호·성별·지표 순서", () => {
    const inp = buildMplusInput({ set: findLpaSet("bigfive"), k: 1, model: "equal", n: 10, stamp: "x" });
    expect(inp).not.toContain("TECH11");
    expect(inp).not.toContain("LRTSTARTS");
    expect(buildMplusData([{ gender: "female", x: [3, 2.5, 4.123456, 1, 5] }])).toBe("1 2 3 2.5000 4.1235 1 5\n");
    expect(buildIdMap([{ userId: "u-1", gender: "male" }])).toBe("﻿row,user_id,gender\n1,u-1,남\n");
  });
});
