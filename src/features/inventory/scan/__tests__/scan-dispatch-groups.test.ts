import { describe, expect, it } from "vitest";

import type { LookupOrder } from "../scan-types";
import {
  INVOICE_MATCH_MISSING_WAREHOUSE_ERROR,
  missingWarehouseResults,
  splitMatchedRowsByDispatchRoute,
  toDispatchResults,
} from "../scan-dispatch-groups";

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
  items: [],
  ...over,
});

describe("splitMatchedRowsByDispatchRoute", () => {
  it("shipping/recall đi vào viaScanWarehouse, không có nhóm invoice nào", () => {
    const rows = [
      { code: "SPX1", order: order({ order_id: 1, matched_by: "shipping" }) },
      { code: "RC1", order: order({ order_id: 2, matched_by: "recall" }) },
    ];
    const { viaScanWarehouse, invoiceGroups, missingWarehouse } =
      splitMatchedRowsByDispatchRoute(rows);
    expect(viaScanWarehouse).toHaveLength(2);
    expect(invoiceGroups).toHaveLength(0);
    expect(missingWarehouse).toHaveLength(0);
  });

  it("invoice có kho xuất → nhóm theo warehouseId, không lẫn vào viaScanWarehouse", () => {
    const rows = [
      {
        code: "HD1",
        order: order({ order_id: 1, matched_by: "invoice", fulfillment_warehouse_id: 5 }),
      },
      {
        code: "HD2",
        order: order({ order_id: 2, matched_by: "invoice", fulfillment_warehouse_id: 5 }),
      },
      {
        code: "HD3",
        order: order({ order_id: 3, matched_by: "invoice", fulfillment_warehouse_id: 9 }),
      },
    ];
    const { viaScanWarehouse, invoiceGroups, missingWarehouse } =
      splitMatchedRowsByDispatchRoute(rows);
    expect(viaScanWarehouse).toHaveLength(0);
    expect(missingWarehouse).toHaveLength(0);
    expect(invoiceGroups).toHaveLength(2);
    const byWh = new Map(invoiceGroups.map((g) => [g.warehouseId, g.rows.map((r) => r.code)]));
    expect(byWh.get(5)).toEqual(["HD1", "HD2"]);
    expect(byWh.get(9)).toEqual(["HD3"]);
  });

  it("invoice thiếu kho xuất → missingWarehouse, không tạo nhóm invoice nào và không rơi về viaScanWarehouse", () => {
    const rows = [
      {
        code: "HD-NOWH",
        order: order({ order_id: 1, matched_by: "invoice", fulfillment_warehouse_id: null }),
      },
    ];
    const { viaScanWarehouse, invoiceGroups, missingWarehouse } =
      splitMatchedRowsByDispatchRoute(rows);
    expect(viaScanWarehouse).toHaveLength(0);
    expect(invoiceGroups).toHaveLength(0);
    expect(missingWarehouse).toHaveLength(1);
    expect(missingWarehouse[0].code).toBe("HD-NOWH");
  });

  it("hỗn hợp 3 loại cùng lúc, mỗi dòng vào đúng đúng 1 nhóm", () => {
    const rows = [
      { code: "SPX1", order: order({ order_id: 1, matched_by: "shipping" }) },
      {
        code: "HD1",
        order: order({ order_id: 2, matched_by: "invoice", fulfillment_warehouse_id: 5 }),
      },
      {
        code: "HD2",
        order: order({ order_id: 3, matched_by: "invoice", fulfillment_warehouse_id: null }),
      },
    ];
    const result = splitMatchedRowsByDispatchRoute(rows);
    expect(result.viaScanWarehouse.map((r) => r.code)).toEqual(["SPX1"]);
    expect(result.invoiceGroups.map((g) => g.warehouseId)).toEqual([5]);
    expect(result.missingWarehouse.map((r) => r.code)).toEqual(["HD2"]);
  });
});

describe("toDispatchResults", () => {
  it("confirmed → ok:true, skipped (lý do thật là lỗi) → ok:false với thông điệp tiếng Việt (map qua MANUAL_DISPATCH_SKIP_LABELS)", () => {
    const rows = [
      { code: "HD1", order: order({ order_id: 1 }) },
      { code: "HD2", order: order({ order_id: 2 }) },
    ];
    const result = toDispatchResults(rows, {
      confirmed: [1],
      skipped: [{ order_id: 2, reason: "cancelled" }],
    });
    expect(result).toEqual([
      { order_id: 1, ok: true },
      { order_id: 2, ok: false, error: "Đơn đã bị hủy." },
    ]);
  });

  it("skip reason 'already_dispatched' KHÔNG phải lỗi → ok:true kèm warnings, cùng hình dạng với nhánh shipping/recall", () => {
    // Quét lại 1 kiện đã xuất là chuyện thường ngày (idempotent) — phải rơi vào
    // đúng badge hổ phách "⚠ Đã xuất kho trước đó" (dispatchResultBadge), KHÔNG
    // được tính vào danh sách "đơn không xuất kho được" / không bíp lỗi.
    const rows = [{ code: "HD1", order: order({ order_id: 1 }) }];
    const result = toDispatchResults(rows, {
      confirmed: [],
      skipped: [{ order_id: 1, reason: "already_dispatched" }],
    });
    expect(result).toEqual([{ order_id: 1, ok: true, warnings: ["already_dispatched"] }]);
  });

  it("lý do skip lạ (chưa map) → hiện nguyên văn, không nuốt thông tin", () => {
    const rows = [{ code: "HD1", order: order({ order_id: 1 }) }];
    const result = toDispatchResults(rows, {
      confirmed: [],
      skipped: [{ order_id: 1, reason: "some_new_reason" }],
    });
    expect(result).toEqual([{ order_id: 1, ok: false, error: "some_new_reason" }]);
  });
});

describe("missingWarehouseResults", () => {
  it("trả lỗi cùng chữ với cron backend, không gọi API nào", () => {
    const rows = [{ code: "HD1", order: order({ order_id: 1 }) }];
    expect(missingWarehouseResults(rows)).toEqual([
      { order_id: 1, ok: false, error: INVOICE_MATCH_MISSING_WAREHOUSE_ERROR },
    ]);
  });
});
