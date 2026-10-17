// 비밀번호 규칙 (화면 안내와 검사). Supabase 대시보드의 비밀번호 규칙도 같게 맞춘다: 8자 이상, 영문과 숫자.

export const PASSWORD_MIN = 8;

export function checkPassword(pw: string): string | null {
  if (pw.length < PASSWORD_MIN) return `비밀번호는 ${PASSWORD_MIN}자 이상으로 정해주세요.`;
  if (pw.length > 72) return "비밀번호는 72자까지 쓸 수 있어요.";
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return "영문과 숫자를 모두 넣어주세요.";
  return null;
}
