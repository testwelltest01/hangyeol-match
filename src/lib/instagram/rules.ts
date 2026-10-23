// 인스타그램 계정 확인 (선택). 순수 함수: 화면·서버·테스트가 같이 쓴다.
//
// 인스타 API는 회원이 먼저 메시지를 보낸 뒤에만 답장할 수 있다(24시간 안). 그래서 순서는
//   회원이 한결 공식 인스타에 DM으로 '인증'을 보냄 → 웹훅이 6자리 코드를 답장 → 회원이 연락처 화면에 코드를 넣음
// 이고, 서버는 DM을 보낸 계정의 실제 아이디를 메타에서 받아 연락처의 인스타 아이디로 쓴다(오타·남의 아이디가 들어갈 수 없다).

/** 코드 자릿수 (CodeBoxes와 같다) */
export const IG_CODE_LENGTH = 6;
/** 코드 유효 시간 */
export const IG_CODE_TTL_MINUTES = 10;
/** 한결 화면의 '인스타 열기' 링크에 붙이는 표시. 이 링크로 대화창을 열면 글을 쓰지 않아도 코드를 보낸다 */
export const IG_VERIFY_REF = "hg-verify";

export const isIgCode = (v: unknown): v is string => typeof v === "string" && new RegExp(`^[0-9]{${IG_CODE_LENGTH}}$`).test(v);

/** 공식 계정 아이디 정리 (환경 변수 NEXT_PUBLIC_INSTAGRAM_USERNAME). 이상하면 null → 화면에 확인 칸을 띄우지 않는다 */
export function officialUsername(raw: string | undefined): string | null {
  const v = (raw ?? "").trim().replace(/^@/, "").toLowerCase();
  return /^[a-z0-9._]{1,30}$/.test(v) ? v : null;
}

/** 한결 공식 인스타와의 DM 창을 여는 주소 (ig.me 링크, ref는 웹훅에 그대로 온다) */
export function dmLink(username: string): string {
  return `https://ig.me/m/${encodeURIComponent(username)}?ref=${IG_VERIFY_REF}`;
}

/** 코드를 달라는 메시지인지. 공식 계정에 오는 다른 문의에는 봇이 끼어들지 않는다 */
export function isVerifyText(text: unknown): boolean {
  return typeof text === "string" && /인증|코드|확인|verify|code/i.test(text);
}

/** 봇이 보내는 답장 (UTF-8 1000바이트 이하) */
export function codeReply(code: string): string {
  return [
    `한결 인스타 확인 코드: ${code}`,
    "",
    `${IG_CODE_TTL_MINUTES}분 안에 한결 '연락처' 화면에 넣어주세요.`,
    "이 코드는 다른 사람에게 알려주지 마세요. 한결은 DM으로 코드를 되묻지 않아요.",
  ].join("\n");
}

export type VerifyRequest = { senderId: string; mid: string | null };

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 && v.length <= 200 ? v : null);

/**
 * 웹훅 알림에서 코드를 보내야 할 요청을 고른다.
 * - 회원이 보낸 메시지 중 '인증'·'코드' 같은 글이거나, 한결 화면의 링크(ref)로 대화창을 연 경우
 * - 한결 계정이 보낸 메시지(is_echo, 보낸 사람 = 계정 자신)는 뺀다
 * - 한 알림 안에서 같은 사람은 한 번만
 */
export function verifyRequests(payload: unknown): VerifyRequest[] {
  const root = obj(payload);
  if (!root || root.object !== "instagram" || !Array.isArray(root.entry)) return [];
  const out: VerifyRequest[] = [];
  const seen = new Set<string>();
  for (const e of root.entry) {
    const entry = obj(e);
    if (!entry || !Array.isArray(entry.messaging)) continue;
    const accountId = str(entry.id);
    for (const m of entry.messaging) {
      const ev = obj(m);
      if (!ev) continue;
      const senderId = str(obj(ev.sender)?.id);
      if (!senderId || senderId === accountId) continue;
      const message = obj(ev.message);
      if (message?.is_echo === true) continue;
      const referral = obj(ev.referral) ?? obj(message?.referral) ?? obj(obj(ev.postback)?.referral);
      const fromLink = referral?.ref === IG_VERIFY_REF;
      if (!fromLink && !isVerifyText(message?.text)) continue;
      if (seen.has(senderId)) continue;
      seen.add(senderId);
      out.push({ senderId, mid: str(message?.mid) });
    }
  }
  return out;
}
