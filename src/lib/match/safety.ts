// 신고·정지 규칙과 안전 안내 (순수: 화면·서버 액션·테스트가 같이 쓴다)

export type ReportReason =
  | "rude"
  | "sexual"
  | "persistent"
  | "threat"
  | "money"
  | "spam"
  | "married"
  | "fake_profile"
  | "inappropriate_photo"
  | "minor"
  | "contact_not_found"
  | "other";

/** 신고 화면에 보이는 사유 (contact_not_found는 연락처 칸의 '아이디로 찾을 수 없어요' 버튼이 따로 보낸다) */
export const REPORT_REASONS: { id: Exclude<ReportReason, "contact_not_found">; label: string }[] = [
  { id: "rude", label: "욕설이나 모욕 같은 불쾌한 말을 했어요" },
  { id: "sexual", label: "성적인 말이나 사진을 보냈어요" },
  { id: "persistent", label: "그만하자고 했는데 계속 연락해요" },
  { id: "threat", label: "위협하거나 겁을 줬어요" },
  { id: "money", label: "돈을 빌려달라거나 투자를 권해요" },
  { id: "spam", label: "홍보나 영업을 해요" },
  { id: "married", label: "결혼했거나 사귀는 사람이 있어요" },
  { id: "fake_profile", label: "사진이나 정보가 실제와 달라요" },
  { id: "inappropriate_photo", label: "부적절한 사진이에요" },
  { id: "minor", label: "미성년자로 보여요" },
  { id: "other", label: "기타" },
];

export const isReportReason = (v: unknown): v is ReportReason =>
  v === "contact_not_found" || REPORT_REASONS.some((r) => r.id === v);

/**
 * 심한 신고: 서로 관심을 보낸 뒤(사진·대화로 실제로 마주친 뒤)라면 한 건으로도 바로 매칭을 멈추고 운영자가 확인한다.
 * 추천 카드만 본 사이에서는 한 사람이 남을 멈출 수 없게 다른 사유처럼 센다
 */
export const SEVERE_REPORT_REASONS: ReadonlySet<ReportReason> = new Set<ReportReason>(["sexual", "threat", "money", "minor"]);

/** 그 밖의 신고는 서로 다른 사람 몇 명이 신고하면(운영자가 확인하지 않은 것만) 매칭을 멈추는지 */
export const AUTO_SUSPEND_REPORTERS = 2;

/**
 * 이번 신고 뒤에 자동으로 정지할지. 정지하면 user_flags.reason에 남길 글, 아니면 null.
 * reporters = 이번 신고를 포함해 확인 전 신고를 한 서로 다른 사람 수 ('아이디로 찾을 수 없어요' 제외)
 */
export function autoSuspension(input: { reason: ReportReason; mutual: boolean; reporters: number }): string | null {
  if (input.reason === "contact_not_found") return null;
  if (input.mutual && SEVERE_REPORT_REASONS.has(input.reason)) {
    const label = REPORT_REASONS.find((r) => r.id === input.reason)?.label ?? input.reason;
    return `자동: 심한 신고 (${label})`;
  }
  if (input.reporters >= AUTO_SUSPEND_REPORTERS) return `자동: 신고 ${input.reporters}명`;
  return null;
}

/** 정지·재가입 제한 문의 주소 (처리방침의 개인정보 보호책임자) */
export const SUPPORT_EMAIL = "testwelltest01@gmail.com";

/** 정지된 사람에게 보이는 안내 (오늘 탭·내 정보) */
export function suspendedNotice(rejoinBlocked: boolean): string {
  return rejoinBlocked
    ? `예전에 이용이 정지된 기록이 있어 지금은 매칭을 이용할 수 없어요. 잘못된 것 같으면 ${SUPPORT_EMAIL}로 알려주세요.`
    : "신고가 접수되어 매칭이 잠시 멈춰 있어요. 운영자가 확인한 뒤 다시 열려요.";
}

export const FIRST_MEETING_GUIDE = [
  "첫 만남은 카페나 식당처럼 사람이 많은 곳에서, 낮 시간에 잡아주세요.",
  "만나는 장소와 시간을 가까운 사람에게 미리 알려두세요.",
  "돈을 빌려달라거나 투자를 권하면 바로 신고해주세요.",
  "불편하면 언제든 자리를 떠나도 괜찮아요.",
];
