import { describe, expect, it, vi } from "vitest";

vi.mock("@/services/http", () => ({ fetchJson: vi.fn(async () => ({})) }));

import { fetchJson } from "@/services/http";
import {
  getAuditLogs,
  normalizeAuditLogs,
  validateSearchWindow,
  SEARCH_MAX_WINDOW_DAYS,
} from "@/lib/api/audit-logs";

const fetchJsonMock = vi.mocked(fetchJson);

describe("normalizeAuditLogs", () => {
  it("parses the paginated envelope {items,total,limit,offset}", () => {
    const payload = {
      items: [{ id: 1 }, { id: 2 }],
      total: 42,
      limit: 50,
      offset: 0,
    };
    expect(normalizeAuditLogs(payload)).toEqual(payload);
  });

  it("falls back to an empty page on unexpected payloads", () => {
    expect(normalizeAuditLogs(null)).toEqual({ items: [], total: 0, limit: 0, offset: 0 });
    expect(normalizeAuditLogs([{ id: 1 }])).toEqual({ items: [], total: 0, limit: 0, offset: 0 });
    expect(normalizeAuditLogs({ results: [] })).toEqual({
      items: [],
      total: 0,
      limit: 0,
      offset: 0,
    });
  });
});

describe("getAuditLogs", () => {
  it("sends filters + limit/offset as query params", async () => {
    fetchJsonMock.mockResolvedValueOnce({ items: [], total: 0, limit: 50, offset: 100 });

    await getAuditLogs({
      actionType: "LOGIN",
      timestampGte: "2026-08-01",
      timestampLte: "2026-08-19T23:59:59",
      limit: 50,
      offset: 100,
    });

    expect(fetchJsonMock).toHaveBeenCalledTimes(1);
    const url = String(fetchJsonMock.mock.calls[0][0]);
    const qs = new URLSearchParams(url.split("?")[1]);
    expect(qs.get("action_type")).toBe("LOGIN");
    expect(qs.get("timestamp__gte")).toBe("2026-08-01");
    expect(qs.get("timestamp__lte")).toBe("2026-08-19T23:59:59");
    expect(qs.get("limit")).toBe("50");
    expect(qs.get("offset")).toBe("100");
  });

  it("sends the search param alongside the timestamp window", async () => {
    fetchJsonMock.mockResolvedValueOnce({ items: [], total: 0, limit: 50, offset: 0 });

    await getAuditLogs({
      search: "  ORD-2026  ",
      timestampGte: "2026-08-01",
      timestampLte: "2026-08-19T23:59:59",
    });

    const calls = fetchJsonMock.mock.calls;
    const url = String(calls[calls.length - 1]?.[0]);
    const qs = new URLSearchParams(url.split("?")[1]);
    // trim trước khi gửi — BE cũng strip nhưng khoảng trắng làm lệch query key cache.
    expect(qs.get("search")).toBe("ORD-2026");
    expect(qs.get("timestamp__gte")).toBe("2026-08-01");
    expect(qs.get("timestamp__lte")).toBe("2026-08-19T23:59:59");
  });

  it("omits limit/offset when not provided", async () => {
    fetchJsonMock.mockResolvedValueOnce({ items: [], total: 0, limit: 100, offset: 0 });

    await getAuditLogs({});

    // Không dùng .at(): lib target của tsconfig chưa có Array.prototype.at,
    // tsc --noEmit đỏ toàn repo chỉ vì dòng này.
    const calls = fetchJsonMock.mock.calls;
    const url = String(calls[calls.length - 1]?.[0]);
    const qs = new URLSearchParams(url.split("?")[1]);
    expect(qs.has("limit")).toBe(false);
    expect(qs.has("offset")).toBe(false);
  });
});

describe("validateSearchWindow", () => {
  // Mốc "now" cố định, dựng bằng constructor local (y, m0, d, h, min) — KHÔNG
  // parse chuỗi ISO có offset rồi so getter local (bẫy tz-bomb đã cắn).
  const now = new Date(2026, 7, 19, 12, 0); // 2026-08-19 12:00 giờ máy

  it("passes when search is empty regardless of dates", () => {
    expect(validateSearchWindow("", "", "", now)).toBeNull();
    expect(validateSearchWindow("   ", "", "", now)).toBeNull();
  });

  it("requires a from-date when searching", () => {
    expect(validateSearchWindow("ORD-1", "", "", now)).toBe("missing-from");
    expect(validateSearchWindow("ORD-1", "", "2026-08-19", now)).toBe("missing-from");
  });

  it("rejects windows wider than the 31-day cap", () => {
    expect(SEARCH_MAX_WINDOW_DAYS).toBe(31);
    // Cửa sổ đóng bằng dateTo: 2026-06-01 → 2026-08-01 là ~61 ngày.
    expect(validateSearchWindow("x", "2026-06-01", "2026-08-01", now)).toBe("too-wide");
    // Không có dateTo thì trần là "now": 40 ngày trước now → quá rộng.
    expect(validateSearchWindow("x", "2026-07-10", "", now)).toBe("too-wide");
  });

  it("accepts windows at or under the cap", () => {
    expect(validateSearchWindow("x", "2026-08-01", "2026-08-19", now)).toBeNull();
    // gte cũ nhưng cửa sổ [gte, lte] hẹp vẫn hợp lệ (mirror luật BE).
    expect(validateSearchWindow("x", "2026-01-01", "2026-01-20", now)).toBeNull();
    // Sát trần: 2026-07-20T00:00 → now (2026-08-19T12:00) = 30 ngày 12 giờ ≤ 31.
    expect(validateSearchWindow("x", "2026-07-20", "", now)).toBeNull();
  });
});
