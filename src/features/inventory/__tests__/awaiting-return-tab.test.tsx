import type { ReactElement } from "react";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AwaitingReturnTab } from "../components/AwaitingReturnTab";
import * as http from "@/services/http";

// Tab "Chờ hàng hoàn về": đơn huỷ sau khi đã xuất kho, hàng chưa quay lại.
// SL hiện luôn là số dương (lượng hàng đang nợ kho), và nút Đóng phải bắt buộc
// ghi chú khi chọn lý do "Khác" — đóng là quyết định coi như mất hàng.

vi.mock("@/services/http", async (orig) => {
  const actual = await orig<typeof import("@/services/http")>();
  return { ...actual, fetchJson: vi.fn() };
});

vi.mock("@/hooks/usePermission", () => ({ usePermission: () => () => true }));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), message: vi.fn() },
}));

const ROW = {
  order_id: 1,
  order_code: "ORD-1",
  invoice_code: "HD-1",
  shipping_code: "TRACK-1",
  customer_name: "Khách A",
  warehouse_id: 1,
  warehouse_name: "Kho 1",
  cancelled_at: "2026-07-20T02:00:00Z",
  days_waiting: 9,
  status: "waiting" as const,
  closed_reason: "",
  closed_note: "",
  lines: [{ product_id: 5, sku: "SKU-1", qty: 2 }],
};

function mockApi(rows: unknown[] = [ROW]) {
  vi.mocked(http.fetchJson).mockImplementation((url: string, init?: RequestInit) => {
    if (String(url).includes("/close") && init?.method === "POST") {
      return Promise.resolve({ status: "closed" });
    }
    return Promise.resolve({ count: rows.length, results: rows });
  });
}

function renderTab() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const ui: ReactElement = <AwaitingReturnTab warehouseIds={[]} pageSize={50} />;
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe("AwaitingReturnTab", () => {
  it("hiện dòng đơn chờ với SL dương và số ngày chờ", async () => {
    mockApi();
    renderTab();

    await waitFor(() => expect(screen.getByText("TRACK-1")).toBeInTheDocument());
    expect(screen.getByText("SKU-1 × 2")).toBeInTheDocument();
    expect(screen.getByText("9 ngày")).toBeInTheDocument();
    expect(screen.getByText("Chờ hàng về")).toBeInTheDocument();
  });

  it("bảng trống hiện câu giải thích, không phải bảng rỗng", async () => {
    mockApi([]);
    renderTab();

    await waitFor(() =>
      expect(screen.getByText("Không có đơn huỷ nào đang chờ hàng về.")).toBeInTheDocument(),
    );
  });

  it("dialog đóng nêu rõ không cộng tồn và gửi đúng lý do", async () => {
    mockApi();
    renderTab();

    await waitFor(() => expect(screen.getByText("TRACK-1")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Đóng" }));

    await waitFor(() =>
      expect(
        screen.getByText("Đóng đơn không cộng tồn — hàng coi như đã rời kho vĩnh viễn."),
      ).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));

    await waitFor(() => {
      const calls = vi.mocked(http.fetchJson).mock.calls;
      const closeCall = calls.find(([url]) => String(url).includes("/close"));
      expect(closeCall).toBeDefined();
      expect(JSON.parse(String(closeCall?.[1]?.body))).toEqual({
        reason: "customer_kept",
        note: "",
      });
    });
  });

  it("lý do 'Khác' mà chưa ghi chú thì không gửi được", async () => {
    mockApi();
    renderTab();

    await waitFor(() => expect(screen.getByText("TRACK-1")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Xác nhận" })).toBeEnabled());

    // Chọn lý do "Khác" qua Select (radix dùng listbox/option).
    fireEvent.click(screen.getByLabelText("Lý do đóng"));
    fireEvent.click(await screen.findByText("Khác"));

    expect(screen.getByRole("button", { name: "Xác nhận" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Ghi chú"), { target: { value: "Hàng mất" } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Xác nhận" })).toBeEnabled());
  });
});
