import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import type { MemberRow } from "@/lib/admin/data";
import { ALL_ITEMS, isRequired, OBSERVER_ITEMS, type Answers } from "@/lib/items";
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
  suspended: false,
  suspendReason: null,
  friendCount: 1,
  sentInterest: 1,
  receivedInterest: 1,
  mutual: 1,
  connected: 0,
  stage: "ready",
});

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
    ]);

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
    expect(items.rowCount).toBe(1 + ALL_ITEMS.length);

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
