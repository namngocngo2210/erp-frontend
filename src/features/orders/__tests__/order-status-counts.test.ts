import { describe, expect, it } from "vitest";
import {
  applyStatusCountsDelta,
  CANCELLED_INVOICE_STATUS_VALUE,
  CANCELLED_STATUS_CHIP_KEY,
  computeStatusChipTotal,
  nextFilterForCancelledChip,
  nextFilterForLifecycleChip,
  statusChipKeyFor,
} from "../order-status-counts";
import type { OrderRow } from "../order-types";

const row = (overrides: Partial<OrderRow> = {}): Pick<OrderRow, "status" | "invoice_status"> => ({
  status: 1,
  invoice_status: null,
  ...overrides,
});

describe("statusChipKeyFor", () => {
  it("returns the lifecycle status as string for a non-cancelled row", () => {
    expect(statusChipKeyFor(row({ status: 3 }))).toBe("3");
  });

  it("returns the cancelled key when status === 6", () => {
    expect(statusChipKeyFor(row({ status: 6 }))).toBe(CANCELLED_STATUS_CHIP_KEY);
  });

  it("returns the cancelled key when invoice_status === 2 regardless of status", () => {
    expect(statusChipKeyFor(row({ status: 1, invoice_status: 2 }))).toBe(CANCELLED_STATUS_CHIP_KEY);
  });

  it("returns undefined for a missing row", () => {
    expect(statusChipKeyFor(undefined)).toBeUndefined();
    expect(statusChipKeyFor(null)).toBeUndefined();
  });
});

describe("applyStatusCountsDelta", () => {
  it("moves one unit from the old key to the new key", () => {
    const next = applyStatusCountsDelta({ "1": 5, "3": 2 }, "1", "3");
    expect(next).toEqual({ "1": 4, "3": 3 });
  });

  it("returns the same reference when old and new key are identical (no-op)", () => {
    const counts = { "1": 5 };
    expect(applyStatusCountsDelta(counts, "1", "1")).toBe(counts);
  });

  it("only increments the new key when there was no previous key (new row insert)", () => {
    const next = applyStatusCountsDelta({ "1": 5 }, undefined, "1");
    expect(next).toEqual({ "1": 6 });
  });

  it("only decrements the old key when there is no new key (row removed from view)", () => {
    const next = applyStatusCountsDelta({ "1": 5 }, "1", undefined);
    expect(next).toEqual({ "1": 4 });
  });

  it("never goes below zero", () => {
    const next = applyStatusCountsDelta({ "1": 0 }, "1", "3");
    expect(next).toEqual({ "1": 0, "3": 1 });
  });

  it("handles moving into the cancelled key", () => {
    const next = applyStatusCountsDelta({ "1": 5, "6": 2 }, "1", CANCELLED_STATUS_CHIP_KEY);
    expect(next).toEqual({ "1": 4, "6": 3 });
  });
});

// 7.1b — chip "Tất cả" total phải khớp số dòng thực trả về khi bấm (chỉ 6 status
// lifecycle, KHÔNG cộng luôn key "6" đã hủy).
describe("computeStatusChipTotal", () => {
  it("sums lifecycle keys but excludes the cancelled key (6)", () => {
    const total = computeStatusChipTotal({ "0": 2, "1": 3, "3": 1, "6": 100 });
    expect(total).toBe(6);
  });

  it("is unaffected by a lifecycle status literally named 2 (not to be confused with the cancelled invoice_status VALUE '2')", () => {
    // Regression guard: statusCounts key "2" means Order.status === 2 (lifecycle),
    // it must NOT be excluded just because CANCELLED_INVOICE_STATUS_VALUE is also "2".
    const total = computeStatusChipTotal({ "1": 1, "2": 5, "6": 9 });
    expect(total).toBe(6);
  });

  it("returns 0 for empty counts", () => {
    expect(computeStatusChipTotal({})).toBe(0);
  });
});

// 7.1c — bấm chip lifecycle phải xoá sạch invoice_status (không chỉ bỏ "2") để số
// trên chip khớp cách backend đếm (status_counts_for strip cả 2 trục).
describe("nextFilterForLifecycleChip", () => {
  it("clears invoiceStatus entirely and clears status when clicking 'Tất cả' (no chipKey)", () => {
    const next = nextFilterForLifecycleChip(["1"]);
    expect(next).toEqual({ status: [], invoiceStatus: [] });
  });

  it("clears invoiceStatus even if the panel had an unrelated invoice_status filter set", () => {
    const next = nextFilterForLifecycleChip(["1"]);
    expect(next.invoiceStatus).toEqual([]);
  });

  it("adds the clicked status key and clears invoiceStatus", () => {
    const next = nextFilterForLifecycleChip(["1"], "3");
    expect(next).toEqual({ status: ["1", "3"], invoiceStatus: [] });
  });

  it("removes the clicked status key when it is already active (toggle off)", () => {
    const next = nextFilterForLifecycleChip(["1", "3"], "3");
    expect(next).toEqual({ status: ["1"], invoiceStatus: [] });
  });
});

// 7.1c — chip "Đã hủy" giữ nguyên hành vi cũ (chỉ đổi trục invoice_status).
describe("nextFilterForCancelledChip", () => {
  it("activates: sets status=[] and adds the cancelled invoice_status value", () => {
    const next = nextFilterForCancelledChip(["1"], [], false);
    expect(next).toEqual({ status: [], invoiceStatus: [CANCELLED_INVOICE_STATUS_VALUE] });
  });

  it("activates while preserving other invoice_status values already set on the panel", () => {
    const next = nextFilterForCancelledChip(["1"], ["0"], false);
    expect(next).toEqual({ status: [], invoiceStatus: ["0", CANCELLED_INVOICE_STATUS_VALUE] });
  });

  it("deactivates: keeps current status and drops only the cancelled value", () => {
    const next = nextFilterForCancelledChip(["1"], ["0", CANCELLED_INVOICE_STATUS_VALUE], true);
    expect(next).toEqual({ status: ["1"], invoiceStatus: ["0"] });
  });
});
