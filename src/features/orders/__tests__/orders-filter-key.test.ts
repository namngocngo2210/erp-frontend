import { describe, expect, it } from "vitest";

import { buildOrdersFilterKey } from "@/features/orders/orders-page/orders-filter-key";
import type { OrdersFilterValues } from "@/features/orders/orders-page/orders-page-props";

const base = {
  q: "",
  dateFilter: { mode: "all" },
  returnDateFilter: { mode: "all" },
  kiotvietPurchaseDateFilter: { mode: "all" },
  status: [],
  channel: [],
  product: [],
  staff: [],
  deliveryBusinessStatus: [],
  salesStatus: [],
  kiotvietChannel: [],
  branchId: [],
  fulfillmentWarehouse: [],
  invoiceStatus: [],
  vat: [],
  orderType: [],
  shippingType: [],
  channelType: [],
  kocOrderType: [],
  hasShippingCode: "",
  hasInvoiceCode: "",
  isDeliveryInvoicePrinted: "",
  customerReturn: "",
  hasInternalNote: "",
  hasAddress: "",
  hasReturnSlip: "",
  hasRecallCode: "",
  hasCallRecording: "",
  sort: "-created_at",
  visibleOrderColumns: ["channel_code"],
  lockedOrderColumns: [],
} as unknown as OrdersFilterValues;

describe("buildOrdersFilterKey", () => {
  it("đổi khi bộ lọc / sort / tab landing đổi", () => {
    const key = buildOrdersFilterKey(base, null);
    expect(buildOrdersFilterKey({ ...base, q: "0909" }, null)).not.toBe(key);
    expect(buildOrdersFilterKey({ ...base, status: ["1"] }, null)).not.toBe(key);
    expect(buildOrdersFilterKey(base, "sheet3")).not.toBe(key);
  });

  it("không đổi khi chỉ đổi cột hiển thị/khoá cột", () => {
    const key = buildOrdersFilterKey(base, "orders");
    expect(
      buildOrdersFilterKey(
        {
          ...base,
          visibleOrderColumns: [],
          lockedOrderColumns: ["channel_code"],
        } as unknown as OrdersFilterValues,
        "orders",
      ),
    ).toBe(key);
  });

  it("giữ đúng thứ tự khoá cũ (q đầu, landingTab cuối)", () => {
    const parsed = Object.keys(JSON.parse(buildOrdersFilterKey(base, null)));
    expect(parsed[0]).toBe("q");
    expect(parsed[parsed.length - 1]).toBe("landingTab");
    expect(parsed).not.toContain("visibleOrderColumns");
  });
});
