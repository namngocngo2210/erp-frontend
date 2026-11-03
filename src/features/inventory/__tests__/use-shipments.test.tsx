import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import type { OrderRow } from "@/features/orders/order-types";

// Hook trang Vận đơn đã chuyển sang react-query (lô 1 hợp nhất data-fetching).
// Contract giữ nguyên cho ShipmentsPage: rows/count/loading/filter setters/load/patchOrder.
// KHÔNG assert ngày cụ thể ở đây (dateFilter mặc định là "this_month" — bom lịch).

const fetchJsonMock = vi.fn();

vi.mock("@/services/http", () => ({
  fetchJson: (...args: unknown[]) => fetchJsonMock(...args),
}));

import { useShipments } from "../shipments/use-shipments";

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const ROW = { id: 7, name: "DH7" } as unknown as OrderRow;

function shipmentsCall(): { url: string; body: Record<string, unknown> } | null {
  const call = [...fetchJsonMock.mock.calls]
    .reverse()
    .find(([url]) => url === "/api/orders/shipments");
  if (!call) return null;
  return { url: call[0] as string, body: JSON.parse((call[1] as RequestInit).body as string) };
}

beforeEach(() => {
  fetchJsonMock.mockReset();
  fetchJsonMock.mockImplementation((url: string) => {
    if (url.startsWith("/api/warehouses")) {
      return Promise.resolve({ items: [{ id: 1, name: "Kho A" }], total: 1 });
    }
    if (url === "/api/orders/shipments") {
      return Promise.resolve({ items: [ROW], count: 1 });
    }
    if (/^\/api\/orders\/\d+$/.test(url)) {
      return Promise.resolve({ id: 7, name: "DH7-upd" });
    }
    return Promise.resolve({});
  });
});

afterEach(cleanup);

describe("useShipments (react-query)", () => {
  it("load lần đầu: POST /api/orders/shipments với limit/offset/sort, kèm date range", async () => {
    const { result } = renderHook(() => useShipments(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    expect(result.current.count).toBe(1);
    expect(result.current.warehouses).toEqual([{ id: 1, name: "Kho A" }]);

    const call = shipmentsCall();
    expect(call).not.toBeNull();
    expect(call?.body.limit).toBe(50);
    expect(call?.body.offset).toBe(0);
    expect(call?.body.sort).toBe("newest");
    // dateFilter mặc định this_month → gửi đúng from/to đang giữ trong state
    expect(call?.body.date_from).toBe(result.current.dateFilter.from);
    expect(call?.body.date_to).toBe(result.current.dateFilter.to);
    // server đã khóa cứng 2 trường này — hook không được gửi
    expect(call?.body).not.toHaveProperty("has_shipping_code");
    expect(call?.body).not.toHaveProperty("sales_status");
  });

  it("filter status: chuẩn hóa (trim/unique/sort) và loại mã 6; đổi filter refetch với key mới", async () => {
    const { result } = renderHook(() => useShipments(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.rows).toHaveLength(1));

    act(() => {
      result.current.setStatus(["3", " 2 ", "3", "6"]);
    });
    await waitFor(() => expect(shipmentsCall()?.body.status).toEqual(["2", "3"]));
  });

  it("đổi pageSize về trang đầu; đổi page gửi offset mới", async () => {
    const { result } = renderHook(() => useShipments(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.rows).toHaveLength(1));

    act(() => {
      result.current.setPage(2);
    });
    await waitFor(() => expect(shipmentsCall()?.body.offset).toBe(100));

    act(() => {
      result.current.setPageSize(100);
    });
    await waitFor(() => expect(shipmentsCall()?.body.limit).toBe(100));
    expect(shipmentsCall()?.body.offset).toBe(0);
    expect(result.current.page).toBe(0);
  });

  it("patchOrder: PATCH rồi merge response server vào rows đang cache, không refetch list", async () => {
    const { result } = renderHook(() => useShipments(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    const listCallsBefore = fetchJsonMock.mock.calls.filter(
      ([url]) => url === "/api/orders/shipments",
    ).length;

    await act(async () => {
      await result.current.patchOrder(7, { name: "DH7-upd" } as Partial<OrderRow>);
    });

    expect(fetchJsonMock).toHaveBeenCalledWith("/api/orders/7", {
      method: "PATCH",
      body: JSON.stringify({ name: "DH7-upd" }),
    });
    // Thông báo observer của react-query là async → chờ render kế tiếp.
    await waitFor(() => expect(result.current.rows[0].name).toBe("DH7-upd"));
    const listCallsAfter = fetchJsonMock.mock.calls.filter(
      ([url]) => url === "/api/orders/shipments",
    ).length;
    expect(listCallsAfter).toBe(listCallsBefore);
  });

  it("patchOrder lỗi phải reject để trang toast được detail backend", async () => {
    const { result } = renderHook(() => useShipments(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.rows).toHaveLength(1));

    fetchJsonMock.mockImplementationOnce(() => Promise.reject(new Error("Đơn đã hủy")));
    await expect(result.current.patchOrder(7, {} as Partial<OrderRow>)).rejects.toThrow(
      "Đơn đã hủy",
    );
  });

  it("load() invalidate danh sách → refetch (thay cho refetch tay cũ, dùng cho ScanDispatchDialog.onDone)", async () => {
    const { result } = renderHook(() => useShipments(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    const before = fetchJsonMock.mock.calls.filter(
      ([url]) => url === "/api/orders/shipments",
    ).length;

    await act(async () => {
      await result.current.load();
    });

    const after = fetchJsonMock.mock.calls.filter(
      ([url]) => url === "/api/orders/shipments",
    ).length;
    expect(after).toBe(before + 1);
  });
});
