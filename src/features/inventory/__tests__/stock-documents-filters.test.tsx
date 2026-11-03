import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Bắt filters truyền vào query sổ phiếu.
type LedgerFilters = Record<string, string | string[]>;

const { useLedgerDocuments } = vi.hoisted(() => ({
  useLedgerDocuments: vi.fn((_filters: Record<string, string | string[]>) => ({
    data: { items: [], total: 0, limit: 50, offset: 0 },
    isLoading: false,
    refetch: vi.fn(),
  })),
}));
vi.mock("@/features/inventory/ledger-queries", () => ({ useLedgerDocuments }));

vi.mock("@/services/http", () => ({
  fetchJson: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
}));

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

function lastFilters(): LedgerFilters {
  const calls = useLedgerDocuments.mock.calls;
  return calls[calls.length - 1][0];
}

beforeEach(() => useLedgerDocuments.mockClear());
afterEach(() => cleanup());

describe("StockDocumentsPage — lọc ngày", () => {
  it("mặc định lọc 'Tháng này' → truyền date_from/date_to vào query", () => {
    renderPage();
    const filters = lastFilters();
    expect(filters).toHaveProperty("date_from");
    expect(filters).toHaveProperty("date_to");
    expect(filters.limit).toBe("50");
    expect(filters.offset).toBe("0");
  });

  it("chọn preset 'Hôm nay' → date_from = date_to = hôm nay", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("Tháng này"));
    await user.click(await screen.findByRole("button", { name: "Hôm nay" }));

    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const iso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    await waitFor(() => {
      const filters = lastFilters();
      expect(filters.date_from).toBe(iso);
      expect(filters.date_to).toBe(iso);
    });
  });
});

describe("StockDocumentsPage — lọc loại/trạng thái (phiếu trả đã rời sổ)", () => {
  it("ô trạng thái mở sẵn, chỉ còn các trạng thái phiếu kho", async () => {
    const user = userEvent.setup();
    renderPage();
    const statusCombo = screen.getByRole("combobox", { name: "Trạng thái" });
    expect(statusCombo).not.toBeDisabled();

    await user.click(statusCombo);
    expect(await screen.findByRole("option", { name: "Chờ duyệt" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Đã ghi sổ" })).toBeInTheDocument();
    // Trạng thái phiếu ngày trả hàng không còn.
    expect(screen.queryByRole("option", { name: "Đang mở" })).toBeNull();
    expect(screen.queryByRole("option", { name: "Đã chốt" })).toBeNull();
  });

  it("loại phiếu không còn option 'Phiếu trả hàng'; chọn loại vẫn truyền type vào query", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("combobox", { name: "Loại phiếu" }));
    expect(screen.queryByRole("option", { name: "Phiếu trả hàng" })).toBeNull();
    await user.click(await screen.findByRole("option", { name: "Xuất kho" }));
    await waitFor(() => expect(lastFilters().type).toEqual(["issue"]));
  });
});
