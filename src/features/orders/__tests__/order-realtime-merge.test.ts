import { describe, expect, it } from "vitest";
import { mergeOrderRowPatch } from "../order-realtime-merge";
import type { OrderRow } from "../order-types";

const baseRow = (overrides: Partial<OrderRow> = {}): OrderRow =>
  ({
    id: 101,
    invoice_code: "",
    shipping_code: "",
    status: 1,
    ...overrides,
  }) as OrderRow;

describe("mergeOrderRowPatch", () => {
  it("applies invoice_code from a realtime push event", () => {
    const merged = mergeOrderRowPatch(baseRow(), { invoice_code: "HD0001" });
    expect(merged.invoice_code).toBe("HD0001");
  });

  it("applies shipping_code from a realtime kship event", () => {
    const merged = mergeOrderRowPatch(baseRow(), { shipping_code: "KS123" });
    expect(merged.shipping_code).toBe("KS123");
  });

  it("does not mutate the original row", () => {
    const row = baseRow();
    mergeOrderRowPatch(row, { invoice_code: "HD0002" });
    expect(row.invoice_code).toBe("");
  });

  it("deep-merges crm without dropping existing crm fields", () => {
    const row = baseRow({
      crm: { sales_status_code: "old", sales_status_label: "Cũ" },
    } as Partial<OrderRow>);
    const merged = mergeOrderRowPatch(row, {
      crm: { sales_status_code: "created_order" },
    } as Partial<OrderRow>);
    expect(merged.crm).toEqual({
      sales_status_code: "created_order",
      sales_status_label: "Cũ",
    });
  });

  it("keeps untouched fields intact", () => {
    const merged = mergeOrderRowPatch(baseRow({ status: 1 }), { invoice_code: "HD3" });
    expect(merged.status).toBe(1);
  });
});
