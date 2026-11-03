import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, cleanup, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import { I18nProvider } from "@/i18n";
import { useOrdersData } from "@/features/orders/use-orders-data";
import type { OrderRow } from "@/features/orders/order-types";

// 7.1a — statusCounts (chip lọc trạng thái) không được đứng yên sau patchOrder: chip
// đổi trạng thái của MỘT đơn phải biết chắc key cũ/mới (statusChipKeyFor) và điều
// chỉnh delta cục bộ ngay lập tức, không đợi loadOrders kế tiếp. Xem
// order-status-counts.ts + docs/audit-followups-2026-07-13.md (Task 7 chip semantics).

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), message: vi.fn() },
}));

afterEach(cleanup);

const baseRow = (overrides: Partial<OrderRow> = {}): OrderRow =>
  ({
    id: 1,
    channel_code: "CH1",
    customer_phone: "0900000000",
    customer_code: "KH1",
    status: 1,
    invoice_status: null,
    total_amount: "0",
    shipping_fee: "0",
    shipping_code: "SC1",
    can_edit: true,
    ...overrides,
  }) as OrderRow;

function setup() {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <I18nProvider>{children}</I18nProvider>
  );
  const fetchJson = vi.fn();
  const { result } = renderHook(() => useOrdersData(fetchJson), { wrapper });
  return { result, fetchJson };
}

describe("useOrdersData — statusCounts revalidation after patchOrder (7.1a)", () => {
  it("moves the row's own count from the old status key to the new one, without waiting for a reload", async () => {
    const { result, fetchJson } = setup();

    // Seed rows + statusCounts via loadOrders, mimicking a real /api/orders POST response.
    fetchJson.mockResolvedValueOnce({
      items: [baseRow({ id: 1, status: 1 }), baseRow({ id: 2, status: 1 })],
      count: 2,
      status_counts: { "1": 2, "3": 0 },
    });
    await act(async () => {
      await result.current.loadOrders();
    });
    expect(result.current.statusCounts).toEqual({ "1": 2, "3": 0 });

    // patchOrder(1, { status: 3 }) — server echoes the updated row.
    fetchJson.mockResolvedValueOnce({ id: 1, status: 3 });
    await act(async () => {
      await result.current.patchOrder(1, { status: 3 }, true);
    });

    await waitFor(() => {
      expect(result.current.statusCounts).toEqual({ "1": 1, "3": 1 });
    });
  });

  it("moves the count into the cancelled key ('6') when invoice_status becomes 2", async () => {
    const { result, fetchJson } = setup();

    fetchJson.mockResolvedValueOnce({
      items: [baseRow({ id: 5, status: 2 })],
      count: 1,
      status_counts: { "2": 1, "6": 3 },
    });
    await act(async () => {
      await result.current.loadOrders();
    });
    expect(result.current.statusCounts).toEqual({ "2": 1, "6": 3 });

    fetchJson.mockResolvedValueOnce({ id: 5, status: 2, invoice_status: 2 });
    await act(async () => {
      await result.current.patchOrder(5, { invoice_status: 2 }, true);
    });

    await waitFor(() => {
      expect(result.current.statusCounts).toEqual({ "2": 0, "6": 4 });
    });
  });

  it("burst 2 realtime patch cho CÙNG một đơn trong 1 batch không trừ delta 2 lần", async () => {
    // rowsRef chỉ được đồng bộ trong effect (sau commit) → nếu không cập nhật ngay
    // trong applyOrderPatchInMemory, patch thứ 2 tính oldKey từ snapshot cũ (status 1)
    // và trừ key "1" thêm một lần nữa (audit 2026-07-14).
    const { result, fetchJson } = setup();

    fetchJson.mockResolvedValueOnce({
      items: [baseRow({ id: 1, status: 1 })],
      count: 1,
      status_counts: { "1": 5, "2": 0, "3": 0 },
    });
    await act(async () => {
      await result.current.loadOrders();
    });

    // Hai event realtime liên tiếp cho cùng đơn: 1 → 2 rồi 2 → 3.
    act(() => {
      result.current.patchOrderFromRealtime(1, { status: 2 });
      result.current.patchOrderFromRealtime(1, { status: 3 });
    });

    await waitFor(() => {
      expect(result.current.statusCounts).toEqual({ "1": 4, "2": 0, "3": 1 });
    });
  });

  it("leaves statusCounts untouched when the patched field isn't status/invoice_status", async () => {
    const { result, fetchJson } = setup();

    fetchJson.mockResolvedValueOnce({
      items: [baseRow({ id: 9, status: 1 })],
      count: 1,
      status_counts: { "1": 1 },
    });
    await act(async () => {
      await result.current.loadOrders();
    });

    fetchJson.mockResolvedValueOnce({ id: 9, name: "New name" });
    await act(async () => {
      await result.current.patchOrder(9, { name: "New name" }, true);
    });

    await waitFor(() => {
      expect(result.current.rows.find((r) => r.id === 9)?.name).toBe("New name");
    });
    expect(result.current.statusCounts).toEqual({ "1": 1 });
  });
});

// Reviewer follow-up: realtime patch trỏ tới đơn KHÔNG nằm trên trang hiện tại →
// không có row để suy delta, phải revalidate counts qua một request counts-only
// DEBOUNCED (burst webhook = 1 request), KHÔNG reload rows (giữ keep-row-on-user-edit,
// không nháy bảng).
describe("useOrdersData — off-page realtime patch revalidates counts (debounced)", () => {
  it("refetches counts once for a burst of off-page status events, without touching rows", async () => {
    vi.useFakeTimers();
    try {
      const { result, fetchJson } = setup();

      fetchJson.mockResolvedValueOnce({
        items: [baseRow({ id: 1, status: 1 })],
        count: 1,
        status_counts: { "1": 1, "3": 4 },
      });
      await act(async () => {
        await result.current.loadOrders();
      });
      expect(result.current.statusCounts).toEqual({ "1": 1, "3": 4 });
      expect(fetchJson).toHaveBeenCalledTimes(1);

      // Counts-only response cho lần revalidate debounced.
      fetchJson.mockResolvedValueOnce({
        items: [],
        count: 7,
        status_counts: { "1": 1, "3": 6 },
      });

      // Burst 2 event realtime cho 2 đơn đều KHÔNG có trên trang.
      act(() => {
        result.current.patchOrderFromRealtime(998, { status: 3 });
        result.current.patchOrderFromRealtime(999, { status: 3 });
      });
      // Chưa hết debounce → chưa có request nào thêm.
      expect(fetchJson).toHaveBeenCalledTimes(1);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });

      // Đúng 1 request counts-only (limit 1), counts cập nhật, rows giữ nguyên
      // (không reload list), pagination không đổi.
      expect(fetchJson).toHaveBeenCalledTimes(2);
      const [url, init] = fetchJson.mock.calls[1] as [string, RequestInit];
      expect(url).toBe("/api/orders");
      const body = JSON.parse(String(init.body)) as { limit?: number };
      expect(body.limit).toBe(1);
      expect(result.current.statusCounts).toEqual({ "1": 1, "3": 6 });
      expect(result.current.rows.map((r) => r.id)).toEqual([1]);
      expect(result.current.ordersTotalCount).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not refetch when the off-page patch doesn't touch status/invoice_status", async () => {
    vi.useFakeTimers();
    try {
      const { result, fetchJson } = setup();

      fetchJson.mockResolvedValueOnce({
        items: [baseRow({ id: 1, status: 1 })],
        count: 1,
        status_counts: { "1": 1 },
      });
      await act(async () => {
        await result.current.loadOrders();
      });

      act(() => {
        result.current.patchOrderFromRealtime(999, { shipping_code: "KS999" });
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(fetchJson).toHaveBeenCalledTimes(1);
      expect(result.current.statusCounts).toEqual({ "1": 1 });
    } finally {
      vi.useRealTimers();
    }
  });
});
