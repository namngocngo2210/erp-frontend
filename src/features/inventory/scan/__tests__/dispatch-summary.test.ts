import { describe, expect, it } from "vitest";

import type { DispatchResult, LookupOrder } from "../scan-types";
import { summarizeDispatched } from "../dispatch-summary";

const order = (over: Partial<LookupOrder> = {}): LookupOrder => ({
  order_id: 1,
  order_code: "ORD-1",
  shipping_code: "VD-1",
  status: 2,
  status_label: "Đang giao",
  invoice_status: 1,
  customer_name: "Khách A",
  customer_phone: "0900000000",
  items: [{ product_id: 10, sku: "SKU-10", name: "Áo thun", quantity: 2 }],
  fulfillment_warehouse_id: null,
  already_dispatched: false,
  matched_by: "shipping",
  ...over,
});

const ok = (order_id: number): DispatchResult => ({ order_id, ok: true });
const fail = (order_id: number): DispatchResult => ({ order_id, ok: false, error: "Hết tồn" });

describe("summarizeDispatched", () => {
  it("chỉ tính đơn xuất thành công, gộp theo sản phẩm", () => {
    const scanned = [
      order({
        order_id: 1,
        items: [{ product_id: 10, sku: "SKU-10", name: "Áo thun", quantity: 2 }],
      }),
      order({
        order_id: 2,
        items: [{ product_id: 10, sku: "SKU-10", name: "Áo thun", quantity: 1 }],
      }),
      order({
        order_id: 3,
        items: [{ product_id: 20, sku: "SKU-20", name: "Quần jean", quantity: 3 }],
      }),
    ];
    const sum = summarizeDispatched(scanned, [ok(1), ok(2), ok(3)]);
    expect(sum.orderCount).toBe(3);
    expect(sum.totalQuantity).toBe(6);
    expect(sum.lines).toEqual([
      { sku: "SKU-10", name: "Áo thun", quantity: 3 },
      { sku: "SKU-20", name: "Quần jean", quantity: 3 },
    ]);
  });

  it("loại đơn xuất thất bại khỏi tổng hợp", () => {
    const scanned = [
      order({
        order_id: 1,
        items: [{ product_id: 10, sku: "SKU-10", name: "Áo thun", quantity: 2 }],
      }),
      order({
        order_id: 2,
        items: [{ product_id: 20, sku: "SKU-20", name: "Quần jean", quantity: 5 }],
      }),
    ];
    const sum = summarizeDispatched(scanned, [ok(1), fail(2)]);
    expect(sum.orderCount).toBe(1);
    expect(sum.totalQuantity).toBe(2);
    expect(sum.lines).toEqual([{ sku: "SKU-10", name: "Áo thun", quantity: 2 }]);
  });

  it("gộp nhiều dòng cùng product trong 1 đơn", () => {
    const scanned = [
      order({
        order_id: 1,
        items: [
          { product_id: 10, sku: "SKU-10", name: "Áo thun", quantity: 2 },
          { product_id: 10, sku: "SKU-10", name: "Áo thun", quantity: 3 },
        ],
      }),
    ];
    const sum = summarizeDispatched(scanned, [ok(1)]);
    expect(sum.lines).toEqual([{ sku: "SKU-10", name: "Áo thun", quantity: 5 }]);
    expect(sum.totalQuantity).toBe(5);
  });

  it("không có đơn thành công → tổng hợp rỗng", () => {
    const scanned = [order({ order_id: 1 })];
    const sum = summarizeDispatched(scanned, [fail(1)]);
    expect(sum).toEqual({ orderCount: 0, totalQuantity: 0, lines: [] });
  });
});
