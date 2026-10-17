// 관리자 화면과 엑셀에서 같이 쓰는 이름표

export const REPORT_REASON_LABEL: Record<string, string> = {
  inappropriate_photo: "부적절한 사진",
  fake_profile: "사진·정보가 실제와 다름",
  rude: "불쾌한 말이나 행동",
  money: "돈 요구·홍보·영업",
  minor: "미성년자로 보임",
  contact_not_found: "ID로 찾을 수 없음",
  other: "기타",
};

export const OUTCOME_LABEL: Record<string, string> = {
  met: "만났어요",
  not_yet: "아직 못 만났어요",
  no_contact: "연락이 닿지 않았어요",
  no_show: "약속에 나오지 않았어요",
};
