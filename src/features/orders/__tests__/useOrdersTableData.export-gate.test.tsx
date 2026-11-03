import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

import { I18nProvider } from "@/i18n";
import { useOrdersTableData } from "@/features/orders/OrdersTable/useOrdersTableData";
import type { OrderRow } from "@/features/orders/order-types";

/**
 * Gate "xuất toàn bộ theo bộ lọc" phải đọc snapshot TẠI THỜI ĐIỂM BẤM NÚT.
 *
 * Lỗi gốc (prod 2026-08-06, trang Landing tab Tổng hợp): hook đọc
 * `getExportFilters()` — giá trị lấy từ một useRef ở tầng trên — ngay trong THÂN
 * RENDER. Ref mutation không gây re-render và không phải dependency hợp lệ, nên
 * React Compiler (bật ở vite.config với target 19) memo hóa biểu thức đó theo
 * [getExportFilters, selectedIds.length]. Cả hai đều bất biến trong tình huống
 * thường gặp nhất — `getExportFilters` là useCallback deps rỗng, `selectedIds.length`
 * đứng yên ở 0 — nên cache giữ NGUYÊN giá trị `null` của lần render đầu tiên
 * (lúc danh sách chưa load xong) và không bao giờ tính lại. Hệ quả: user mở thẳng
 * URL/F5 rồi bấm "Xuất Excel" luôn bị chặn bằng toast "chọn ít nhất một đơn",
 * dù snapshot bộ lọc đã sẵn sàng từ lâu.
 *
 * Test này mô phỏng đúng trình tự đó: render lần đầu khi ref còn null, ref được
 * set sau (như loadOrders làm), rồi bấm nút. Không được có toast, và payload
 * gửi lên phải là bộ lọc chứ không phải `ids`.
 *
 * Task 14: nút Xuất Excel không còn tải blob đồng bộ (`downloadFileFromApi` đã bị
 * xoá) mà tạo job nền qua `useExportJobs().startExport`. Các test dưới đây mock
 * thẳng provider đó thay vì mock `fetch`.
 */

const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => toastError(...args),
    success: vi.fn(),
    warning: vi.fn(),
    message: vi.fn(),
  },
}));

vi.mock("@/services/http", () => ({
  getValidAccessToken: vi.fn().mockResolvedValue("token"),
}));

vi.mock("@/features/orders/OrdersTable/crm-catalog", () => ({
  useCrmCatalog: () => ({}),
}));

const startExport = vi.fn().mockResolvedValue(undefined);
vi.mock("@/features/exports/ExportJobsProvider", () => ({
  useExportJobs: () => ({
    jobs: [],
    activeCount: 0,
    isOpen: false,
    setOpen: vi.fn(),
    startExport: (...args: unknown[]) => startExport(...args),
    cancel: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

const wrapper = ({ children }: { children: ReactNode }) => <I18nProvider>{children}</I18nProvider>;

function setup(
  getExportFilters: () => Record<string, unknown> | null,
  overrides: Partial<Parameters<typeof useOrdersTableData>[0]> = {},
) {
  return renderHook(
    () =>
      useOrdersTableData({
        rows: [],
        visibleColumns: [],
        lockedColumns: [],
        filterKey: "landing-summary",
        exportSection: "landing-orders",
        getExportFilters,
        onBulkDelete: vi.fn().mockResolvedValue(undefined),
        onKiotVietAction: vi.fn().mockResolvedValue(undefined),
        ...overrides,
      }),
    { wrapper },
  );
}

beforeEach(() => {
  toastError.mockClear();
  startExport.mockClear();
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useOrdersTableData — gate xuất toàn bộ theo bộ lọc", () => {
  it("đọc snapshot TẠI THỜI ĐIỂM bấm nút, không phải lúc render", () => {
    // Bất biến chống-regression thật sự: đọc trong thân render là nguồn gốc lỗi
    // (giá trị bị React Compiler đóng băng). Nếu handler tự đọc lại khi được gọi
    // thì lỗi không thể tái diễn, dù compiler memo hóa thế nào.
    const ref: { current: Record<string, unknown> | null } = { current: null };
    const getExportFilters = vi.fn(() => ref.current);
    const { result } = setup(getExportFilters);

    ref.current = { q: "abc" };
    const callsBeforeClick = getExportFilters.mock.calls.length;

    act(() => {
      result.current.handleBulkExportExcel();
    });

    expect(getExportFilters.mock.calls.length).toBeGreaterThan(callsBeforeClick);
    expect(toastError).not.toHaveBeenCalled();
  });

  it("snapshot đến SAU lần render đầu vẫn cho xuất (không toast bắt chọn row)", async () => {
    // Mô phỏng ordersExportFiltersRef: null lúc mount, có giá trị sau khi list load.
    const ref: { current: Record<string, unknown> | null } = { current: null };
    // Hàm stable y như useCallback(() => ref.current, []) ở use-orders-table.
    const getExportFilters = () => ref.current;

    const { result, rerender } = setup(getExportFilters);

    // loadOrders hoàn tất → ref có bộ lọc; ref KHÔNG gây re-render nên đây là
    // rerender do rows/state khác đổi.
    ref.current = { q: "abc", sheet: "1" };
    rerender();

    act(() => {
      result.current.handleBulkExportExcel();
    });

    expect(toastError).not.toHaveBeenCalled();
    expect(result.current.openExportModal).toBe(true);
  });

  it("xác nhận xuất tạo job với filters lồng trong params, không phải ids", async () => {
    const ref: { current: Record<string, unknown> | null } = { current: null };
    const getExportFilters = () => ref.current;
    const { result, rerender } = setup(getExportFilters);

    ref.current = { q: "abc", sheet: "1" };
    rerender();

    act(() => {
      result.current.handleBulkExportExcel();
    });
    await act(async () => {
      result.current.handleExportConfirm();
    });

    expect(toastError).not.toHaveBeenCalled();
    expect(startExport).toHaveBeenCalledTimes(1);
    const [kind, params] = startExport.mock.calls[0];
    expect(kind).toBe("orders");
    expect(params).toMatchObject({
      section: "landing-orders",
      ids: [],
      filters: { q: "abc", sheet: "1" },
    });
    // Bộ lọc phải nằm trong nhánh `filters`, không trải phẳng ở gốc params —
    // trải phẳng sai chỗ làm backend bỏ qua âm thầm (build_orders_filters đọc
    // đúng params.filters).
    expect(params).not.toHaveProperty("q");
    expect(params).not.toHaveProperty("sheet");
  });

  it("đã chọn đơn thì tạo job với ids, filters rỗng", async () => {
    const rows = [{ id: 1 }, { id: 2 }] as unknown as OrderRow[];
    const { result } = setup(() => null, {
      rows,
      filterKey: "orders-page",
      exportSection: "orders",
    });

    act(() => {
      result.current.toggleRowSelection(1, false);
      result.current.toggleRowSelection(2, false);
    });
    expect(result.current.selectedIds).toEqual([1, 2]);

    act(() => {
      result.current.handleBulkExportExcel();
    });
    expect(toastError).not.toHaveBeenCalled();

    await act(async () => {
      result.current.handleExportConfirm();
    });

    expect(startExport).toHaveBeenCalledTimes(1);
    const [kind, params] = startExport.mock.calls[0];
    expect(kind).toBe("orders");
    expect(params).toMatchObject({
      section: "orders",
      ids: [1, 2],
      filters: {},
      columns: expect.any(Array),
    });
  });

  it("không chọn row và KHÔNG có snapshot (vd Sheet 3) thì vẫn chặn bằng toast", () => {
    const { result } = setup(() => null);

    act(() => {
      result.current.handleBulkExportExcel();
    });

    expect(toastError).toHaveBeenCalledWith("Vui lòng chọn ít nhất một đơn hàng để xuất Excel.");
    expect(result.current.openExportModal).toBe(false);
    expect(startExport).not.toHaveBeenCalled();
  });
});
