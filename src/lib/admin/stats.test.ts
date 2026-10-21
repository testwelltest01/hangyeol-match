import { describe, expect, it } from "vitest";
import { ageBand, dailyCounts, funnel, reactionStats, userStage, type ReactionRow, type UserFacts } from "./stats";

const ready: UserFacts = { hasProfile: true, hasScores: true, friendCount: 1, hasMatchProfile: true, photoCount: 2, hasContact: true };

describe("userStage", () => {
  it("가입만 → 검사 중 → 검사 완료 → 매칭 준비 완료", () => {
    expect(userStage({ ...ready, hasProfile: false })).toBe("account");
    expect(userStage({ ...ready, hasScores: false })).toBe("testing");
    expect(userStage({ ...ready, friendCount: 0 })).toBe("ready"); // 친구 평가는 매칭 조건이 아니다
    expect(userStage({ ...ready, photoCount: 1 })).toBe("tested");
    expect(userStage({ ...ready, hasContact: false })).toBe("tested");
    expect(userStage(ready)).toBe("ready");
  });
});

const r = (from: string, to: string, interest: boolean, accept: boolean | null = null): ReactionRow => ({
  from_user: from,
  to_user: to,
  interest,
  accept,
  interest_at: "2026-10-01T00:00:00Z",
  accept_at: accept === null ? null : "2026-10-02T00:00:00Z",
});

describe("reactionStats", () => {
  it("서로 관심과 연결은 두 사람 모두 같은 답일 때만 센다", () => {
    const { byUser, totals } = reactionStats([
      r("a", "b", true, true),
      r("b", "a", true, true), // a-b 연결
      r("a", "c", true),
      r("c", "a", true, false), // a-c 서로 관심, c가 거절
      r("d", "a", true), // 한쪽 관심
      r("e", "a", false), // 넘김
    ]);
    expect(totals).toEqual({ interests: 5, passes: 1, mutualPairs: 2, connectedPairs: 1 });
    expect(byUser.get("a")).toEqual({ sentInterest: 2, receivedInterest: 3, mutual: 2, connected: 1 });
    expect(byUser.get("c")).toEqual({ sentInterest: 1, receivedInterest: 1, mutual: 1, connected: 0 });
    expect(byUser.get("e")).toBeUndefined();
  });
});

describe("funnel", () => {
  it("앞 단계를 지난 사람만 세고 앞 단계 대비 비율을 낸다", () => {
    const steps = funnel([
      { ...ready, sentInterest: 1, connected: 1 },
      { ...ready, sentInterest: 0, connected: 0 },
      { ...ready, photoCount: 1, sentInterest: 0, connected: 0 },
      { ...ready, hasScores: false, sentInterest: 0, connected: 0 },
    ]);
    expect(steps.map((s) => s.count)).toEqual([4, 4, 3, 2, 1, 1]);
    expect(steps[0].rate).toBeNull();
    expect(steps[2].rate).toBe(75);
    expect(steps[4].rate).toBe(50);
  });

  it("앞 단계가 0명이면 비율도 0", () => {
    expect(funnel([]).map((s) => s.rate)).toEqual([null, 0, 0, 0, 0, 0]);
  });
});

describe("dailyCounts", () => {
  it("한국 날짜로 묶고 빈 날은 0으로 채운다", () => {
    const out = dailyCounts(
      ["2026-10-16T14:59:00Z", "2026-10-16T15:00:00Z", "2026-10-17T01:00:00Z", "2026-10-01T00:00:00Z", null],
      3,
      "2026-10-17",
    );
    expect(out).toEqual([
      { day: "2026-10-15", count: 0 },
      { day: "2026-10-16", count: 1 }, // 14:59 UTC = 16일 23:59 KST
      { day: "2026-10-17", count: 2 }, // 15:00 UTC = 17일 0시 KST
    ]);
  });
});

describe("ageBand", () => {
  it("연 나이로 나눈다", () => {
    expect(ageBand(2002, 2026)).toBe("24세 이하");
    expect(ageBand(2001, 2026)).toBe("25~29세");
    expect(ageBand(1996, 2026)).toBe("30~34세");
    expect(ageBand(1987, 2026)).toBe("35~39세");
    expect(ageBand(1986, 2026)).toBe("40세 이상");
  });
});
