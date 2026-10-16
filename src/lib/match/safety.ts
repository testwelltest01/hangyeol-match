export type ReportReason =
  | "inappropriate_photo"
  | "fake_profile"
  | "rude"
  | "money"
  | "minor"
  | "contact_not_found"
  | "other";

export const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: "inappropriate_photo", label: "부적절한 사진이에요" },
  { id: "fake_profile", label: "사진이나 정보가 실제와 달라요" },
  { id: "rude", label: "불쾌한 말이나 행동을 했어요" },
  { id: "money", label: "돈을 요구하거나 홍보·영업을 해요" },
  { id: "minor", label: "미성년자로 보여요" },
  { id: "other", label: "기타" },
];

export const FIRST_MEETING_GUIDE = [
  "첫 만남은 카페나 식당처럼 사람이 많은 곳에서, 낮 시간에 잡아주세요.",
  "만나는 장소와 시간을 가까운 사람에게 미리 알려두세요.",
  "돈을 빌려달라거나 투자를 권하면 바로 신고해주세요.",
  "불편하면 언제든 자리를 떠나도 괜찮아요.",
];
