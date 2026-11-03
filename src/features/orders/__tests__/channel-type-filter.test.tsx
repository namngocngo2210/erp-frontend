import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

import type { OrderRow } from "@/features/orders/order-types";
import { useOrdersFilterMirror } from "@/features/orders/orders-table/use-filter-mirror";
import { useOrdersData } from "@/features/orders/use-orders-data";
import { createDefaultStoredFilters, useOrdersFilters } from "@/features/orders/use-orders-filters";
import { I18nProvider } from "@/i18n";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), message: vi.fn() },
}));

afterEach(cleanup);

/**
 * Bộ lọc "Loại kênh" (Shopee/TikTok/Facebook/Web). Bám khuôn shipping-type.test.tsx:
 * test qua `useOrdersData` vì đó là nơi payload THẬT được dựng (buildBody trong
 * use-orders-table.ts + filtersToLoadOverrides trong use-orders-filters.ts).
 */
describe("useOrdersData — payload channel_type", () => {
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

  beforeEach(() => {
    localStorage.clear();
  });

  it("chọn 'shopee' → request gửi channel_type: ['shopee']", async () => {
    const { result, fetchJson } = setup();

    act(() => {
      result.current.setChannelType(["shopee"]);
    });
    await act(async () => {
      await result.current.loadOrders();
    });

    expect(lastRequestBody(fetchJson).channel_type).toEqual(["shopee"]);
  });

  it("token 'none' (chưa phân loại) đi nguyên vẹn lên server", async () => {
    const { result, fetchJson } = setup();

    act(() => {
      result.current.setChannelType(["none", "shopee"]);
    });
    await act(async () => {
      await result.current.loadOrders();
    });

    // buildBody sort + dedup nên so sánh theo tập đã sắp.
    expect(lastRequestBody(fetchJson).channel_type).toEqual(["none", "shopee"]);
  });

  it("bấm Xoá lọc → request kế tiếp KHÔNG còn channel_type", async () => {
    const { result, fetchJson } = setup();

    act(() => {
      result.current.setChannelType(["shopee"]);
    });
    await act(async () => {
      await result.current.clearFilters();
    });

    expect(lastRequestBody(fetchJson).channel_type).toBeUndefined();
    // State phải về rỗng, nếu không thì nhịp lọc TIẾP THEO mới rò (xem test dưới).
    expect(result.current.channelType).toEqual([]);
  });

  it("sau Xoá lọc, đổi một trục lọc KHÁC → request đó cũng không rò lại channel_type", async () => {
    // Bẫy trễ một nhịp: thiếu setChannelType(defaults.channelType) trong reset()
    // thì test trên vẫn xanh (clearFilters ép override cứng ở LẦN GỌI ĐÓ) nhưng
    // state trong closure vẫn còn "shopee" và rò ở lần đổi filter kế tiếp.
    const { result, fetchJson } = setup();

    act(() => {
      result.current.setChannelType(["shopee"]);
    });
    await act(async () => {
      await result.current.clearFilters();
    });

    act(() => {
      result.current.setVat(["1"]);
    });
    await act(async () => {
      await result.current.loadOrders({ vat: ["1"] });
    });

    expect(lastRequestBody(fetchJson).channel_type).toBeUndefined();
  });
});

/**
 * Đối chiếu phía client cho hàng realtime (WS order.created/updated): hàng mới
 * chỉ được chèn vào bảng khi nó khớp bộ lọc đang bật, nếu không danh sách "nhảy
 * ra" đơn mà bộ lọc đáng lẽ giấu.
 */
describe("mirror bộ lọc channel_type cho hàng realtime", () => {
  function setup() {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <I18nProvider>{children}</I18nProvider>
    );
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

  it("giữ hàng có channel_type khớp, loại hàng không khớp", () => {
    const result = setup();
    act(() => {
      result.current.filters.setChannelType(["shopee"]);
    });

    expect(result.current.mirror.rowPassesActiveFilters(row({ channel_type: "shopee" }))).toBe(
      true,
    );
    expect(result.current.mirror.rowPassesActiveFilters(row({ channel_type: "tiktok" }))).toBe(
      false,
    );
  });

  it("token 'none' chỉ khớp hàng chưa phân loại", () => {
    const result = setup();
    act(() => {
      result.current.filters.setChannelType(["none"]);
    });

    expect(result.current.mirror.rowPassesActiveFilters(row({ channel_type: null }))).toBe(true);
    expect(result.current.mirror.rowPassesActiveFilters(row({ channel_type: "shopee" }))).toBe(
      false,
    );
  });

  it("không lọc loại kênh → mọi hàng đều qua", () => {
    const result = setup();
    expect(result.current.mirror.rowPassesActiveFilters(row({ channel_type: null }))).toBe(true);
    expect(result.current.mirror.rowPassesActiveFilters(row({ channel_type: "tiktok" }))).toBe(
      true,
    );
  });
});
