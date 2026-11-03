import { describe, expect, it } from "vitest";

import {
  applyTwoUnitLineDiscount,
  calculateItemsTotal,
  type EditableOrderItem,
} from "@/features/orders/order-form/order-form-helpers";

describe("applyTwoUnitLineDiscount", () => {
  const base: EditableOrderItem = { quantity: 1, unit_price: "1500000" };

  it("SL chuyển sang 2 → giảm 100k/sp (200k cả dòng)", () => {
    const next = applyTwoUnitLineDiscount({ ...base, quantity: 2 }, 1, 2);
    expect(next.discount).toBe("100000");
    expect(next.discount_percent).toBeNull();
    expect(calculateItemsTotal([next])).toBe(2800000);
  });

  it("ghi đè giảm giá % đang có khi chuyển sang SL 2", () => {
    const next = applyTwoUnitLineDiscount({ ...base, quantity: 2, discount_percent: "10" }, 3, 2);
    expect(next.discount).toBe("100000");
    expect(next.discount_percent).toBeNull();
  });

  it("vẫn ở SL 2 → giữ giảm giá sale đã sửa tay", () => {
    const item = { ...base, quantity: 2, discount: "50000" };
    expect(applyTwoUnitLineDiscount(item, 2, 2)).toBe(item);
  });

  it("rời SL 2 → gỡ giảm giá tự điền", () => {
    const next = applyTwoUnitLineDiscount({ ...base, quantity: 3, discount: "100000" }, 2, 3);
    expect(next.discount).toBe("");
    expect(next.discount_percent).toBeNull();
  });

  it("rời SL 2 → giữ giảm giá sale nhập khác mức tự điền", () => {
    const item = { ...base, quantity: 1, discount: "50000" };
    expect(applyTwoUnitLineDiscount(item, 2, 1)).toBe(item);
  });

  it("SL khác 2 và trước đó không phải 2 → không đụng", () => {
    const item = { ...base, quantity: 3 };
    expect(applyTwoUnitLineDiscount(item, 1, 3)).toBe(item);
  });
});
