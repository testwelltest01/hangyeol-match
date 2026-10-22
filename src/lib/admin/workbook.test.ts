import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import type { MemberRow } from "@/lib/admin/data";
import { ALL_ITEMS, isRequired, OBSERVER_ITEMS, type Answers } from "@/lib/items";
import { findExtraTest, scoreExtra } from "@/lib/extra/tests";
import { LOVE_ITEMS, LOVE_SCALES } from "@/lib/love/items";
import type { LoveScores } from "@/lib/love/score";
import { computeScores } from "@/lib/scoring";
import { buildWorkbook, type ExportData } from "./workbook";

function fullAnswers(): Answers {
  const a: Answers = {};
  for (const item of ALL_ITEMS) {
    if (!isRequired(item)) continue;
    if (item.kind === "bipolar") a[item.id] = 4;
    else if (item.kind === "importance") a[item.id] = 3;
    else if (item.kind === "likert") a[item.id] = 2;
    else a[item.id] = item.options[0].value;
  }
  return a;
}

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

const member = (id: string, nickname: string, gender: "male" | "female"): MemberRow => ({
  id,
  email: `${nickname}@example.com`,
  createdAt: "2026-10-16T15:30:00Z",
  lastSignInAt: null,
  isAdmin: false,
  nickname,
  gender,
  birthYear: 1995,
  hasProfile: true,
  hasScores: true,
  testVersion: "2026-10-v2",
  scoredAt: "2026-10-16T16:00:00Z",
  region: "서울|마포구",
  height: 170,
  hasMatchProfile: true,
  paused: false,
  photoCount: 2,
  hasContact: true,
  hasIllustration: true,
  suspended: false,
  suspendReason: null,
  friendCount: 1,
  sentInterest: 1,
  receivedInterest: 1,
  mutual: 1,
  connected: 0,
  stage: "ready",
});

const talk = findExtraTest("talk")!;
const talkAnswers = Object.fromEntries(talk.items.map((i) => [i.id, 4]));
const talkRow = {
  user_id: A,
  test_id: "talk",
  version: talk.version,
  answers: talkAnswers,
  scores: scoreExtra(talk, talkAnswers),
  share: true,
  completed_at: "2026-10-17T05:00:00Z",
};

function sample(): ExportData {
  const answers = fullAnswers();
  const scores = computeScores(answers, "male");
  const friend: Answers = Object.fromEntries(OBSERVER_ITEMS.map((i) => [i.id, 4]));
  return {
    generatedAt: new Date("2026-10-17T07:30:00Z"),
    members: [member(A, "봄날", "male"), member(B, "하늘", "female")],
    scores: [{ user_id: A, version: "2026-10-v2", computed_at: "2026-10-16T16:00:00Z", scores }],
    answers: [{ user_id: A, version: "2026-10-v2", completed_at: "2026-10-16T16:00:00Z", answers }],
    friendRatings: [{ id: 7, user_id: A, created_at: "2026-10-17T00:00:00Z", answers: friend }],
    reactions: [
      { from_user: A, to_user: B, interest: true, accept: null, interest_at: "2026-10-17T01:00:00Z", accept_at: null },
      { from_user: B, to_user: A, interest: true, accept: null, interest_at: "2026-10-17T02:00:00Z", accept_at: null },
    ],
    recommendations: [{ day: "2026-10-17", user_id: A, target_id: B, score: 0.82 }],
    recommendationDays: 60,
    feedback: [],
    reports: [
      { id: 3, reporter: B, target: A, reason: "rude", detail: "=HYPERLINK(\"x\")", created_at: "2026-10-17T03:00:00Z", resolved_at: null },
    ],
    extras: [talkRow],
    love: [
      {
        id: "l1",
        user_id: A,
        version: "2026-10-v1",
        answers: Object.fromEntries(LOVE_ITEMS.map((i) => [i.id, 4])),
        scores: Object.fromEntries(LOVE_SCALES.map((s) => [s.id, 3.5])) as LoveScores,
        status: "done",
        created_at: "2026-10-17T03:00:00Z",
      },
      {
        id: "l2",
        user_id: A,
        version: "2026-10-v2",
        answers: Object.fromEntries(LOVE_ITEMS.map((i) => [i.id, 3])),
        scores: Object.fromEntries(LOVE_SCALES.map((s) => [s.id, 3])) as LoveScores,
        status: "pending",
        created_at: "2026-10-18T03:00:00Z",
      },
      {
        id: "g1",
        user_id: null,
        version: "2026-10-v2",
        answers: Object.fromEntries(LOVE_ITEMS.map((i) => [i.id, 5])),
        scores: Object.fromEntries(LOVE_SCALES.map((s) => [s.id, 3])) as LoveScores,
        status: "done",
        created_at: "2026-10-19T03:00:00Z",
      },
    ],
    chatRooms: [
      {
        id: "room-1",
        user_a: A,
        user_b: B,
        opened_at: "2026-10-17T03:00:00Z",
        first_message_at: "2026-10-17T03:05:00Z",
        last_message_at: "2026-10-17T03:07:00Z",
        count_a: 1,
        count_b: 1,
        contact_a_at: "2026-10-17T03:10:00Z",
        contact_b_at: null,
        exchanged_at: null,
        closed_at: null,
        close_reason: null,
      },
    ],
    chatMessages: [
      { id: 1, room_id: "room-1", sender: B, room_seq: 1, sender_seq: 1, turn: 1, char_count: 5, response_seconds: null, created_at: "2026-10-17T03:05:00Z" },
      { id: 2, room_id: "room-1", sender: A, room_seq: 2, sender_seq: 1, turn: 2, char_count: 9, response_seconds: 120, created_at: "2026-10-17T03:07:00Z" },
    ],
    chatEvents: [{ id: 1, room_id: "room-1", user_id: A, kind: "contact_request", created_at: "2026-10-17T03:10:00Z" }],
  };
}

async function read(buf: Buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  return wb;
}

describe("buildWorkbook", () => {
  it("시트와 행이 모두 들어가고, 시각은 한국 시간으로 적힌다", async () => {
    const buf = await buildWorkbook(sample());
    if (process.env.SAMPLE_XLSX) (await import("node:fs")).writeFileSync(process.env.SAMPLE_XLSX, buf);
    const wb = await read(buf);
    expect(wb.worksheets.map((w) => w.name)).toEqual([
      "안내", "회원", "검사 점수", "문항 응답", "문항 목록", "친구 평가", "관심·수락", "추천", "만남 피드백", "신고",
      "추가 · 마음이 전해지는 순간", "추가 · 위로가 필요할 때", "추가 · 대화 코드", "추가 · 연애 상황 보고서",
      "대화방", "대화 메시지", "대화 이벤트",
    ]);
    const rooms = wb.getWorksheet("대화방")!;
    const roomHeader = rooms.getRow(1).values as unknown[];
    expect(rooms.getRow(2).getCell(roomHeader.indexOf("먼저 말 건 성별")).value).toBe("여");
    expect(rooms.getRow(2).getCell(roomHeader.indexOf("첫 답장까지(초)")).value).toBe(120);
    expect(wb.getWorksheet("대화 메시지")!.rowCount).toBe(3);
    expect(wb.getWorksheet("대화 이벤트")!.getRow(2).getCell(5).value).toBe("연락처 전달 누름");
    const talkSheet = wb.getWorksheet("추가 · 대화 코드")!;
    expect(talkSheet.rowCount).toBe(2);
    // T08은 역문항: 응답 4 → 점수에는 2로 들어가서 말하기 점수 = (4 + 2) / 2 = 3
    const talkHeader = talkSheet.getRow(1).values as unknown[];
    expect(talkSheet.getRow(2).getCell(talkHeader.indexOf("점수_이야기를 꺼내는 쪽")).value).toBe(3);

    const members = wb.getWorksheet("회원")!;
    expect(members.rowCount).toBe(3);
    expect(members.getRow(2).getCell(2).value).toBe("봄날");
    // 2026-10-16 15:30 UTC = 2026-10-17 00:30 KST
    const joined = members.getRow(2).getCell(5).value as Date;
    expect(joined.toISOString().slice(0, 16)).toBe("2026-10-17T00:30");
    expect(members.getRow(2).getCell(8).value).toBe("서울 마포구");

    const answers = wb.getWorksheet("문항 응답")!;
    const header = answers.getRow(1).values as unknown[];
    expect(header).toContain("V01");
    expect(header).toContain("S1");
    expect(answers.getRow(1).cellCount).toBe(4 + ALL_ITEMS.length);

    const items = wb.getWorksheet("문항 목록")!;
    expect(items.rowCount).toBe(1 + ALL_ITEMS.length + 29 + LOVE_ITEMS.length);
    const love = wb.getWorksheet("추가 · 연애 상황 보고서")!;
    const loveHeader = (love.getRow(1).values as unknown[]).map(String);
    expect(love.rowCount).toBe(4);
    expect(love.getRow(4).getCell(loveHeader.indexOf("닉네임")).value).toBe("비회원");
    expect(love.getRow(4).getCell(loveHeader.indexOf("회차")).value).toBe(1);
    expect(love.getRow(2).getCell(loveHeader.indexOf("보고서 상태")).value).toBe("완료");
    expect(love.getRow(2).getCell(loveHeader.indexOf("회차")).value).toBe(1);
    expect(love.getRow(3).getCell(loveHeader.indexOf("회차")).value).toBe(2);
    expect(love.getRow(3).getCell(loveHeader.indexOf("보고서 상태")).value).toBe("쓰는 중");
    expect(love.getRow(2).getCell(loveHeader.indexOf("점수_믿음")).value).toBe(3.5);

    const friends = wb.getWorksheet("친구 평가")!;
    expect(friends.getRow(2).getCell(1).value).toBe(7);

    expect(wb.getWorksheet("관심·수락")!.rowCount).toBe(3);
    expect(wb.getWorksheet("만남 피드백")!.rowCount).toBe(1);
  });

  it("이메일은 넣지 않고, 사용자가 쓴 글은 수식이 아닌 글자로 적는다", async () => {
    const wb = await read(await buildWorkbook(sample()));
    let foundEmail = false;
    wb.eachSheet((ws) =>
      ws.eachRow((row) =>
        row.eachCell((c) => {
          if (String(c.value ?? "").includes("@example.com")) foundEmail = true;
        }),
      ),
    );
    expect(foundEmail).toBe(false);
    const detail = wb.getWorksheet("신고")!.getRow(2).getCell(8);
    expect(detail.type).toBe(ExcelJS.ValueType.String);
    expect(detail.value).toBe('=HYPERLINK("x")');
  });
});
