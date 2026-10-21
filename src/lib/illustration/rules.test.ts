import { describe, expect, it } from "vitest";
import { AUTO_RETRY_GAP_MS, autoDrawDue, canDelete, isDrawing, pickShown, STALE_MS } from "./rules";

const NOW = Date.parse("2026-10-21T12:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const min = 60_000;

describe("autoDrawDue", () => {
  it("한 번도 그린 적 없으면 바로 그린다", () => {
    expect(autoDrawDue([], 0, 3, NOW)).toBe(true);
  });

  it("다 그린 그림이 있거나 그리는 중이면 그리지 않는다", () => {
    expect(autoDrawDue([{ status: "done", created_at: ago(60 * min), deleted: false }], 1, 3, NOW)).toBe(false);
    expect(autoDrawDue([{ status: "pending", created_at: ago(2 * min), deleted: false }], 1, 3, NOW)).toBe(false);
  });

  it("멈춘 지 오래된 '그리는 중'은 그리는 중으로 보지 않는다", () => {
    expect(autoDrawDue([{ status: "pending", created_at: ago(STALE_MS + 40 * min), deleted: false }], 0, 3, NOW)).toBe(true);
  });

  it("실패하면 30분 뒤에 다시 그린다", () => {
    const failed = (m: number) => ({ status: "failed" as const, created_at: ago(m * min), deleted: false });
    expect(autoDrawDue([failed(10)], 0, 3, NOW)).toBe(false);
    expect(autoDrawDue([failed(AUTO_RETRY_GAP_MS / min + 1)], 0, 3, NOW)).toBe(true);
  });

  it("하루에 3번 실패하면 자동으로는 그만 그린다", () => {
    const rows = [100, 200, 300].map((m) => ({ status: "failed" as const, created_at: ago(m * min), deleted: false }));
    expect(autoDrawDue(rows, 0, 3, NOW)).toBe(false);
    expect(autoDrawDue(rows.slice(0, 2), 0, 3, NOW)).toBe(true);
  });

  it("횟수를 다 썼으면 그리지 않는다 (지운 그림도 횟수에 든다)", () => {
    const rows = [{ status: "done" as const, created_at: ago(5000 * min), deleted: true }];
    expect(autoDrawDue(rows, 3, 3, NOW)).toBe(false);
    expect(autoDrawDue(rows, 1, 3, NOW)).toBe(true);
  });
});

describe("isDrawing", () => {
  it("6분 안의 pending만 그리는 중", () => {
    expect(isDrawing({ status: "pending", created_at: ago(min) }, NOW)).toBe(true);
    expect(isDrawing({ status: "pending", created_at: ago(STALE_MS + min) }, NOW)).toBe(false);
    expect(isDrawing({ status: "done", created_at: ago(min) }, NOW)).toBe(false);
  });
});

describe("pickShown", () => {
  it("고른 그림, 없으면 가장 최근 그림", () => {
    const a = { id: "a", shown: false, created_at: ago(30 * min) };
    const b = { id: "b", shown: false, created_at: ago(10 * min) };
    expect(pickShown([a, b])?.id).toBe("b");
    expect(pickShown([{ ...a, shown: true }, b])?.id).toBe("a");
    expect(pickShown([])).toBeNull();
  });
});

describe("canDelete", () => {
  it("마지막 남은 그림은 지울 수 없다", () => {
    expect(canDelete("done", 1)).toBe(false);
    expect(canDelete("done", 2)).toBe(true);
    expect(canDelete("failed", 0)).toBe(true);
    expect(canDelete("pending", 2)).toBe(false);
  });
});
