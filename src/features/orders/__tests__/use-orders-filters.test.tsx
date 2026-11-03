import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { getDateRange } from "@/components/ui/date-filter";
import type { StoredOrderFilters } from "@/features/orders/use-orders-data";
import { useOrdersFilters } from "@/features/orders/use-orders-filters";

function makeStored(overrides: Partial<StoredOrderFilters> = {}): StoredOrderFilters {
  const range = getDateRange("this_month");
  return {
    dateFilter: { option: "this_month", from: range.from, to: range.to },
    returnDateFilter: { option: "custom", from: "", to: "" },
    kiotvietPurchaseDateFilter: { option: "custom", from: "", to: "" },
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
    ...overrides,
  };
}

describe("useOrdersFilters", () => {
  it("seeds từ storedFilters; q và kiotvietChannelNull/showOrders luôn rỗng", () => {
    const stored = makeStored({
      status: ["1", "2"],
      channel: ["fb"],
      hasShippingCode: "true",
      hasReturnSlip: "yes",
    });
    const { result } = renderHook(() => useOrdersFilters(stored));

    expect(result.current.status).toEqual(["1", "2"]);
    expect(result.current.channel).toEqual(["fb"]);
    expect(result.current.hasShippingCode).toBe("true");
    expect(result.current.hasReturnSlip).toBe("yes");
    expect(result.current.dateFilter).toEqual(stored.dateFilter);
    // Không seed từ stored — luôn khởi tạo rỗng.
    expect(result.current.q).toBe("");
    expect(result.current.kiotvietChannelNull).toBe("");
    expect(result.current.showOrders).toBe("");
  });

  it("setters cập nhật từng filter value", () => {
    const { result } = renderHook(() => useOrdersFilters(makeStored()));

    act(() => {
      result.current.setQ("0900");
      result.current.setStatus(["3"]);
      result.current.setBranchId(["b1", "b2"]);
      result.current.setShowOrders("true");
      result.current.setKiotvietChannelNull("false");
      result.current.setIsDeliveryInvoicePrinted("yes");
    });

    expect(result.current.q).toBe("0900");
    expect(result.current.status).toEqual(["3"]);
    expect(result.current.branchId).toEqual(["b1", "b2"]);
    expect(result.current.showOrders).toBe("true");
    expect(result.current.kiotvietChannelNull).toBe("false");
    expect(result.current.isDeliveryInvoicePrinted).toBe("yes");
  });

  it("reset() khôi phục defaults (this_month) nhưng KHÔNG đụng kiotvietChannelNull/showOrders", () => {
    const { result } = renderHook(() => useOrdersFilters(makeStored({ status: ["9"] })));

    act(() => {
      result.current.setQ("abc");
      result.current.setStatus(["1"]);
      result.current.setChannel(["fb"]);
      result.current.setHasShippingCode("true");
      result.current.setHasInvoiceCode("false");
      result.current.setIsDeliveryInvoicePrinted("no");
      result.current.setHasReturnSlip("no");
      // Hai filter mà clearFilters cũ không reset:
      result.current.setKiotvietChannelNull("true");
      result.current.setShowOrders("false");
    });

    act(() => {
      result.current.reset();
    });

    const range = getDateRange("this_month");
    expect(result.current.q).toBe("");
    expect(result.current.status).toEqual([]);
    expect(result.current.channel).toEqual([]);
    expect(result.current.hasShippingCode).toBe("");
    expect(result.current.hasInvoiceCode).toBe("");
    expect(result.current.isDeliveryInvoicePrinted).toBe("");
    expect(result.current.hasReturnSlip).toBe("");
    expect(result.current.dateFilter).toEqual({
      option: "this_month",
      from: range.from,
      to: range.to,
    });
    // Giữ nguyên — mirror hành vi clearFilters cũ.
    expect(result.current.kiotvietChannelNull).toBe("true");
    expect(result.current.showOrders).toBe("false");
  });

  it("exposes orderType filter state", () => {
    const { result } = renderHook(() => useOrdersFilters(makeStored()));
    expect(result.current.orderType).toEqual([]);
    act(() => {
      result.current.setOrderType(["same_product", "purchase"]);
    });
    expect(result.current.orderType).toEqual(["same_product", "purchase"]);
  });
});
