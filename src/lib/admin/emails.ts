import "server-only";

/**
 * 관리자 이메일. Vercel 환경 변수 ADMIN_EMAILS(쉼표로 여러 개)가 있으면 그것을 쓴다.
 * 이메일은 가입할 때 메일로 받은 코드로 주인임을 확인했고, 바꾸려면 새 주소에서 다시 확인해야 한다.
 */
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "testwelltest01@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: unknown): boolean {
  return typeof email === "string" && ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
