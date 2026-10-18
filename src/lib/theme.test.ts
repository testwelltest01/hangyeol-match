import { describe, expect, it } from "vitest";
import { isThemedPath, THEME_BOOT_SCRIPT, themeFor } from "./theme";

describe("theme", () => {
  it("남자는 하늘, 여자는 분홍, 모르면 기본", () => {
    expect(themeFor("male")).toBe("sky");
    expect(themeFor("female")).toBe("pink");
    expect(themeFor(null)).toBeNull();
    expect(themeFor(undefined)).toBeNull();
  });

  it("관리자 화면에는 테마를 붙이지 않는다", () => {
    expect(isThemedPath("/match")).toBe(true);
    expect(isThemedPath("/administrator-letter")).toBe(true);
    expect(isThemedPath("/admin")).toBe(false);
    expect(isThemedPath("/admin/users/1")).toBe(false);
  });

  function boot(stored: string | null, pathname: string) {
    const attrs: Record<string, string> = {};
    const env = {
      localStorage: { getItem: () => stored },
      location: { pathname },
      document: { documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = v) } },
    };
    new Function("localStorage", "location", "document", THEME_BOOT_SCRIPT)(env.localStorage, env.location, env.document);
    return attrs["data-theme"];
  }

  it("머리 스크립트는 기억한 테마를 붙이고, 이상한 값·관리자 화면은 건너뛴다", () => {
    expect(boot("pink", "/match")).toBe("pink");
    expect(boot("sky", "/me")).toBe("sky");
    expect(boot("red", "/match")).toBeUndefined();
    expect(boot(null, "/match")).toBeUndefined();
    expect(boot("pink", "/admin/users")).toBeUndefined();
  });

  it("저장소를 못 써도 스크립트가 멈추지 않는다", () => {
    expect(() =>
      new Function("localStorage", "location", "document", THEME_BOOT_SCRIPT)(
        { getItem: () => { throw new Error("blocked"); } },
        { pathname: "/" },
        {},
      ),
    ).not.toThrow();
  });
});
