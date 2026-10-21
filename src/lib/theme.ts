// 성별 테마: 남자는 하늘, 여자는 분홍(앱 아이콘의 두 물결 색). 성별을 모르면(로그인 전·처음 정보 전) 기본 쪽빛.
// 로그인·가입하는 순간 기기에 남은 이전 계정의 테마를 지우고(forgetTheme), 검사 화면부터 내 성별로 다시 맞춘다.
// <html data-theme>을 바꾸면 globals.css의 강조색·버튼색이 바뀐다. 관리자 화면은 차트가 쪽빛=남성이라 테마를 쓰지 않는다.
// 기기에 기억해 두고(localStorage) 페이지를 그리기 전에 붙여서 색이 깜빡이지 않게 한다.

export type Theme = "sky" | "pink";

export const THEME_KEY = "hg-theme";

export function themeFor(gender: string | null | undefined): Theme | null {
  if (gender === "male") return "sky";
  if (gender === "female") return "pink";
  return null;
}

/**
 * 로그인 전 화면: 기기에 남은 테마(예: 로그아웃하지 않은 이전 계정의 색)와 상관없이 늘 기본 쪽빛.
 * 성별을 아는 건 로그인하고 처음 정보를 넣은 뒤다
 */
export const NEUTRAL_PATHS = ["/", "/signup", "/login", "/reset"];

export function isThemedPath(pathname: string): boolean {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return false;
  return !NEUTRAL_PATHS.includes(pathname);
}

/** 루트 레이아웃 <head>에 넣는 짧은 스크립트: 기억해 둔 테마를 첫 그림 전에 붙인다 (관리자·로그인 전 화면 제외) */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}"),p=location.pathname,n=${JSON.stringify(NEUTRAL_PATHS)};if((t==="sky"||t==="pink")&&n.indexOf(p)<0&&p!=="/admin"&&p.indexOf("/admin/")!==0)document.documentElement.setAttribute("data-theme",t)}catch(e){}`;
