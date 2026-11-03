import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

import DispatchHistoryPage from "../pages/DispatchHistoryPage";
import * as http from "@/services/http";
import { renderWithClient } from "./flow-test-utils";

vi.mock("@/services/http", async (orig) => {
  const actual = await orig<typeof import("@/services/http")>();
  return { ...actual, fetchJson: vi.fn() };
});

// Task 17: IssueTab (bên trong DispatchHistoryPage) đọc useExportJobs() ở thân
// component (nút Xuất Excel gọi startExport) — không test hành vi export ở đây,
// chỉ cấp stub để render không throw.
vi.mock("@/features/exports/ExportJobsProvider", () => ({
  useExportJobs: () => ({
    jobs: [],
    activeCount: 0,
    isOpen: false,
    setOpen: vi.fn(),
    startExport: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

function renderPage() {
  return renderWithClient(<DispatchHistoryPage />);
}

beforeEach(() => {
  vi.mocked(http.fetchJson).mockImplementation((url: string) => {
    if (url.includes("/warehouses")) return Promise.resolve({ items: [] });
    if (url.includes("dispatch-history/skus")) {
      return Promise.resolve({
        items: [
          {
            product_id: 1,
            sku: "SKU1",
            name: "Áo",
            order_count: 2,
            dispatched: 8,
            reversed: 1,
            net: 7,
            doc_quantity: 0,
            doc_count: 0,
            transfer_quantity: 0,
            transfer_count: 0,
            last_at: "2026-07-01T00:00:00Z",
          },
        ],
        total: 1,
        total_quantity: 7,
        sale_quantity: 7,
        doc_quantity: 0,
        transfer_quantity: 0,
        limit: 50,
        offset: 0,
      });
    }
    if (url.includes("dispatch-history/orders")) {
      return Promise.resolve({
        items: [],
        total: 0,
        total_quantity: 0,
        sale_quantity: 0,
        doc_quantity: 0,
        transfer_quantity: 0,
        limit: 50,
        offset: 0,
      });
    }
    if (url.includes("pending")) {
      return Promise.resolve({
        items: [
          {
            id: 99,
            code: "VDPENDINGX",
            warehouse_name: "Kho A",
            status: "unmatched",
            status_label: "Chưa khớp",
            error: "",
            created_at: "2026-07-01T00:00:00Z",
            matched_at: null,
            matched_order_code: "",
            return_id: null,
            note: "",
          },
        ],
      });
    }
    return Promise.resolve({ items: [] });
  });
});

// DispatchHistoryPage debounce mã tìm sản phẩm/mã đơn (useDebouncedValue) — unmount rõ
// ràng để clearTimeout chạy, tránh timer thật bắn sau khi môi trường test đã teardown.
afterEach(() => cleanup());

describe("SKU view", () => {
  it("switches to SKU grouping and shows SKU columns", async () => {
    renderPage();
    // Order view (default) renders the pending scan row.
    await waitFor(() => expect(screen.getByText("VDPENDINGX")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /Theo SKU/i }));
    await waitFor(() => expect(screen.getByText("SKU1")).toBeInTheDocument());
    expect(screen.getByText("Số đơn")).toBeInTheDocument();
    expect(screen.getByText("SL xuất")).toBeInTheDocument();

    // SKU view must not show order-view pending scans; the pending query
    // should be disabled entirely in SKU mode.
    expect(screen.queryByText("VDPENDINGX")).not.toBeInTheDocument();
  });
});
