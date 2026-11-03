import { describe, expect, it } from "vitest";

import type { OrderRow } from "@/features/orders/order-types";
import {
  applyPendingToOrder,
  mergePendingPatch,
  omitKeys,
  type PendingRows,
} from "@/features/orders/order-detail/order-detail-draft";

describe("mergePendingPatch", () => {
  it("field thường ghi đè, crm/recall deep-merge với pending trước đó", () => {
    let pending: PendingRows = {};
    pending = mergePendingPatch(pending, { name: "A" } as Partial<OrderRow>);
    pending = mergePendingPatch(pending, { crm: { rating: 3 } } as unknown as Partial<OrderRow>);
    pending = mergePendingPatch(pending, {
      name: "B",
      crm: { note: "x" },
      recall: { status: "done" },
    } as unknown as Partial<OrderRow>);
    expect(pending).toEqual({
      name: "B",
      crm: { rating: 3, note: "x" },
      recall: { status: "done" },
    });
  });

  it("không đụng object pending cũ", () => {
    const prev = { crm: { rating: 1 } } as unknown as PendingRows;
    mergePendingPatch(prev, { crm: { rating: 2 } } as unknown as Partial<OrderRow>);
    expect(prev).toEqual({ crm: { rating: 1 } });
  });
});

describe("applyPendingToOrder", () => {
  it("giữ field crm/recall chưa sửa khi gộp pending", () => {
    const order = {
      id: 1,
      name: "Gốc",
      crm: { rating: 5, note: "cũ" },
      recall: { status: "new", owner: "A" },
    } as unknown as OrderRow;
    const merged = applyPendingToOrder(order, {
      name: "Mới",
      crm: { note: "mới" },
      recall: { status: "done" },
    } as unknown as PendingRows) as unknown as Record<string, unknown>;
    expect(merged.name).toBe("Mới");
    expect(merged.crm).toEqual({ rating: 5, note: "mới" });
    expect(merged.recall).toEqual({ status: "done", owner: "A" });
  });

  it("không có pending → giữ nguyên nội dung đơn", () => {
    const order = { id: 2, name: "X", crm: null } as unknown as OrderRow;
    expect(applyPendingToOrder(order, {})).toEqual(order);
  });
});

describe("omitKeys", () => {
  it("bỏ các key bị khoá", () => {
    expect(
      omitKeys({ name: "A", shipping_fee: "10" } as Partial<OrderRow>, ["shipping_fee"]),
    ).toEqual({ name: "A" });
  });
});
