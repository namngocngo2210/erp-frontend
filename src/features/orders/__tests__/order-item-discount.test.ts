import { describe, expect, it } from "vitest";

import {
  calculateItemsTotal,
  lineUnitDiscount,
  toEditableItems,
  type EditableOrderItem,
} from "@/features/orders/order-form/order-form-helpers";
import {
  sanitizeCreateOrderPayload,
  sanitizePatchOrderPayload,
} from "@/features/orders/order-payload";
import type { OrderItemRow, OrderRow } from "@/features/orders/order-types";

describe("lineUnitDiscount — tiền giảm cho MỖI sản phẩm của một dòng", () => {
  it("chế độ tiền: lấy nguyên discount đã nhập", () => {
    expect(lineUnitDiscount({ unit_price: "100000", discount: "15000" })).toBe(15000);
  });

  it("chế độ %: tính từ đơn giá, làm tròn 2 số lẻ", () => {
    expect(lineUnitDiscount({ unit_price: "33.33", discount_percent: "33.33" })).toBe(11.11);
  });

  it("không có giảm giá → 0", () => {
    expect(lineUnitDiscount({ unit_price: "100000" })).toBe(0);
  });

  it("không vượt đơn giá, không âm", () => {
    expect(lineUnitDiscount({ unit_price: "50000", discount: "70000" })).toBe(50000);
    expect(lineUnitDiscount({ unit_price: "50000", discount: "-5" })).toBe(0);
  });
});

describe("calculateItemsTotal trừ giảm giá dòng", () => {
  it("(đơn giá − giảm) × SL cho từng dòng", () => {
    const items: EditableOrderItem[] = [
      { quantity: 2, unit_price: "100000", discount: "10000" },
      { quantity: 1, unit_price: "50000", discount_percent: "10" },
    ];
    expect(calculateItemsTotal(items)).toBe(180000 + 45000);
  });
});

describe("toEditableItems giữ giảm giá dòng", () => {
  it("map discount + discount_percent từ đơn", () => {
    const order = {
      items: [
        {
          id: 1,
          product_id: 5,
          product_name: "SP",
          sku: "SKU",
          quantity: 2,
          unit_price: "100000.00",
          discount: "5000.00",
          discount_percent: "5.00",
          line_total: "190000.00",
        },
      ],
    } as unknown as OrderRow;
    expect(toEditableItems(order)[0]).toMatchObject({
      discount: "5000.00",
      discount_percent: "5.00",
    });
  });
});

describe("sanitizeCreateOrderPayload gửi giảm giá dòng", () => {
  it("chế độ %: gửi cả discount_percent lẫn discount đã quy ra tiền", () => {
    const out = sanitizeCreateOrderPayload({
      channel_code: "CH1",
      name: "A",
      phone: "0900",
      items: [{ sku: "S", quantity: 2, unit_price: "100000", discount_percent: "10" }],
    });
    expect(out.items?.[0]).toMatchObject({ discount: "10000", discount_percent: "10" });
  });

  it("chế độ tiền: gửi discount, discount_percent = null để bỏ chế độ %", () => {
    const out = sanitizeCreateOrderPayload({
      channel_code: "CH1",
      name: "A",
      phone: "0900",
      items: [{ sku: "S", quantity: 1, unit_price: "100000", discount: "1,500" }],
    });
    expect(out.items?.[0]).toMatchObject({ discount: "1500", discount_percent: null });
  });

  it("không giảm giá: không gửi discount/discount_percent", () => {
    const out = sanitizeCreateOrderPayload({
      channel_code: "CH1",
      name: "A",
      phone: "0900",
      items: [{ sku: "S", quantity: 1, unit_price: "100000" }],
    });
    expect(out.items?.[0]).not.toHaveProperty("discount");
    expect(out.items?.[0]).not.toHaveProperty("discount_percent");
  });
});

describe("sanitizePatchOrderPayload chuẩn hoá giảm giá dòng (trang chi tiết PATCH cả OrderItemRow)", () => {
  const row = (overrides: Partial<OrderItemRow>): OrderItemRow => ({
    id: 1,
    product_id: 5,
    product_name: "SP",
    sku: "SKU",
    quantity: 2,
    unit_price: "100000",
    line_total: "200000",
    ...overrides,
  });

  it("chế độ % vừa bật, chưa gõ (discount '' / percent '') → không gửi discount, không gửi percent", () => {
    const out = sanitizePatchOrderPayload({ items: [row({ discount: "", discount_percent: "" })] });
    expect(out.items?.[0]).not.toHaveProperty("discount");
    expect(out.items?.[0]).not.toHaveProperty("discount_percent");
  });

  it("chế độ %: gửi percent + tiền đã quy đổi", () => {
    const out = sanitizePatchOrderPayload({
      items: [row({ discount: "", discount_percent: "10" })],
    });
    expect(out.items?.[0]).toMatchObject({ discount: "10000", discount_percent: "10" });
  });

  it("chế độ tiền: gửi discount, percent null; discount '' → bỏ", () => {
    const out = sanitizePatchOrderPayload({
      items: [
        row({ discount: "1500", discount_percent: null }),
        row({ discount: "", discount_percent: null }),
      ],
    });
    expect(out.items?.[0]).toMatchObject({ discount: "1500", discount_percent: null });
    expect(out.items?.[1]).not.toHaveProperty("discount");
  });

  it("không có items → không đụng payload", () => {
    expect(sanitizePatchOrderPayload({ name: "A" })).toEqual({ name: "A" });
  });
});
