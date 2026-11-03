import { describe, expect, it } from "vitest";

import type { DispatchResult, LookupOrder } from "../scan-types";
import {
  addDispatchScanRow,
  checkDispatchScan,
  dispatchErrorMessage,
  dispatchResultBadge,
} from "../scan-dispatch-rows";

const order = (over: Partial<LookupOrder> = {}): LookupOrder => ({
  order_id: 1,
  order_code: "ORD-1",
  shipping_code: "VD-1",
  status: 2,
  status_label: "Đang giao",
  invoice_status: 1,
  customer_name: "Khách A",
  customer_phone: "0900000000",
  fulfillment_warehouse_id: null,
  already_dispatched: false,
  matched_by: "shipping",
  items: [{ product_id: 10, sku: "SKU-10", name: "SP 10", quantity: 2 }],
  ...over,
});

describe("checkDispatchScan", () => {
  it("ok khi đơn chưa quét và chưa xuất kho", () => {
    expect(checkDispatchScan([], order())).toBe("ok");
  });

  it("duplicate khi order_id đã có trong danh sách quét", () => {
    const scanned = [order({ order_id: 7 })];
    expect(checkDispatchScan(scanned, order({ order_id: 7 }))).toBe("duplicate");
  });

  it("already-dispatched khi đơn đã xuất kho từ trước", () => {
    expect(checkDispatchScan([], order({ already_dispatched: true }))).toBe("already-dispatched");
  });

  it("duplicate ưu tiên hơn already-dispatched", () => {
    const scanned = [order({ order_id: 7 })];
    const dup = order({ order_id: 7, already_dispatched: true });
    expect(checkDispatchScan(scanned, dup)).toBe("duplicate");
  });
});

describe("addDispatchScanRow", () => {
  const mkOrder = (id: number, dispatched = false): LookupOrder => ({
    order_id: id,
    order_code: `DH${id}`,
    shipping_code: `SPX${id}`,
    status: 11,
    status_label: "Chờ giao",
    invoice_status: 1,
    customer_name: "A",
    customer_phone: "0",
    fulfillment_warehouse_id: null,
    already_dispatched: dispatched,
    matched_by: "shipping",
    items: [],
  });

  it("thêm dòng matched và unmatched", () => {
    const r1 = addDispatchScanRow([], "SPX1", mkOrder(1));
    expect(r1.result).toBe("added");
    const r2 = addDispatchScanRow(r1.rows, "SPX2", null);
    expect(r2.result).toBe("added");
    expect(r2.rows[0]).toEqual({ kind: "unmatched", code: "SPX2" });
  });

  it("chặn trùng mã và trùng đơn", () => {
    const r1 = addDispatchScanRow([], "SPX1", mkOrder(1));
    expect(addDispatchScanRow(r1.rows, "SPX1", mkOrder(1)).result).toBe("duplicate");
    expect(addDispatchScanRow(r1.rows, "KHAC", mkOrder(1)).result).toBe("duplicate");
  });

  it("chặn đơn đã xuất kho", () => {
    expect(addDispatchScanRow([], "SPX1", mkOrder(1, true)).result).toBe("already-dispatched");
  });
});

describe("dispatchResultBadge", () => {
  const r = (over: Partial<DispatchResult>): DispatchResult => ({
    order_id: 1,
    ok: true,
    ...over,
  });

  it("thành công không cảnh báo → ✓ Đã xuất", () => {
    expect(dispatchResultBadge(r({ ok: true }))).toEqual({
      text: "Đã xuất",
      tone: "ok",
    });
  });

  it("thành công nhưng đã xuất trước đó → cảnh báo vàng", () => {
    expect(dispatchResultBadge(r({ ok: true, warnings: ["already_dispatched"] }))).toEqual({
      text: "Đã xuất kho trước đó",
      tone: "warn",
    });
  });

  it("thất bại → ✗ kèm lỗi", () => {
    expect(dispatchResultBadge(r({ ok: false, error: "not_found" }))).toEqual({
      text: "not_found",
      tone: "error",
    });
  });

  it("đơn hủy → badge tiếng Việt, không hiện mã máy", () => {
    const badge = dispatchResultBadge(r({ ok: false, error: "order_cancelled" }));
    expect(badge.tone).toBe("error");
    expect(badge.text).toContain("Đơn đã hủy");
    expect(badge.text).not.toContain("order_cancelled");
  });

  it("thất bại không có message → ✗ lỗi", () => {
    expect(dispatchResultBadge(r({ ok: false }))).toEqual({
      text: "lỗi",
      tone: "error",
    });
  });
});

describe("dispatchErrorMessage", () => {
  it("map order_cancelled sang tiếng Việt", () => {
    expect(dispatchErrorMessage("order_cancelled")).toBe("Đơn đã hủy — không thể xuất kho");
  });

  it("map verify_unavailable sang tiếng Việt", () => {
    expect(dispatchErrorMessage("verify_unavailable")).toContain("KiotViet");
  });

  it("mã lỗi lạ giữ nguyên văn", () => {
    expect(dispatchErrorMessage("insufficient_stock")).toBe("insufficient_stock");
    expect(dispatchErrorMessage(undefined)).toBe("lỗi");
  });
});
