import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

import { I18nProvider } from "@/i18n";
import { useOrdersData } from "@/features/orders/use-orders-data";
import {
  createDefaultStoredFilters,
  filtersToLoadOverrides,
} from "@/features/orders/use-orders-filters";

/**
 * Lỗi "list không khớp bộ lọc đang hiển thị": mọi call site gọi loadOrders NGAY
 * sau khi đổi state filter (đổi scope tab/trang, xoá lọc) đều phải truyền override
 * ĐẦY ĐỦ — closure của loadOrders vẫn giữ state của render trước, nên trường nào
 * thiếu override sẽ âm thầm gửi giá trị CŨ lên server trong khi panel đã hiển thị
 * giá trị mới. Trước đây danh sách override được chép tay ở 6 nơi (App 4 nhánh,
 * RootLayout, clearFilters) nên cứ thêm filter mới là thiếu một chỗ.
 */

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), message: vi.fn() },
}));

beforeEach(() => {
  localStorage.clear();
});
afterEach(cleanup);

function setup() {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <I18nProvider>{children}</I18nProvider>
  );
  const fetchJson = vi.fn().mockResolvedValue({ items: [], count: 0 });
  const { result } = renderHook(() => useOrdersData(fetchJson), { wrapper });
  return { result, fetchJson };
}

function lastRequestBody(fetchJson: ReturnType<typeof vi.fn>): Record<string, unknown> {
  const calls = fetchJson.mock.calls;
  const call = calls[calls.length - 1];
  return JSON.parse((call[1] as RequestInit).body as string) as Record<string, unknown>;
}

/** Bật đủ mọi filter mà panel cho phép, để lần load kế tiếp phải xoá sạch. */
function applyEveryFilter(current: ReturnType<typeof setup>["result"]["current"]) {
  current.setQ("0900");
  current.setDateFilter({ option: "custom", from: "2020-01-01", to: "2020-01-31" });
  current.setReturnDateFilter({ option: "custom", from: "2020-02-01", to: "2020-02-05" });
  current.setKiotvietPurchaseDateFilter({ option: "custom", from: "2020-03-01", to: "2020-03-05" });
  current.setStatus(["1"]);
  current.setChannel(["fb"]);
  current.setProduct(["7"]);
  current.setStaff(["12"]);
  current.setDeliveryBusinessStatus(["dbs"]);
  current.setSalesStatus(["ss"]);
  current.setKiotvietChannel(["3"]);
  current.setBranchId(["b1"]);
  current.setInvoiceStatus(["2"]);
  current.setVat(["1"]);
  current.setOrderType(["purchase"]);
  current.setShippingType(["direct"]);
  current.setKocOrderType(["sample_gift"]);
  current.setHasShippingCode("true");
  current.setHasInvoiceCode("true");
  current.setIsDeliveryInvoicePrinted("yes");
  current.setCustomerReturn("yes");
  current.setHasInternalNote("yes");
  current.setHasAddress("yes");
  current.setHasReturnSlip("yes");
  current.setHasRecallCode("yes");
  current.setHasCallRecording("yes");
}

/** Khoá request tương ứng từng filter — vắng mặt = không lọc theo trục đó. */
const FILTER_BODY_KEYS = [
  "q",
  "date_from",
  "date_to",
  "return_date_from",
  "return_date_to",
  "kiotviet_purchase_date_from",
  "kiotviet_purchase_date_to",
  "status",
  "channel",
  "product",
  "staff",
  "delivery_business_status",
  "sales_status",
  "kiotviet_channel",
  "branch_id",
  "invoice_status",
  "vat",
  "order_type",
  "shipping_type",
  "koc_order_type",
  "has_shipping_code",
  "has_invoice_code",
  "is_delivery_invoice_printed",
  "customer_return",
  "has_internal_note",
  "has_address",
  "has_return_slip",
  "has_recall_code",
  "has_call_recording",
] as const;

describe("filtersToLoadOverrides", () => {
  it("phủ đúng tất cả trường của StoredOrderFilters (không thiếu trường nào)", () => {
    const stored = createDefaultStoredFilters();
    expect(Object.keys(filtersToLoadOverrides(stored)).sort()).toEqual(Object.keys(stored).sort());
  });
});

describe("useOrdersData — request phải khớp bộ lọc đang hiển thị", () => {
  it("clearFilters xoá MỌI filter khỏi request, kể cả vat/order_type/shipping_type", async () => {
    const { result, fetchJson } = setup();

    act(() => {
      applyEveryFilter(result.current);
    });
    await act(async () => {
      await result.current.clearFilters();
    });

    const body = lastRequestBody(fetchJson);
    const leaked = FILTER_BODY_KEYS.filter(
      (key) => key !== "date_from" && key !== "date_to" && key in body,
    );
    expect(leaked).toEqual([]);
  });

  it("đổi scope (tab/trang) rồi load với override đầy đủ → không mang filter của scope cũ", async () => {
    const { result, fetchJson } = setup();

    act(() => {
      applyEveryFilter(result.current);
    });

    let loaded = createDefaultStoredFilters();
    act(() => {
      loaded = result.current.switchFilterScope("koc");
    });
    await act(async () => {
      await result.current.loadOrders({ ...filtersToLoadOverrides(loaded), q: "" });
    });

    const body = lastRequestBody(fetchJson);
    const leaked = FILTER_BODY_KEYS.filter(
      (key) => key !== "date_from" && key !== "date_to" && key in body,
    );
    expect(leaked).toEqual([]);
  });
});
