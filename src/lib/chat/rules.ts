// 대화방 규칙 (서버·화면·테스트 공용)

/** 한 사람이 보낼 수 있는 메시지 수. "서로 50회 미만" */
export const MESSAGES_PER_PERSON = 49;
export const MAX_MESSAGE_CHARS = 500;
/** 마지막 대화 후 이 기간이 지나면 대화 내용을 지운다 (확인 중인 신고가 있으면 남김) */
export const CHAT_BODY_RETENTION_DAYS = 90;

// 연락처는 둘 다 '연락처 전달'을 눌러야 보이게 하려고, 대화창에서 직접 주고받는 것을 막는다.
// "카톡 자주 해요?"처럼 평범한 말은 막지 않도록 아이디·번호·주소 모양만 잡는다.
const CHAT_CONTACT_PATTERNS: RegExp[] = [
  /01[016789][\s.-]?\d{3,4}[\s.-]?\d{4}/, // 휴대폰 번호
  /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i, // 이메일
  /(^|[^a-z0-9])@[a-z0-9._]{2,}/i, // @아이디
  /(https?:\/\/|www\.)/i,
  /\b[a-z0-9-]+\.(com|kr|net|me|io|co|link|ly)\b/i,
  /(카톡|카카오톡|카카오|인스타그램|인스타|insta|instagram|라인|텔레그램|telegram|ig)\s*(아이디|id|계정)/i,
  /(오픈\s*채팅|오픈\s*카톡|open\.kakao)/i,
];

/** 보낼 수 있는 메시지인지. 문제가 있으면 안내 문구 */
export function checkChatMessage(text: string): string | null {
  const t = text.trim();
  if (!t) return "메시지를 입력해주세요.";
  if (t.length > MAX_MESSAGE_CHARS) return `메시지는 ${MAX_MESSAGE_CHARS}자까지 보낼 수 있어요.`;
  if (CHAT_CONTACT_PATTERNS.some((re) => re.test(t))) {
    return "대화창에는 연락처나 SNS 아이디를 쓸 수 없어요. 둘 다 '연락처 전달'을 누르면 서로의 연락처가 보여요.";
  }
  return null;
}

/** 두 사람을 방의 user_a(작은 id), user_b 순서로. DB의 uuid 비교와 같은 순서 */
export function orderPair(x: string, y: string): [string, string] {
  const a = x.toLowerCase();
  const b = y.toLowerCase();
  return a < b ? [a, b] : [b, a];
}
