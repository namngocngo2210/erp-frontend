import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import type { ReactNode } from "react";

import type { OrderRow } from "@/features/orders/order-types";
import { OrdersFilterSheet } from "@/features/orders/orders-filters/OrdersFilterSheet";
import { buildOrdersFilterChips } from "@/features/orders/orders-filters/orders-filter-chips";
import { type OrdersFilterProps } from "@/features/orders/orders-filters/types";
import { useOrdersFilterMirror } from "@/features/orders/orders-table/use-filter-mirror";
import { useOrdersData } from "@/features/orders/use-orders-data";
import { createDefaultStoredFilters, useOrdersFilters } from "@/features/orders/use-orders-filters";
import { I18nProvider } from "@/i18n";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), message: vi.fn() },
}));

afterEach(cleanup);

const wrapper = ({ children }: { children: ReactNode }) => <I18nProvider>{children}</I18nProvider>;

/**
 * Bộ lọc "Kho xuất" (Order.fulfillment_warehouse, nhiều giá trị, token "none" =
 * chưa gán kho). Bám khuôn channel-type-filter.test.tsx: test payload thật qua
 * `useOrdersData`, mirror realtime qua `useOrdersFilterMirror`.
 */
describe("useOrdersData — payload fulfillment_warehouse", () => {
  function setup() {
    const fetchJson = vi.fn().mockResolvedValue({ items: [], count: 0 });
    const { result } = renderHook(() => useOrdersData(fetchJson), { wrapper });
    return { result, fetchJson };
  }

  function lastRequestBody(fetchJson: ReturnType<typeof vi.fn>): Record<string, unknown> {
    const calls = fetchJson.mock.calls;
    const call = calls[calls.length - 1];
    return JSON.parse((call[1] as RequestInit).body as string) as Record<string, unknown>;
  }

  beforeEach(() => {
    localStorage.clear();
  });

  it("chọn 2 kho → request gửi fulfillment_warehouse: ['12','7'] (đã sort)", async () => {
    const { result, fetchJson } = setup();

    act(() => {
      result.current.setFulfillmentWarehouse(["7", "12"]);
    });
    await act(async () => {
      await result.current.loadOrders();
    });

    expect(lastRequestBody(fetchJson).fulfillment_warehouse).toEqual(["12", "7"]);
  });

  it("token 'none' (chưa gán kho) đi nguyên vẹn lên server", async () => {
    const { result, fetchJson } = setup();

    act(() => {
      result.current.setFulfillmentWarehouse(["none"]);
    });
    await act(async () => {
      await result.current.loadOrders();
    });

    expect(lastRequestBody(fetchJson).fulfillment_warehouse).toEqual(["none"]);
  });

  it("không chọn kho → request không có fulfillment_warehouse", async () => {
    const { result, fetchJson } = setup();
    await act(async () => {
      await result.current.loadOrders();
    });
    expect(lastRequestBody(fetchJson).fulfillment_warehouse).toBeUndefined();
  });

  it("sau Xoá lọc, đổi một trục lọc KHÁC → request đó cũng không rò lại fulfillment_warehouse", async () => {
    const { result, fetchJson } = setup();

    act(() => {
      result.current.setFulfillmentWarehouse(["7"]);
    });
    await act(async () => {
      await result.current.clearFilters();
    });
    expect(result.current.fulfillmentWarehouse).toEqual([]);

    act(() => {
      result.current.setVat(["1"]);
    });
    await act(async () => {
      await result.current.loadOrders({ vat: ["1"] });
    });

    expect(lastRequestBody(fetchJson).fulfillment_warehouse).toBeUndefined();
  });
});

describe("mirror bộ lọc fulfillment_warehouse cho hàng realtime", () => {
  function setup() {
    return renderHook(
      () => {
        const filters = useOrdersFilters(createDefaultStoredFilters());
        const mirror = useOrdersFilterMirror(filters);
        return { filters, mirror };
      },
      { wrapper },
    ).result;
  }

  function row(overrides: Partial<OrderRow>): OrderRow {
    return { id: 1, ...overrides } as OrderRow;
  }

  it("giữ hàng có kho khớp, loại hàng khác kho", () => {
    const result = setup();
    act(() => {
      result.current.filters.setFulfillmentWarehouse(["7", "12"]);
    });

    const pass = result.current.mirror.rowPassesActiveFilters;
    expect(pass(row({ fulfillment_warehouse: 7 }))).toBe(true);
    expect(pass(row({ fulfillment_warehouse: 12 }))).toBe(true);
    expect(pass(row({ fulfillment_warehouse: 3 }))).toBe(false);
    expect(pass(row({ fulfillment_warehouse: null }))).toBe(false);
  });

  it("token 'none' chỉ khớp hàng chưa gán kho", () => {
    const result = setup();
    act(() => {
      result.current.filters.setFulfillmentWarehouse(["none"]);
    });

    const pass = result.current.mirror.rowPassesActiveFilters;
    expect(pass(row({ fulfillment_warehouse: null }))).toBe(true);
    expect(pass(row({}))).toBe(true);
    expect(pass(row({ fulfillment_warehouse: 7 }))).toBe(false);
  });

  it("không lọc kho → mọi hàng đều qua", () => {
    const result = setup();
    const pass = result.current.mirror.rowPassesActiveFilters;
    expect(pass(row({ fulfillment_warehouse: null }))).toBe(true);
    expect(pass(row({ fulfillment_warehouse: 7 }))).toBe(true);
  });
});

/** Chip + ô lọc trong ngăn kéo — chỉ những phần thuộc trục mới. */
describe("ô lọc Kho xuất — chip và ngăn kéo", () => {
  const t = (key: string, fallback?: string) => fallback ?? key;

  function makeProps(overrides: Partial<OrdersFilterProps> = {}): OrdersFilterProps {
    const noop = vi.fn();
    const base = {
      dateFilter: { option: "this_month", from: "2026-08-01", to: "2026-08-31" },
      returnDateFilter: { option: "custom", from: "", to: "" },
      kiotvietPurchaseDateFilter: { option: "custom", from: "", to: "" },
      kiotvietChannelOptions: [],
      selectedKiotvietChannelOptions: [],
      branchIdOptions: [],
      selectedBranchIdOptions: [],
      fulfillmentWarehouseOptions: [
        { value: "none", label: "Chưa gán kho" },
        { value: "7", label: "Kho HN" },
        { value: "12", label: "Kho SG" },
      ],
      selectedFulfillmentWarehouseOptions: [],
      hideChannelFilter: false,
      channelOptions: [],
      selectedChannelOptions: [],
      staffOptions: [],
      selectedStaffOptions: [],
      salesStatusOptions: [],
      selectedSalesStatusOptions: [],
      invoiceStatusOptions: [],
      invoiceStatus: [],
      vatOptions: [],
      vat: [],
      orderTypeOptions: [],
      orderType: [],
      shippingTypeOptions: [],
      channelTypeOptions: [],
      shippingType: [],
      channelType: [],
      isKoc: false,
      kocOrderTypeOptions: [],
      kocOrderType: [],
      statusOptions: [],
      status: [],
      deliveryBusinessStatusOptions: [],
      selectedDeliveryBusinessStatusOptions: [],
      hasShippingCode: "",
      isDeliveryInvoicePrinted: "",
      customerReturn: "",
      hasReturnSlip: "",
      hasRecallCode: "",
      hasCallRecording: "",
      hasInternalNote: "",
      hasAddress: "",
    };
    const handlers = Object.fromEntries(
      [
        "onDateFilterChange",
        "onReturnDateFilterChange",
        "onKiotvietPurchaseDateFilterChange",
        "onKiotvietChannelChange",
        "onBranchIdChange",
        "onFulfillmentWarehouseChange",
        "onChannelChange",
        "onStaffChange",
        "onSalesStatusChange",
        "onInvoiceStatusChange",
        "onVatChange",
        "onOrderTypeChange",
        "onShippingTypeChange",
        "onChannelTypeChange",
        "onKocOrderTypeChange",
        "onStatusChange",
        "onDeliveryBusinessStatusChange",
        "onHasShippingCodeChange",
        "onIsDeliveryInvoicePrintedChange",
        "onCustomerReturnChange",
        "onHasReturnSlipChange",
        "onHasRecallCodeChange",
        "onHasCallRecordingChange",
        "onHasInternalNoteChange",
        "onHasAddressChange",
        "onProductChange",
        "onClearFilters",
      ].map((name) => [name, noop]),
    );
    return {
      ...base,
      ...handlers,
      productOptions: [],
      selectedProductOptions: [],
      ...overrides,
    } as OrdersFilterProps;
  }

  it("chip 'Kho xuất' rút gọn nhiều lựa chọn và gỡ chip xoá đúng trục", () => {
    const onFulfillmentWarehouseChange = vi.fn();
    const props = makeProps({
      selectedFulfillmentWarehouseOptions: [
        { value: "7", label: "Kho HN" },
        { value: "none", label: "Chưa gán kho" },
      ],
      onFulfillmentWarehouseChange,
    });
    const chips = buildOrdersFilterChips(props, t);
    const chip = chips.find((c) => c.key === "fulfillmentWarehouse");
    expect(chip?.label).toBe("Kho xuất");
    expect(chip?.value).toBe("Kho HN +1");
    chip?.onClear();
    expect(onFulfillmentWarehouseChange).toHaveBeenCalledWith([]);
  });

  it("ngăn kéo có ô lọc Kho xuất trong nhóm Kênh & nhân viên", () => {
    render(
      <I18nProvider>
        <OrdersFilterSheet
          {...makeProps({
            selectedFulfillmentWarehouseOptions: [{ value: "7", label: "Kho HN" }],
          })}
          open
          onOpenChange={vi.fn()}
        />
      </I18nProvider>,
    );
    // Nhóm có điều kiện thì mở sẵn → ô lọc hiện ngay.
    expect(screen.getByLabelText("Kho xuất")).toBeInTheDocument();
  });
});
