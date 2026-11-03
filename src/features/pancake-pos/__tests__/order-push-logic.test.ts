import { describe, expect, it } from "vitest";

import type { PancakePosRoutingContext } from "@/lib/api/pancakePos";
import {
  actionsFor,
  asOrderLinkStatus,
  defaultWarehouse,
  remainingByProduct,
  singleWarehouseParts,
  splitParts,
  suggestSplit,
} from "@/features/pancake-pos/order-push-logic";

const ctx: PancakePosRoutingContext = {
  order_id: 7,
  name: "Khách",
  order_source: "landing",
  lines: [
    { product_id: 1, sku: "A", name: "SP A", quantity: 3 },
    { product_id: 2, sku: "B", name: "SP B", quantity: 1 },
  ],
  warehouses: [
    {
      warehouse_id: 10,
      name: "ĐM1",
      pancake_warehouse_id: "p1",
      enough: false,
      stock: { "1": 2, "2": 0 },
    },
    {
      warehouse_id: 20,
      name: "ĐM2",
      pancake_warehouse_id: "p2",
      enough: false,
      stock: { "1": 5, "2": 1 },
    },
  ],
  links: [],
};

describe("actionsFor", () => {
  it("cần chọn cách xuất: chọn kho + thử lại, không Vẫn đẩy", () => {
    expect(
      actionsFor({ status: "needs_routing", pancake_order_id: null, last_error: "x" }),
    ).toEqual({
      retry: true,
      force: false,
      route: true,
    });
  });

  it("trùng: thử lại + Vẫn đẩy, không chọn kho", () => {
    expect(
      actionsFor({ status: "skipped_duplicate", pancake_order_id: null, last_error: "" }),
    ).toEqual({
      retry: true,
      force: true,
      route: false,
    });
  });

  it("đang đẩy: không nút nào", () => {
    expect(actionsFor({ status: "pushing", pancake_order_id: null, last_error: "" })).toEqual({
      retry: false,
      force: false,
      route: false,
    });
  });

  it("đã đẩy: chỉ thử lại (đối chiếu) khi có lỗi sửa/huỷ", () => {
    expect(actionsFor({ status: "pushed", pancake_order_id: "P1", last_error: "" }).retry).toBe(
      false,
    );
    const withError = actionsFor({
      status: "updated",
      pancake_order_id: "P1",
      last_error: "PUT lỗi",
    });
    expect(withError).toEqual({ retry: true, force: false, route: false });
  });

  it("trạng thái lạ coi như lỗi", () => {
    expect(asOrderLinkStatus("weird")).toBe("error");
  });
});

describe("chọn cách xuất", () => {
  it("một kho: cần chọn kho", () => {
    expect(singleWarehouseParts(null)).toEqual({ ok: false, error: "noWarehouse" });
    expect(singleWarehouseParts(20)).toEqual({ ok: true, parts: [{ warehouse_id: 20 }] });
  });

  it("kho mặc định: kho đủ đầu tiên, không có thì kho đầu", () => {
    expect(defaultWarehouse(ctx)).toBe(10);
    const withEnough = {
      ...ctx,
      warehouses: [ctx.warehouses[0], { ...ctx.warehouses[1], enough: true }],
    };
    expect(defaultWarehouse(withEnough)).toBe(20);
    expect(defaultWarehouse(undefined)).toBeNull();
  });

  it("tách hợp lệ: tổng khớp, bỏ dòng 0", () => {
    const result = splitParts(ctx.lines, [
      { warehouseId: 10, quantities: { "1": "2" } },
      { warehouseId: 20, quantities: { "1": "1", "2": "1" } },
    ]);
    expect(result).toEqual({
      ok: true,
      parts: [
        { warehouse_id: 10, items: [{ product_id: 1, quantity: 2 }] },
        {
          warehouse_id: 20,
          items: [
            { product_id: 1, quantity: 1 },
            { product_id: 2, quantity: 1 },
          ],
        },
      ],
    });
  });

  it("tách sai: tổng lệch / kiện rỗng / số hỏng / thiếu kho", () => {
    expect(splitParts(ctx.lines, [{ warehouseId: 10, quantities: { "1": "3" } }])).toMatchObject({
      ok: false,
      error: "sumMismatch",
      productId: 2,
    });
    expect(
      splitParts(ctx.lines, [
        { warehouseId: 10, quantities: { "1": "3", "2": "1" } },
        { warehouseId: 20, quantities: {} },
      ]),
    ).toMatchObject({ ok: false, error: "emptyPart" });
    expect(splitParts(ctx.lines, [{ warehouseId: 10, quantities: { "1": "-1" } }])).toMatchObject({
      ok: false,
      error: "badQuantity",
    });
    expect(splitParts(ctx.lines, [{ warehouseId: null, quantities: { "1": "3" } }])).toMatchObject({
      ok: false,
      error: "noWarehouse",
    });
  });

  it("còn phải chia", () => {
    expect(remainingByProduct(ctx.lines, [{ warehouseId: 10, quantities: { "1": "2" } }])).toEqual({
      "1": 1,
      "2": 1,
    });
  });

  it("gợi ý tách theo tồn, lần lượt theo thứ tự kho", () => {
    const drafts = suggestSplit(ctx);
    expect(drafts).toEqual([
      { warehouseId: 10, quantities: { "1": "2" } },
      { warehouseId: 20, quantities: { "1": "1", "2": "1" } },
    ]);
    expect(splitParts(ctx.lines, drafts).ok).toBe(true);
  });

  it("gợi ý khi mọi kho thiếu: phần thiếu dồn kiện đầu", () => {
    const short = { ...ctx, warehouses: [{ ...ctx.warehouses[0], stock: { "1": 1 } }] };
    expect(suggestSplit(short)).toEqual([{ warehouseId: 10, quantities: { "1": "3", "2": "1" } }]);
  });
});
