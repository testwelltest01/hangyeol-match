// 비회원 연애 상황 검사에서 브라우저 쪽도 쓰는 값 (node:crypto를 쓰는 guest.ts와 나눠 둔다)

/** 옮기지 않은(가입하지 않은) 비회원 검사를 지우기까지의 날수 */
export const GUEST_KEEP_DAYS = 30;
/** 이 기기에서 한 비회원 검사의 열쇠 (다시 들어오면 '내 보고서 다시 보기') */
export const GUEST_LOCAL_KEY = "hg-love-guest";
