// 브라우저에 Supabase 로그인 쿠키가 있는지 (화면 이동 안내용 힌트일 뿐, 권한 확인이 아니다. 진짜 확인은 서버의 /start가 한다)
// 쿠키 이름은 @supabase/ssr 기본값 sb-<프로젝트>-auth-token (길면 .0, .1로 나뉜다). 기본 설정이라 브라우저에서 읽힌다
export function hasAuthCookie(cookie: string): boolean {
  return /(?:^|;\s*)sb-[^=;]+-auth-token(?:\.\d+)?=[^;]+/.test(cookie);
}
