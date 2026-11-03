/**
 * Helper phân loại field bị khoá khi đơn đã có mã hóa đơn — khối Sản phẩm + Tài chính.
 * Xem docs/invoice-code-edit-lock.md.
 */
import { describe, expect, it } from "vitest";

import {
  INVOICE_LOCKED_PATCH_FIELDS,
  isInvoiceLocked,
  pickInvoiceLockedFields,
} from "@/features/orders/invoice-lock";
import type { OrderRow } from "@/features/orders/order-types";

describe("helper invoice-lock", () => {
  it("dùng cờ của backend khi có", () => {
    expect(isInvoiceLocked({ is_invoice_locked: true, invoice_code: "" })).toBe(true);
    expect(isInvoiceLocked({ is_invoice_locked: false, invoice_code: "HD-1" })).toBe(false);
  });

  it("fallback về invoice_code cho row cũ chưa có cờ", () => {
    expect(isInvoiceLocked({ invoice_code: "HD-1" } as OrderRow)).toBe(true);
    expect(isInvoiceLocked({ invoice_code: "   " } as OrderRow)).toBe(false);
    expect(isInvoiceLocked({ invoice_code: "" } as OrderRow)).toBe(false);
  });

  it("khoá đúng khối Sản phẩm + Tài chính", () => {
    for (const key of [
      "items",
      "sku",
      "quantity",
      "weight",
      "dimensions",
      "total_amount",
      "discount_amount",
      "booking_voucher_discount",
      "other_price",
      "customer_prepaid",
      "total_after_discount",
    ]) {
      expect(INVOICE_LOCKED_PATCH_FIELDS.has(key)).toBe(true);
    }
  });

  it("không khoá lẫn sang nhóm khác", () => {
    for (const key of [
      "name",
      "phone",
      "address",
      "raw_address",
      "shipping_fee",
      "payment_method",
      "channel_code",
      "kiotviet_channel_id",
      "staff_id",
      "branch_id",
      "created_at",
      "shipping_code",
      "invoice_code",
      "fulfillment_warehouse",
      "status",
      "vat",
      "crm",
      "recall",
    ]) {
      expect(INVOICE_LOCKED_PATCH_FIELDS.has(key)).toBe(false);
    }
  });

  it("lọc đúng field bị khoá trong payload trộn", () => {
    const blocked = pickInvoiceLockedFields({
      quantity: 5,
      total_amount: "999000",
      name: "Ten Moi",
      crm: { internal_note: "ghi chu" },
    });

    expect(blocked.sort()).toEqual(["quantity", "total_amount"]);
  });
});
