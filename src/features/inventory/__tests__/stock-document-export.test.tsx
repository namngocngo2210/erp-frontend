import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LedgerRow } from "@/features/inventory/ledger-types";

const row: LedgerRow = {
  id: 42,
  code: "NK-2026-0042",
  type: "receipt",
  type_label: "Nhập kho",
  status: "posted",
  status_label: "Đã ghi sổ",
  warehouse_label: "Kho 1",
  has_attachments: false,
  created_at: "2026-09-01T03:00:00Z",
};

const { useLedgerDocuments } = vi.hoisted(() => ({
  useLedgerDocuments: vi.fn(),
}));
vi.mock("@/features/inventory/ledger-queries", () => ({ useLedgerDocuments }));

const { fetchBlob, fetchJson } = vi.hoisted(() => ({
  fetchBlob: vi.fn(() => Promise.resolve(new Blob(["x"]))),
  fetchJson: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
}));
vi.mock("@/services/http", () => ({ fetchBlob, fetchJson }));

vi.mock("@/hooks/usePermission", () => ({ usePermission: () => () => true }));

import StockDocumentsPage from "@/features/inventory/pages/StockDocumentsPage";

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return render(<StockDocumentsPage />, { wrapper });
}

beforeEach(() => {
  fetchBlob.mockClear();
  useLedgerDocuments.mockReturnValue({
    data: { items: [row], total: 1, limit: 50, offset: 0 },
    isLoading: false,
    refetch: vi.fn(),
  });
  URL.createObjectURL = vi.fn(() => "blob:stub");
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => cleanup());

describe("Phiếu kho — xuất Excel từng phiếu", () => {
  it("mỗi dòng phiếu có nút Excel gọi endpoint export của đúng phiếu đó", async () => {
    const user = userEvent.setup();
    renderPage();

    const buttons = screen.getAllByRole("button", { name: /Excel/i });
    // Nút "Tải file Excel" (import) ở header không được tính là nút xuất phiếu.
    const exportButton = buttons.find((b) => b.textContent?.trim() === "Excel");
    expect(exportButton).toBeTruthy();

    await user.click(exportButton!);

    expect(fetchBlob).toHaveBeenCalledWith("/api/inventory/documents/42/export");
  });
});
