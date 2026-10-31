// 관리자 화면과 엑셀에서 같이 쓰는 이름표

export const REPORT_REASON_LABEL: Record<string, string> = {
  rude: "욕설·모욕 등 불쾌한 말",
  sexual: "성적인 말·사진",
  persistent: "그만하자는데 계속 연락",
  threat: "위협",
  money: "돈 요구·투자 권유",
  spam: "홍보·영업",
  married: "기혼·연인 있음",
  inappropriate_photo: "부적절한 사진",
  fake_profile: "사진·정보가 실제와 다름",
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
