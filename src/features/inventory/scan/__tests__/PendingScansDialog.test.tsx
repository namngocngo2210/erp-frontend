import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { fetchJson } from "@/services/http";
import { PendingScansDialog } from "@/features/inventory/scan/PendingScansDialog";

vi.mock("@/services/http", () => ({ fetchJson: vi.fn() }));

const pendingRow = {
  id: 1,
  code: "GYX44ELX",
  kind: "dispatch" as const,
  warehouse: 1,
  warehouse_name: "Đại Mỗ 1",
  return_type: "",
  status: "pending" as const,
  matched_order: null,
  matched_order_code: "",
  result_ref: "",
  error: "",
  attempts: 1,
  last_attempt_at: null,
  scanned_by_name: "Kho Một",
  created_at: "2026-07-06T00:00:00Z",
};

const failedRow = {
  id: 2,
  code: "SPXVN99",
  kind: "return" as const,
  warehouse: 1,
  warehouse_name: "Đại Mỗ 1",
  return_type: "delivery_returned",
  status: "failed" as const,
  matched_order: null,
  matched_order_code: "",
  result_ref: "",
  error: "Không tạo được phiếu trả: kho không hợp lệ",
  attempts: 3,
  last_attempt_at: "2026-07-06T01:00:00Z",
  scanned_by_name: "Kho Hai",
  created_at: "2026-07-06T00:30:00Z",
};

const listResponse = {
  items: [pendingRow, failedRow],
  total: 2,
  limit: 50,
  offset: 0,
};

function renderDialog() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <PendingScansDialog open onOpenChange={() => {}} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.mocked(fetchJson).mockReset();
  vi.mocked(fetchJson).mockImplementation((url: unknown, init?: RequestInit) => {
    const u = String(url);
    if (init?.method === "POST" && u.includes("/retry")) {
      return Promise.resolve({ ...failedRow, status: "pending", error: "" });
    }
    return Promise.resolve(listResponse);
  });
});

describe("PendingScansDialog", () => {
  it("hiển thị dòng pending và failed", async () => {
    renderDialog();
    expect(await screen.findByText("GYX44ELX")).toBeInTheDocument();
    expect(await screen.findByText("SPXVN99")).toBeInTheDocument();
    expect(screen.getByText(/Chờ khớp \(1 lần thử\)/)).toBeInTheDocument();
    expect(screen.getByText("Lỗi")).toBeInTheDocument();
  });

  it("nút Thử lại chỉ hiện ở dòng failed", async () => {
    renderDialog();
    await screen.findByText("SPXVN99"); // chờ dữ liệu load xong trước khi truy vấn bảng
    const table = screen.getByRole("table");
    const pendingRowEl = within(table).getByText("GYX44ELX").closest("tr");
    const failedRowEl = within(table).getByText("SPXVN99").closest("tr");
    expect(pendingRowEl).not.toBeNull();
    expect(failedRowEl).not.toBeNull();
    expect(
      within(pendingRowEl as HTMLElement).queryByRole("button", { name: /thử lại/i }),
    ).toBeNull();
    expect(
      within(failedRowEl as HTMLElement).getByRole("button", { name: /thử lại/i }),
    ).toBeInTheDocument();
  });

  it("Thử lại đang chạy ở dòng A không disable nút của dòng B", async () => {
    const failedRow2 = { ...failedRow, id: 3, code: "JTVN777" };
    let resolveRetry: (v: unknown) => void = () => {};
    vi.mocked(fetchJson).mockImplementation((url: unknown, init?: RequestInit) => {
      if (init?.method === "POST" && String(url).includes("/retry")) {
        // Deferred: giữ retry của dòng A "đang chạy" để kiểm tra disabled per-row.
        return new Promise((resolve) => {
          resolveRetry = resolve;
        });
      }
      return Promise.resolve({ ...listResponse, items: [failedRow, failedRow2], total: 2 });
    });

    renderDialog();
    const user = userEvent.setup();
    await screen.findByText("JTVN777");
    const retryButtons = screen.getAllByRole("button", { name: /thử lại/i });
    expect(retryButtons).toHaveLength(2);

    await user.click(retryButtons[0]);
    await waitFor(() => {
      expect(retryButtons[0]).toBeDisabled();
    });
    expect(retryButtons[1]).not.toBeDisabled();

    resolveRetry({ ...failedRow, status: "pending", error: "" });
  });

  it("dòng cancelled hiện badge đơn đã hủy kèm lý do, không rơi vào 'Chờ khớp'", async () => {
    const cancelledRow = {
      ...pendingRow,
      id: 4,
      code: "SPXCANCEL1",
      status: "cancelled" as const,
      error: "Đơn DH999 đã hủy — không xuất kho.",
    };
    vi.mocked(fetchJson).mockImplementation(() =>
      Promise.resolve({ ...listResponse, items: [cancelledRow], total: 1 }),
    );

    renderDialog();
    const rowEl = (await screen.findByText("SPXCANCEL1")).closest("tr") as HTMLElement;
    expect(within(rowEl).getByText(/Đơn đã hủy — không xuất kho/)).toBeInTheDocument();
    expect(within(rowEl).getByText(/Đơn DH999 đã hủy/)).toBeInTheDocument();
    expect(within(rowEl).queryByText(/Chờ khớp/)).toBeNull();
  });

  it("click Thử lại gọi đúng endpoint retry", async () => {
    renderDialog();
    const user = userEvent.setup();
    const retryBtn = await screen.findByRole("button", { name: /thử lại/i });
    await user.click(retryBtn);

    await waitFor(() => {
      const call = vi
        .mocked(fetchJson)
        .mock.calls.find(([, init]) => (init as RequestInit)?.method === "POST");
      expect(call).toBeDefined();
      expect(String(call![0])).toBe("/api/inventory/pending-scans/2/retry");
    });
  });
});
