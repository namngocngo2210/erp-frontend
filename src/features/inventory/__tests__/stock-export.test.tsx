import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "@/i18n";

// Task 17: nút Xuất Excel tồn kho không còn tải blob đồng bộ (`downloadStockExport`
// đã bị xoá) mà tạo job nền qua `useExportJobs().startExport` — mock thẳng provider
// đó, cùng khuôn với `useOrdersTableData.export-gate.test.tsx` (Task 14).
const { startExport, permissions } = vi.hoisted(() => ({
  startExport: vi.fn().mockResolvedValue(undefined),
  permissions: new Set<string>(),
}));

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
vi.mock("@/hooks/usePermission", () => ({
  usePermission: () => (code: string) => permissions.has(code),
}));
vi.mock("@/lib/api/warehouses", () => ({
  getWarehouses: vi.fn(() =>
    Promise.resolve({
      items: [{ id: 7, code: "WH-A", name: "Kho A", is_active: true }],
      total: 1,
    }),
  ),
}));
// Chặn hai hook gọi HTTP; giữ nguyên phần còn lại của module (component đọc thẳng
// từ đây, không còn hàm `downloadStockExport` nào để giữ nguyên nữa — đã xoá).
vi.mock("@/features/inventory/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/inventory/queries")>();
  return {
    ...actual,
    useStockList: () => ({
      data: { items: [], total: 0, limit: 200, offset: 0 },
      isLoading: false,
    }),
    useStockMovements: () => ({ data: { items: [] }, isLoading: false }),
  };
});

import StockPage from "@/features/inventory/pages/StockPage";

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <I18nProvider>{children}</I18nProvider>
    </QueryClientProvider>
  );
  return render(<StockPage />, { wrapper });
}

function lastCall(): [string, unknown] {
  const { calls } = startExport.mock;
  return calls[calls.length - 1] as [string, unknown];
}

beforeEach(() => {
  startExport.mockClear();
  permissions.clear();
});
afterEach(() => cleanup());

describe("StockPage — xuất Excel tồn kho", () => {
  it("xuất theo kho đang chọn", async () => {
    permissions.add("stock:export");
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Xuất Excel" }));

    await waitFor(() => expect(startExport).toHaveBeenCalled());
    const [kind, params] = lastCall();
    expect(kind).toBe("stock");
    expect(params).toEqual({ warehouse_id: 7, search: "", as_of: "" });
  });

  it("kèm từ khoá tìm kiếm đang áp dụng để file khớp bảng đang xem", async () => {
    permissions.add("stock:export");
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText("Tìm SKU / tên"), "SKU-A");
    await user.click(await screen.findByRole("button", { name: "Xuất Excel" }));

    await waitFor(() => expect(startExport).toHaveBeenCalled());
    const [, params] = lastCall();
    expect(params).toEqual({ warehouse_id: 7, search: "SKU-A", as_of: "" });
  });

  it("ẩn nút khi thiếu quyền stock:export", async () => {
    permissions.add("stock:view");
    renderPage();

    await screen.findByText("Kho A");
    expect(screen.queryByRole("button", { name: "Xuất Excel" })).toBeNull();
  });
});
