import { describe, expect, it } from "vitest";
import { median, roomMetrics, type ChatMessageMeta, type ChatRoomMeta } from "./metrics";
import { checkChatMessage, MESSAGES_PER_PERSON, orderPair } from "./rules";

describe("규칙", () => {
  it("서로 50회 미만", () => expect(MESSAGES_PER_PERSON).toBeLessThan(50));

  it("평범한 말은 보내고, 연락처 모양은 막는다", () => {
    for (const ok of ["안녕하세요!", "카톡 자주 하세요?", "인스타 사진 잘 찍으시던데요", "주말에 010 버스 타고 갔어요", "이메일 주소는 나중에요"]) {
      expect(checkChatMessage(ok)).toBeNull();
    }
    for (const bad of ["010-1234-5678", "01012345678", "제 카톡 아이디는 abc", "인스타 id 알려드릴게요", "@hangyeol_kim", "me@example.com", "https://open.kakao.com/o/abc", "오픈채팅 주소 드릴게요", "naver.me/abc"]) {
      expect(checkChatMessage(bad)).not.toBeNull();
    }
    expect(checkChatMessage("   ")).toBe("메시지를 입력해주세요.");
    expect(checkChatMessage("가".repeat(501))).toContain("500자");
  });

  it("방의 두 사람 순서는 소문자 문자열 순서 (Postgres uuid 비교와 같음)", () => {
    expect(orderPair("B0000000-0000-4000-8000-000000000000", "a0000000-0000-4000-8000-000000000000")).toEqual([
      "a0000000-0000-4000-8000-000000000000",
      "b0000000-0000-4000-8000-000000000000",
    ]);
  });
});

describe("대화 지표", () => {
  const room: ChatRoomMeta = {
    id: "r",
    user_a: "a",
    user_b: "b",
    opened_at: "2026-10-17T00:00:00Z",
    first_message_at: "2026-10-17T00:10:00Z",
    last_message_at: "2026-10-17T01:00:00Z",
    count_a: 3,
    count_b: 2,
    contact_a_at: null,
    contact_b_at: null,
    exchanged_at: "2026-10-17T02:00:00Z",
    closed_at: null,
    close_reason: null,
  };
  const m = (seq: number, sender: string, turn: number, chars: number, gap: number | null, at: string): ChatMessageMeta => ({
    id: seq,
    room_id: "r",
    sender,
    room_seq: seq,
    sender_seq: 0,
    turn,
    char_count: chars,
    response_seconds: gap,
    created_at: at,
  });
  const msgs = [
    m(1, "b", 1, 10, null, "2026-10-17T00:10:00Z"),
    m(2, "a", 2, 20, 120, "2026-10-17T00:12:00Z"),
    m(3, "a", 2, 30, null, "2026-10-17T00:13:00Z"),
    m(4, "b", 3, 6, 60, "2026-10-17T00:14:00Z"),
    m(5, "a", 4, 10, 2760, "2026-10-17T01:00:00Z"),
  ];

  it("말차례, 평균 글자 수, 응답 중앙값, 먼저 말 건 사람, 교환까지 걸린 시간", () => {
    expect(roomMetrics(room, msgs)).toEqual({
      turns: 4,
      avgCharsA: 20,
      avgCharsB: 8,
      medianResponseA: 1440,
      medianResponseB: 60,
      secondsToFirstMessage: 600,
      secondsToFirstReply: 120,
      firstSender: "b",
      secondsToExchange: 7200,
      activeSeconds: 3000,
    });
  });

  it("메시지가 없으면 비어 있는 값", () => {
    const r = roomMetrics({ ...room, exchanged_at: null }, []);
    expect(r.turns).toBe(0);
    expect(r.firstSender).toBeNull();
    expect(r.secondsToFirstReply).toBeNull();
    expect(median([])).toBeNull();
    expect(median([3, 1, 2])).toBe(2);
  });
});
