import { describe, expect, it } from "vitest";

import {
  asEventTypeKey,
  asInboundStatus,
  canResolve,
  parseOrderId,
  summarizeCounts,
} from "@/features/pancake-pos/webhook-logic";

describe("summarizeCounts", () => {
  it("gộp theo loại, loại chính luôn có dòng, loại lạ nối sau", () => {
    const rows = summarizeCounts([
      { event_type: "orders", status: "processed", count: 5 },
      { event_type: "orders", status: "error", count: 2 },
      { event_type: "variations_warehouses", status: "pending", count: 7 },
      { event_type: "unknown", status: "ignored", count: 1 },
    ]);
    expect(rows.map((r) => r.eventType)).toEqual([
      "orders",
      "variations_warehouses",
      "products",
      "unknown",
    ]);
    expect(rows[0]).toMatchObject({ total: 7, byStatus: { processed: 5, error: 2, pending: 0 } });
    expect(rows[2].total).toBe(0);
  });

  it("trạng thái lạ chỉ cộng vào tổng", () => {
    const [orders] = summarizeCounts([{ event_type: "orders", status: "weird", count: 3 }]);
    expect(orders.total).toBe(3);
    expect(Object.values(orders.byStatus).every((n) => n === 0)).toBe(true);
  });
});

describe("chờ khớp đơn", () => {
  it("parseOrderId nhận số dương, cho phép #", () => {
    expect(parseOrderId(" #123 ")).toBe(123);
    expect(parseOrderId("0")).toBeNull();
    expect(parseOrderId("12a")).toBeNull();
    expect(parseOrderId("")).toBeNull();
  });

  it("chỉ đơn chưa khớp mới khớp tay / bỏ qua được", () => {
    expect(canResolve("unmatched")).toBe(true);
    expect(canResolve("waiting")).toBe(true);
    expect(canResolve("matched")).toBe(false);
    expect(canResolve("ignored")).toBe(false);
  });

  it("giá trị lạ rơi về mặc định", () => {
    expect(asInboundStatus("xyz")).toBe("waiting");
    expect(asEventTypeKey("customers")).toBe("customers");
    expect(asEventTypeKey("abc")).toBe("unknown");
  });
});
