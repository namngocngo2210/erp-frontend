import { describe, expect, it } from "vitest";

import type { LookupOrder } from "../scan-types";
import {
  addScanRow,
  buildReturnPayloads,
  codesWithoutReturnQuantity,
  setReturnLineQuantity,
  unmatchedCodes,
} from "../scan-return-rows";
import type { ScanReturnRow } from "../scan-return-rows";

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
  items: [
    { product_id: 10, sku: "SKU-10", name: "SP 10", quantity: 2 },
    { product_id: 10, sku: "SKU-10", name: "SP 10", quantity: 3 },
    { product_id: null as unknown as number, sku: "X", name: "No product", quantity: 1 },
  ],
  ...over,
});

/** Đơn 2 sản phẩm — ca "hoàn về 1 trong 2". */
const twoProductOrder = (): LookupOrder =>
  order({
    items: [
      { product_id: 10, sku: "SKU-10", name: "SP 10", quantity: 1 },
      { product_id: 20, sku: "SKU-20", name: "SP 20", quantity: 1 },
    ],
  });

const matchedRow = (code: string, o: LookupOrder): ScanReturnRow => addScanRow([], code, o).rows[0];

describe("addScanRow", () => {
  it("thêm dòng khớp lên đầu danh sách", () => {
    const { rows, duplicate } = addScanRow([], "VD-1", order());
    expect(duplicate).toBe(false);
    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe("matched");
  });

  it("dòng khớp khởi tạo lines mặc định = full đơn (merge product trùng, bỏ item thiếu product)", () => {
    const { rows } = addScanRow([], "VD-1", order());
    const row = rows[0];
    if (row.kind !== "matched") throw new Error("expected matched row");
    expect(row.lines).toEqual([
      { product_id: 10, sku: "SKU-10", name: "SP 10", quantity: "5", max: 5 },
    ]);
  });

  it("thêm dòng không khớp (order null)", () => {
    const { rows } = addScanRow([], "VD-LOST", null);
    expect(rows[0]).toEqual({ kind: "unmatched", code: "VD-LOST" });
  });

  it("chặn trùng mã đã quét", () => {
    const first = addScanRow([], "VD-LOST", null).rows;
    const { rows, duplicate } = addScanRow(first, "VD-LOST", null);
    expect(duplicate).toBe(true);
    expect(rows).toHaveLength(1);
  });

  it("chặn trùng đơn đã quét bằng mã khác", () => {
    const first = addScanRow([], "VD-1", order()).rows;
    const { duplicate } = addScanRow(first, "VD-1-ALT", order());
    expect(duplicate).toBe(true);
  });
});

describe("setReturnLineQuantity", () => {
  it("sửa số lượng đúng dòng theo (mã, product), giữ nguyên dòng khác", () => {
    const rows = [matchedRow("VD-1", twoProductOrder())];
    const next = setReturnLineQuantity(rows, "VD-1", 20, "0");
    const row = next[0];
    if (row.kind !== "matched") throw new Error("expected matched row");
    expect(row.lines).toEqual([
      { product_id: 10, sku: "SKU-10", name: "SP 10", quantity: "1", max: 1 },
      { product_id: 20, sku: "SKU-20", name: "SP 20", quantity: "0", max: 1 },
    ]);
  });

  it("nhập vượt số lượng đơn gốc → kẹp về max", () => {
    const rows = [matchedRow("VD-1", order())];
    const next = setReturnLineQuantity(rows, "VD-1", 10, "99");
    const row = next[0];
    if (row.kind !== "matched") throw new Error("expected matched row");
    expect(row.lines[0].quantity).toBe("5");
  });

  it("cho phép chuỗi rỗng khi đang gõ dở", () => {
    const rows = [matchedRow("VD-1", order())];
    const next = setReturnLineQuantity(rows, "VD-1", 10, "");
    const row = next[0];
    if (row.kind !== "matched") throw new Error("expected matched row");
    expect(row.lines[0].quantity).toBe("");
  });

  it("không đụng row khác mã", () => {
    const rows = [
      matchedRow("VD-1", order()),
      matchedRow("VD-2", order({ order_id: 2, shipping_code: "VD-2" })),
    ];
    const next = setReturnLineQuantity(rows, "VD-2", 10, "2");
    const first = next[0];
    if (first.kind !== "matched") throw new Error("expected matched row");
    expect(first.lines[0].quantity).toBe("5");
  });
});

describe("buildReturnPayloads", () => {
  it("dòng khớp: có đơn + khách + lines merge trùng product, bỏ item thiếu product", () => {
    const rows = [matchedRow("VD-1", order())];
    const [p] = buildReturnPayloads(rows, 7);
    expect(p).toEqual({
      warehouse_id: 7,
      shipping_code: "VD-1",
      source_order_id: 1,
      customer_name: "Khách A",
      customer_phone: "0900000000",
      scan_batch_id: null,
      auto_post: true,
      lines: [{ product_id: 10, quantity: 5, return_type: "delivery_returned" }],
    });
  });

  it("hoàn một phần: chỉ mang dòng còn số lượng > 0 sau khi sửa", () => {
    let rows = [matchedRow("VD-1", twoProductOrder())];
    rows = setReturnLineQuantity(rows, "VD-1", 20, "0");
    const [p] = buildReturnPayloads(rows, 7);
    expect(p.lines).toEqual([{ product_id: 10, quantity: 1, return_type: "delivery_returned" }]);
  });

  it("dòng đang gõ dở (rỗng) coi như 0 — không mang vào payload", () => {
    let rows = [matchedRow("VD-1", twoProductOrder())];
    rows = setReturnLineQuantity(rows, "VD-1", 10, "");
    const [p] = buildReturnPayloads(rows, 7);
    expect(p.lines).toEqual([{ product_id: 20, quantity: 1, return_type: "delivery_returned" }]);
  });

  it("row mà mọi dòng đều 0 → không sinh payload", () => {
    let rows = [matchedRow("VD-1", twoProductOrder())];
    rows = setReturnLineQuantity(rows, "VD-1", 10, "0");
    rows = setReturnLineQuantity(rows, "VD-1", 20, "0");
    expect(buildReturnPayloads(rows, 7)).toHaveLength(0);
  });

  it("gắn scan_batch_id của đợt quét vào mọi payload", () => {
    const rows = [matchedRow("VD-1", order())];
    const [p] = buildReturnPayloads(rows, 7, "batch-uuid-1");
    expect(p.scan_batch_id).toBe("batch-uuid-1");
  });

  it("gắn auto_post=true để ghi sổ ngay cho dòng khớp đơn", () => {
    const rows = [matchedRow("VD-1", order())];
    const [p] = buildReturnPayloads(rows, 7);
    expect(p.auto_post).toBe(true);
  });

  it("dòng không khớp: không sinh payload (đi qua pending-scans)", () => {
    const rows: ScanReturnRow[] = [{ kind: "unmatched", code: "VD-LOST" }];
    const payloads = buildReturnPayloads(rows, 7);
    expect(payloads).toHaveLength(0);
  });

  it("chỉ trả payload cho dòng khớp, mỗi dòng hàng mang loại mặc định Hàng hoàn", () => {
    const rows: ScanReturnRow[] = [
      matchedRow("VD-1", order()),
      { kind: "unmatched", code: "VD-404" },
    ];
    const payloads = buildReturnPayloads(rows, 3);
    expect(payloads).toHaveLength(1);
    expect(payloads[0].shipping_code).toBe("VD-1");
    expect(payloads[0].lines.every((l) => l.return_type === "delivery_returned")).toBe(true);
  });
});

describe("codesWithoutReturnQuantity", () => {
  it("trả mã các row khớp mà tổng số lượng hoàn = 0", () => {
    let rows = [
      matchedRow("VD-1", twoProductOrder()),
      matchedRow("VD-2", order({ order_id: 2, shipping_code: "VD-2" })),
    ];
    rows = setReturnLineQuantity(rows, "VD-1", 10, "0");
    rows = setReturnLineQuantity(rows, "VD-1", 20, "");
    expect(codesWithoutReturnQuantity(rows)).toEqual(["VD-1"]);
  });

  it("mọi row còn số lượng → mảng rỗng; row unmatched không tính", () => {
    const rows: ScanReturnRow[] = [
      matchedRow("VD-1", order()),
      { kind: "unmatched", code: "VD-404" },
    ];
    expect(codesWithoutReturnQuantity(rows)).toEqual([]);
  });
});

describe("unmatchedCodes", () => {
  it("trả đúng danh sách mã của dòng chưa khớp, giữ nguyên thứ tự rows", () => {
    const rows: ScanReturnRow[] = [
      matchedRow("VD-1", order()),
      { kind: "unmatched", code: "VD-404" },
      { kind: "unmatched", code: "VD-405" },
    ];
    expect(unmatchedCodes(rows)).toEqual(["VD-404", "VD-405"]);
  });

  it("không có dòng chưa khớp → mảng rỗng", () => {
    const rows: ScanReturnRow[] = [matchedRow("VD-1", order())];
    expect(unmatchedCodes(rows)).toEqual([]);
  });
});
