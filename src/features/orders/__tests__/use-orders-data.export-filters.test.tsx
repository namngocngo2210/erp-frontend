import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

import { I18nProvider } from "@/i18n";
import { useOrdersData } from "@/features/orders/use-orders-data";

/**
 * Snapshot bộ lọc cho "xuất toàn bộ theo bộ lọc" (getOrdersExportFilters).
 *
 * Backend khóa cứng tập đơn theo `section` (_section_filter_overrides) nên MỌI
 * trang đơn (orders/koc/landing) đều xuất-theo-filter được khi không
 * chọn row — snapshot phải khác null sau mỗi lần load danh sách. Ngoại lệ duy
 * nhất: Landing Sheet 3 dùng endpoint riêng với ràng buộc ngoài bộ lọc chung
 * (thiếu thông tin + loại trạng thái đã đóng) → snapshot phải là null để nút
 * xuất quay về "bắt chọn row".
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

describe("getOrdersExportFilters — snapshot xuất toàn bộ theo bộ lọc", () => {
  it("trang Đơn hàng: snapshot có sau khi load, không mang limit/offset/sort", async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.loadOrders();
    });

    const snapshot = result.current.getOrdersExportFilters();
    expect(snapshot).not.toBeNull();
    expect(snapshot).not.toHaveProperty("limit");
    expect(snapshot).not.toHaveProperty("offset");
    expect(snapshot).not.toHaveProperty("sort");
  });

  it("trang KOC: snapshot có (backend tự khóa order_source=koc theo section)", async () => {
    const { result } = setup();
    act(() => {
      result.current.setKocMode(true);
    });
    await act(async () => {
      await result.current.loadOrders();
    });
    expect(result.current.getOrdersExportFilters()).not.toBeNull();
  });

  it("Landing Sheet 1: snapshot có và mang sheet=1 để backend phân sheet", async () => {
    const { result } = setup();
    act(() => {
      result.current.setLandingMode(true);
      result.current.switchFilterScope("landing-sheet1");
    });
    await act(async () => {
      await result.current.loadOrders();
    });

    const snapshot = result.current.getOrdersExportFilters();
    expect(snapshot).not.toBeNull();
    expect(snapshot).toMatchObject({ sheet: "1" });
  });

  it("Landing Sheet 3: snapshot null — vẫn bắt chọn row khi xuất", async () => {
    const { result } = setup();
    act(() => {
      result.current.setLandingMode(true);
      result.current.switchFilterScope("landing-sheet3");
    });
    await act(async () => {
      await result.current.loadOrders();
    });
    expect(result.current.getOrdersExportFilters()).toBeNull();
  });

  it("rời Sheet 3 về Sheet 1: snapshot có lại (không kẹt null)", async () => {
    const { result } = setup();
    act(() => {
      result.current.setLandingMode(true);
      result.current.switchFilterScope("landing-sheet3");
    });
    await act(async () => {
      await result.current.loadOrders();
    });
    act(() => {
      result.current.switchFilterScope("landing-sheet1");
    });
    await act(async () => {
      await result.current.loadOrders();
    });
    expect(result.current.getOrdersExportFilters()).not.toBeNull();
  });
});
