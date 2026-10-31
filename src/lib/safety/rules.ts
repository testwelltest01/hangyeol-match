// 재가입 제한의 숫자·이름 (암호 모듈 없이 화면에서도 쓸 수 있게 identity.ts와 나눴다)

/** 정지된 채 계정이 지워진 뒤 재가입 제한 기록을 남겨두는 기간 (처리방침과 같게) */
export const BAN_KEEP_DAYS = 365 * 3;

/** 재가입 제한으로 정지할 때 user_flags.reason에 쓰는 값 (화면 안내를 고르는 데도 쓴다) */
export const REJOIN_REASON = "재가입 제한";

/** 정지된 채 지워진 계정의 기록을 언제 지울지 */
export function banExpiry(deletedAt: Date): Date {
  return new Date(deletedAt.getTime() + BAN_KEEP_DAYS * 86_400_000);
}
