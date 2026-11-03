import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "@/i18n";

// globals:false ở vitest.config.ts tắt auto-cleanup ngầm của RTL (nó chỉ tự đăng
// ký afterEach khi `afterEach` có sẵn ở global scope) — phải tự gọi, như mọi file
// test khác trong repo (vd stock-documents-filters.test.tsx), để 2 `it` dưới đây
// không cộng dồn DOM của nhau (mỗi cái đều render() 1 <BatchesTab /> gốc).
afterEach(() => {
  cleanup();
  // Test nào đổi dữ liệu list bằng mockReturnValue thì trả về mặc định 1 lô.
  useWarrantyCodeBatches.mockImplementation(() => ({
    data: { results: [batch], total: 1 },
    isLoading: false,
  }));
});

const batch = {
  id: 1,
  batch_code: "LOT-20260805-001",
  start_seq: 1,
  end_seq: 1000,
  start_serial: "DX-000001",
  end_serial: "DX-001000",
  quantity: 1000,
  status: "reserved",
  is_generating: false,
  generated_count: 1000,
  product_id: null,
  product_name: null,
  product_sku: null,
  parent_id: null,
  created_by_name: "admin",
  assigned_by_name: null,
  assigned_at: null,
  exported_at: null,
  created_at: "2026-08-05T00:00:00Z",
};

const { useWarrantyCodeBatches } = vi.hoisted(() => ({
  useWarrantyCodeBatches: vi.fn(() => ({ data: { results: [batch], total: 1 }, isLoading: false })),
}));
vi.mock("@/features/warranty-codes/queries", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useWarrantyCodeBatches,
}));
vi.mock("@/features/products/queries", () => ({ useProductSearch: () => async () => [] }));
// jsdom matchMedia trả false → ResponsiveList render dạng card; ép desktop để
// test được ô "chọn cả trang" ở header bảng (card không có ô này).
vi.mock("@/hooks/use-media-query", () => ({ useMediaQuery: () => true }));

// Nút "Xuất Excel" trên toolbar gọi startExport — bắt payload để test chọn/không chọn.
const { startExport } = vi.hoisted(() => ({ startExport: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/features/exports/ExportJobsProvider", () => ({
  useExportJobs: () => ({
    jobs: [],
    activeCount: 0,
    isOpen: false,
    setOpen: vi.fn(),
    startExport,
    cancel: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

import { BatchesTab } from "@/features/warranty-codes/components/BatchesTab";

function renderTab() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <I18nProvider>
      <QueryClientProvider client={qc}>
        <BatchesTab />
      </QueryClientProvider>
    </I18nProvider>,
  );
}

describe("BatchesTab", () => {
  it("hiển thị lô mã với khoảng serial và trạng thái", () => {
    renderTab();
    expect(screen.getByText("LOT-20260805-001")).toBeTruthy();
    expect(screen.getByText(/DX-000001/)).toBeTruthy();
    expect(screen.getAllByText(/Chưa gắn/).length).toBeGreaterThan(0);
  });

  it("có nút Tạo lô", () => {
    renderTab();
    expect(screen.getByRole("button", { name: /Tạo lô/i })).toBeTruthy();
  });

  it("không chọn lô nào → Xuất Excel gửi bộ lọc hiện tại (không còn nút Excel từng hàng)", () => {
    vi.useFakeTimers();
    try {
      startExport.mockClear();
      renderTab();
      fireEvent.change(screen.getByPlaceholderText("Tìm mã phiếu..."), {
        target: { value: "LOT-2026" },
      });
      act(() => {
        vi.advanceTimersByTime(400); // qua debounce 300ms của ô tìm kiếm
      });
      expect(screen.queryByRole("button", { name: "Tải Excel" })).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: /Xuất Excel/ }));
      expect(startExport).toHaveBeenCalledWith("warranty_code_batch", {
        filters: { q: "LOT-2026" },
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("chọn lô → Xuất Excel gửi batch_ids của lô đã chọn", () => {
    startExport.mockClear();
    useWarrantyCodeBatches.mockReturnValue({
      data: { results: [batch, { ...batch, id: 2, batch_code: "LOT-20260805-002" }], total: 2 },
      isLoading: false,
    });
    renderTab();
    fireEvent.click(screen.getByRole("checkbox", { name: "Chọn lô LOT-20260805-002" }));
    const btn = screen.getByRole("button", { name: /Xuất Excel \(1\)/ });
    fireEvent.click(btn);
    expect(startExport).toHaveBeenCalledWith("warranty_code_batch", { batch_ids: [2] });
  });

  it("ô chọn đầu bảng chọn cả trang, lô đang sinh mã không chọn được", () => {
    startExport.mockClear();
    useWarrantyCodeBatches.mockReturnValue({
      data: {
        results: [
          batch,
          { ...batch, id: 2, batch_code: "LOT-20260805-002" },
          {
            ...batch,
            id: 3,
            batch_code: "LOT-20260805-003",
            is_generating: true,
            generated_count: 0,
          },
        ],
        total: 3,
      },
      isLoading: false,
    });
    renderTab();
    expect(screen.getByRole("checkbox", { name: "Chọn lô LOT-20260805-003" })).toHaveProperty(
      "disabled",
      true,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Chọn tất cả lô trong trang" }));
    fireEvent.click(screen.getByRole("button", { name: /Xuất Excel \(2\)/ }));
    expect(startExport).toHaveBeenCalledWith("warranty_code_batch", { batch_ids: [1, 2] });
  });

  it("lô đang sinh mã: hiện tiến độ, ẩn Gán/Tách", () => {
    useWarrantyCodeBatches.mockReturnValue({
      data: {
        results: [{ ...batch, quantity: 1_000_000, is_generating: true, generated_count: 45_000 }],
        total: 1,
      },
      isLoading: false,
    });
    renderTab();
    expect(screen.getAllByText(/Đang sinh 45\.000\/1\.000\.000/).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Gán sản phẩm" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Tách lô" })).toBeNull();
  });
});
