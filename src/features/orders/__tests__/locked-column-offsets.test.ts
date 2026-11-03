import { describe, expect, it } from "vitest";

import {
  CHECKBOX_FALLBACK_WIDTH,
  CHECKBOX_MEASURE_KEY,
  LOCKED_COLUMN_FALLBACK_WIDTH,
  computeLockedLefts,
  resolveStickyColumns,
} from "@/features/orders/OrdersTable/use-locked-column-offsets";
import type { OrderColumnKey } from "@/features/orders/order-types";

const LOCKED: OrderColumnKey[] = ["channel_code", "name", "phone"];

describe("computeLockedLefts", () => {
  it("cộng dồn offset theo width THẬT đã đo (không hardcode 120px)", () => {
    const lefts = computeLockedLefts(LOCKED, {
      [CHECKBOX_MEASURE_KEY]: 48,
      channel_code: 160,
      name: 220,
      phone: 110,
    });
    expect(lefts.channel_code).toBe(48);
    expect(lefts.name).toBe(48 + 160);
    expect(lefts.phone).toBe(48 + 160 + 220);
  });

  it("giữ width fractional, không làm tròn gây drift", () => {
    const lefts = computeLockedLefts(LOCKED, {
      [CHECKBOX_MEASURE_KEY]: 48,
      channel_code: 160.5,
      name: 220.3,
    });
    expect(lefts.name).toBeCloseTo(208.5);
    expect(lefts.phone).toBeCloseTo(428.8);
  });

  it("fallback 72/120 khi chưa đo được (first paint) — khớp công thức cũ", () => {
    const lefts = computeLockedLefts(LOCKED, {});
    expect(lefts.channel_code).toBe(CHECKBOX_FALLBACK_WIDTH);
    expect(lefts.name).toBe(CHECKBOX_FALLBACK_WIDTH + LOCKED_COLUMN_FALLBACK_WIDTH);
    expect(lefts.phone).toBe(CHECKBOX_FALLBACK_WIDTH + 2 * LOCKED_COLUMN_FALLBACK_WIDTH);
  });

  it("không có cột ghim → map rỗng", () => {
    expect(computeLockedLefts([], { [CHECKBOX_MEASURE_KEY]: 48 })).toEqual({});
  });
});

describe("resolveStickyColumns", () => {
  const ORDERED: OrderColumnKey[] = ["kiotviet_state", "channel_code", "name", "phone"];

  it("chưa ghim cột nào → tự dính cột định danh đầu tiên đang hiển thị (tên)", () => {
    expect([...resolveStickyColumns(new Set(), ORDERED, false)]).toEqual(["name"]);
  });

  it("ẩn cột tên → rơi về SĐT; không có cột định danh → không dính gì", () => {
    expect([...resolveStickyColumns(new Set(), ["channel_code", "phone"], false)]).toEqual([
      "phone",
    ]);
    expect(resolveStickyColumns(new Set(), ["channel_code", "sku"], false).size).toBe(0);
  });

  it("đã ghim cột → giữ nguyên lựa chọn của người dùng", () => {
    const locked = new Set<OrderColumnKey>(["channel_code"]);
    expect(resolveStickyColumns(locked, ORDERED, false)).toBe(locked);
  });

  it("điện thoại (<768) → không tự dính", () => {
    expect(resolveStickyColumns(new Set(), ORDERED, true).size).toBe(0);
  });
});
