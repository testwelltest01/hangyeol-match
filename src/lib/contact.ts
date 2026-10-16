// 연락처 입력값 정리·검증 (화면과 서버 공통)

/** 인스타그램 사용자 이름: 영문, 숫자, 마침표, 밑줄 1~30자. 앞의 @와 주소는 떼어낸다 */
export function normalizeInstagram(input: string): string | null {
  let v = input.trim();
  v = v.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/[/?#].*$/, "");
  v = v.replace(/^@/, "").toLowerCase();
  if (v === "") return "";
  return /^[a-z0-9._]{1,30}$/.test(v) && !v.startsWith(".") && !v.endsWith(".") ? v : null;
}

/** 카카오톡 ID: 영문, 숫자, 마침표, 밑줄, 하이픈 4~20자 */
export function normalizeKakao(input: string): string | null {
  const v = input.trim().replace(/^@/, "").toLowerCase();
  if (v === "") return "";
  return /^[a-z0-9._-]{4,20}$/.test(v) ? v : null;
}
