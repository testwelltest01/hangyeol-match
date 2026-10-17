// 관리자 엑셀 파일 만들기. DB를 읽지 않아서 가짜 데이터로 테스트할 수 있다.
// 이메일, 연락처(인스타그램·카카오톡), 종교, 사진은 넣지 않는다. 파일이 밖으로 돌아도 피해가 작도록.
import ExcelJS from "exceljs";
import type { MemberRow, ReportRow } from "@/lib/admin/data";
import { REPORT_REASON_LABEL, OUTCOME_LABEL } from "@/lib/admin/labels";
import { STAGE_LABEL, type ReactionRow } from "@/lib/admin/stats";
import {
  ALL_ITEMS,
  DEALBREAKER_ITEMS,
  DOMAINS,
  OBSERVER_ITEMS,
  STEPS,
  TRAITS,
  VALUE_ITEMS,
  type Answers,
  type Item,
} from "@/lib/items";
import { EXTRA_TESTS, type ExtraAnswers, type ExtraScores } from "@/lib/extra/tests";
import { regionLabel } from "@/lib/regions";
import { scoreBigFive, type Scores } from "@/lib/scoring";

export type ExportData = {
  generatedAt: Date;
  members: MemberRow[];
  scores: { user_id: string; version: string; computed_at: string; scores: Scores }[];
  answers: { user_id: string; version: string; completed_at: string | null; answers: Answers }[];
  friendRatings: { id: number; user_id: string; created_at: string; answers: Answers }[];
  reactions: ReactionRow[];
  recommendations: { day: string; user_id: string; target_id: string; score: number }[];
  /** 추천 시트에 담은 기간 (일) */
  recommendationDays: number;
  feedback: {
    from_user: string;
    to_user: string;
    outcome: string;
    photo_match: number | null;
    cleanliness: number | null;
    manners: number | null;
    again: number | null;
    created_at: string;
    updated_at: string;
  }[];
  reports: ReportRow[];
  /** 추가 검사 (0004 SQL 전이면 빈 배열) */
  extras: { user_id: string; test_id: string; version: string; answers: ExtraAnswers; scores: ExtraScores; share: boolean; completed_at: string }[];
};

type Cell = string | number | boolean | Date | null | undefined;

/** ISO 시각을 한국 시각의 엑셀 날짜로. 엑셀 날짜에는 시간대가 없어서 9시간을 더해 적는다 */
const kst = (iso: string | null | undefined): Date | null => (iso ? new Date(new Date(iso).getTime() + 9 * 3600_000) : null);
const yesNo = (v: boolean) => (v ? "예" : "아니요");
const GENDER = { male: "남", female: "여" } as const;

function addSheet(wb: ExcelJS.Workbook, name: string, headers: string[], rows: Cell[][], widths: Record<number, number> = {}) {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.addRow(headers);
  for (const r of rows) ws.addRow(r.map((v) => (v === undefined ? null : v)));
  const head = ws.getRow(1);
  head.font = { bold: true };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE7EBF3" } };
  head.alignment = { vertical: "middle" };
  headers.forEach((h, i) => {
    const col = ws.getColumn(i + 1);
    col.width = widths[i] ?? Math.min(40, Math.max(8, h.length * 1.8 + 2));
    // 날짜 칸 서식
    const sample = rows.find((r) => r[i] instanceof Date)?.[i];
    if (sample instanceof Date) col.numFmt = "yyyy-mm-dd hh:mm";
  });
  if (rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
  return ws;
}

function itemText(item: Item): string {
  switch (item.kind) {
    case "bipolar":
      return `${item.left} ↔ ${item.right}`;
    case "importance":
      return item.text;
    case "single":
      return item.question;
    case "likert":
      return item.text;
  }
}

function itemScale(item: Item): string {
  switch (item.kind) {
    case "bipolar":
      return "1(왼쪽에 매우 가까움) ~ 6(오른쪽에 매우 가까움)";
    case "importance":
      return "1 ~ 4 (다를 때 신경 쓰이는 정도)";
    case "single":
      return item.options.map((o) => `${o.value}=${o.label}`).join(", ");
    case "likert":
      return "1(전혀 아니다) ~ 5(매우 그렇다)";
  }
}

const dealbreakerLabel = (id: "D1" | "D2" | "D3", value: string) =>
  DEALBREAKER_ITEMS.find((i) => i.id === id)?.options.find((o) => o.value === value)?.label ?? value;

export async function buildWorkbook(d: ExportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "한결";
  wb.created = d.generatedAt;

  const nick = new Map(d.members.map((m) => [m.id, m.nickname ?? ""]));
  const nickOf = (id: string | null) => (id ? (nick.get(id) ?? "(탈퇴)") : "(탈퇴)");
  const memberById = new Map(d.members.map((m) => [m.id, m]));

  // 안내
  const info = wb.addWorksheet("안내");
  info.getColumn(1).width = 18;
  info.getColumn(2).width = 90;
  const infoRows: [string, string][] = [
    ["만든 시각", `${kst(d.generatedAt.toISOString())!.toISOString().slice(0, 16).replace("T", " ")} (한국 시간)`],
    ["시간", "모든 날짜·시각은 한국 시간이에요."],
    ["빠진 정보", "이메일, 연락처(인스타그램·카카오톡), 종교, 사진은 넣지 않았어요. 회원을 가리킬 때는 사용자ID를 써주세요."],
    ["주의", "개인정보가 담긴 파일이에요. 분석이 끝나면 지우고, 메신저·메일로 보내거나 공유 폴더에 올리지 말아주세요."],
    ["회원", "가입한 계정 전체와 진행 단계, 관심·연결 수"],
    ["검사 점수", "채점된 점수 (가치관 원점수, 영역 중요도, 조건, 성격 5요인, 위생, 꾸밈)"],
    ["문항 응답", "검사 원자료. 칸 이름은 문항ID이고 뜻은 '문항 목록' 시트에 있어요. 성격 문항은 역채점 전 값이에요."],
    ["문항 목록", "문항ID, 문항 내용, 척도, 역채점 여부"],
    ["친구 평가", "친구가 남긴 '친구가 보는 나' 응답 원자료와 응답 한 건마다의 성격 5요인 점수"],
    ["관심·수락", "누가 누구에게 관심(또는 넘기기)과 수락(또는 거절)을 보냈는지"],
    ["추천", `최근 ${d.recommendationDays}일 동안의 추천 기록`],
    ["만남 피드백", "연락처 공개 뒤 남긴 만남 결과와 1~5점 평가 (상대에게는 보이지 않음)"],
    ["신고", "신고 기록과 확인 완료 시각"],
    ["추가 · …", "한결 시범 검사(선택) 응답 원자료와 하위척도 평균. 역문항은 응답 칸에는 원래 값, 점수에는 뒤집은 값이 들어가요."],
  ];
  for (const [k, v] of infoRows) {
    const row = info.addRow([k, v]);
    row.getCell(1).font = { bold: true };
    row.getCell(2).alignment = { wrapText: true, vertical: "top" };
  }

  addSheet(
    wb,
    "회원",
    [
      "사용자ID", "닉네임", "성별", "출생연도", "가입", "최근 로그인", "단계", "지역", "키",
      "검사 버전", "검사 완료", "친구 평가 수", "사진 수", "연락처 등록", "매칭 쉬기", "이용 정지", "정지 사유",
      "보낸 관심", "받은 관심", "서로 관심", "연결", "관리자",
    ],
    d.members.map((m) => [
      m.id, m.nickname, m.gender ? GENDER[m.gender] : null, m.birthYear, kst(m.createdAt), kst(m.lastSignInAt), STAGE_LABEL[m.stage],
      m.region ? regionLabel(m.region) : null, m.height, m.testVersion, kst(m.scoredAt), m.friendCount, m.photoCount,
      yesNo(m.hasContact), yesNo(m.paused), yesNo(m.suspended), m.suspendReason,
      m.sentInterest, m.receivedInterest, m.mutual, m.connected, yesNo(m.isAdmin),
    ]),
    { 0: 38, 4: 17, 5: 17, 7: 20, 10: 17 },
  );

  const valueIds = VALUE_ITEMS.map((v) => v.id);
  addSheet(
    wb,
    "검사 점수",
    [
      "사용자ID", "닉네임", "성별", "출생연도", "검사 버전", "검사 완료",
      ...valueIds,
      ...DOMAINS.map((x) => `중요도_${x.label}`),
      "결혼 의사", "자녀 계획", "흡연",
      ...TRAITS.map((t) => t.label),
      "위생(0~18)", "꾸밈_본인(1~4)", "꾸밈_원함(1~4)", "꾸밈_중요도(1~4)",
    ],
    d.scores.map((s) => {
      const m = memberById.get(s.user_id);
      const sc = s.scores;
      return [
        s.user_id, m?.nickname, m?.gender ? GENDER[m.gender] : null, m?.birthYear, s.version, kst(s.computed_at),
        ...valueIds.map((id) => sc.values.items[id]),
        ...DOMAINS.map((x) => sc.values.importance[x.id]),
        dealbreakerLabel("D1", sc.dealbreakers.marriage), dealbreakerLabel("D2", sc.dealbreakers.children), dealbreakerLabel("D3", sc.dealbreakers.smoking),
        ...TRAITS.map((t) => sc.bigFive[t.id]),
        sc.hygiene, sc.grooming.self, sc.grooming.preferred, sc.grooming.importance,
      ];
    }),
    { 0: 38, 5: 17 },
  );

  const itemIds = ALL_ITEMS.map((i) => i.id);
  addSheet(
    wb,
    "문항 응답",
    ["사용자ID", "성별", "검사 버전", "완료", ...itemIds],
    d.answers.map((a) => {
      const m = memberById.get(a.user_id);
      return [a.user_id, m?.gender ? GENDER[m.gender] : null, a.version, kst(a.completed_at), ...itemIds.map((id) => a.answers[id] ?? null)];
    }),
    { 0: 38, 3: 17 },
  );

  const stepOf = new Map(STEPS.flatMap((s) => s.items.map((i) => [i.id, s.title] as const)));
  const traitLabel = new Map(TRAITS.map((t) => [t.id, t.label]));
  const domainLabel = new Map<string, string>([...DOMAINS.map((x) => [x.id, x.label] as [string, string]), ["grooming", "꾸밈"]]);
  const extraItemRows: Cell[][] = EXTRA_TESTS.flatMap((t) =>
    t.items.map((i) => [
      i.id,
      `추가 · ${t.title}`,
      i.options ? "선택" : "리커트 5점",
      i.text,
      (i.options ?? t.likert).map((o) => `${o.value}=${o.label}`).join(", "),
      t.scales.find((sc) => sc.id === i.scale)?.label ?? null,
      i.scale ? yesNo(Boolean(i.reverse)) : null,
      null,
      null,
    ]),
  );
  addSheet(
    wb,
    "문항 목록",
    ["문항ID", "단계", "종류", "문항", "척도·보기", "영역·특성", "역채점", "대상 성별", "친구 평가 문장"],
    [...ALL_ITEMS.map((i): Cell[] => [
      i.id,
      stepOf.get(i.id),
      { bipolar: "양극 6점", importance: "중요도 4점", single: "선택", likert: "리커트 5점" }[i.kind],
      itemText(i),
      itemScale(i),
      i.kind === "likert" ? traitLabel.get(i.trait) : i.kind === "bipolar" || i.kind === "importance" ? domainLabel.get(i.domain) : null,
      i.kind === "likert" ? yesNo(i.reverse) : null,
      i.kind === "single" && i.gender ? GENDER[i.gender] : null,
      i.kind === "likert" ? (i.observerText ?? null) : null,
    ]), ...extraItemRows],
    { 3: 60, 4: 50, 8: 50 },
  );

  const observerIds = OBSERVER_ITEMS.map((i) => i.id);
  addSheet(
    wb,
    "친구 평가",
    ["평가ID", "대상 사용자ID", "대상 닉네임", "평가일", ...observerIds, ...TRAITS.map((t) => t.label)],
    d.friendRatings.map((r) => {
      const big = scoreBigFive(r.answers, OBSERVER_ITEMS);
      return [
        r.id, r.user_id, nickOf(r.user_id), kst(r.created_at),
        ...observerIds.map((id) => r.answers[id] ?? null),
        ...TRAITS.map((t) => (Number.isNaN(big[t.id]) ? null : big[t.id])),
      ];
    }),
    { 1: 38, 3: 17 },
  );

  addSheet(
    wb,
    "관심·수락",
    ["보낸 사람ID", "보낸 사람", "받은 사람ID", "받은 사람", "관심", "관심 시각", "수락", "수락 시각"],
    d.reactions.map((r) => [
      r.from_user, nickOf(r.from_user), r.to_user, nickOf(r.to_user),
      r.interest ? "관심" : "넘김", kst(r.interest_at),
      r.accept === null ? null : r.accept ? "수락" : "거절", kst(r.accept_at),
    ]),
    { 0: 38, 2: 38, 5: 17, 7: 17 },
  );

  addSheet(
    wb,
    "추천",
    ["날짜", "받은 사람ID", "받은 사람", "추천된 사람ID", "추천된 사람", "점수"],
    d.recommendations.map((r) => [r.day, r.user_id, nickOf(r.user_id), r.target_id, nickOf(r.target_id), r.score]),
    { 0: 12, 1: 38, 3: 38 },
  );

  addSheet(
    wb,
    "만남 피드백",
    ["남긴 사람ID", "남긴 사람", "대상ID", "대상", "결과", "사진과 비슷함", "깔끔함", "매너", "다시 만나고 싶음", "작성", "수정"],
    d.feedback.map((f) => [
      f.from_user, nickOf(f.from_user), f.to_user, nickOf(f.to_user), OUTCOME_LABEL[f.outcome] ?? f.outcome,
      f.photo_match, f.cleanliness, f.manners, f.again, kst(f.created_at), kst(f.updated_at),
    ]),
    { 0: 38, 2: 38, 9: 17, 10: 17 },
  );

  addSheet(
    wb,
    "신고",
    ["신고ID", "신고일", "신고한 사람ID", "신고한 사람", "대상ID", "대상", "사유", "내용", "확인 완료"],
    d.reports.map((r) => [
      r.id, kst(r.created_at), r.reporter, nickOf(r.reporter), r.target, nickOf(r.target),
      REPORT_REASON_LABEL[r.reason] ?? r.reason, r.detail, kst(r.resolved_at),
    ]),
    { 1: 17, 2: 38, 4: 38, 7: 50, 8: 17 },
  );

  for (const t of EXTRA_TESTS) {
    const rows = d.extras.filter((e) => e.test_id === t.id);
    addSheet(
      wb,
      `추가 · ${t.title}`.slice(0, 31),
      ["사용자ID", "닉네임", "성별", "검사 버전", "완료", "상대에게 보여주기", ...t.items.map((i) => i.id), ...t.scales.map((sc) => `점수_${sc.label}`)],
      rows.map((e) => {
        const m = memberById.get(e.user_id);
        return [
          e.user_id, m?.nickname, m?.gender ? GENDER[m.gender] : null, e.version, kst(e.completed_at), yesNo(e.share),
          ...t.items.map((i) => e.answers[i.id] ?? null),
          ...t.scales.map((sc) => e.scores.scales[sc.id] ?? null),
        ];
      }),
      { 0: 38, 4: 17 },
    );
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
