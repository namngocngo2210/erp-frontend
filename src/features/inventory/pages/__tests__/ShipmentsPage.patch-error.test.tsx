import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { I18nProvider } from "@/i18n";
import type { OrderRow } from "@/features/orders/order-types";

// Trang Vận đơn là trang của nhân viên kho, cột inline duy nhất là "Trạng thái vận
// chuyển thực" (set "Đã xuất kho"). Backend chặn đơn hủy bằng 409 kèm detail tiếng
// Việt → trang KHÔNG được nuốt câu đó bằng "Cập nhật đơn thất bại".

const CANCELLED_DETAIL = "Đơn đã hủy nên không thể đánh dấu Đã xuất kho.";

let patchOutcome: { status: number; body: unknown } | null = null;

function apiError(status: number, body: unknown): Error {
  const err = new Error(
    body && typeof body === "object" && typeof (body as { detail?: unknown }).detail === "string"
      ? (body as { detail: string }).detail
      : `HTTP ${status}`,
  ) as Error & { status?: number; body?: unknown };
  err.status = status;
  err.body = body;
  return err;
}

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), message: vi.fn() },
}));

vi.mock("@/services/http", () => ({
  fetchJson: vi.fn((url: string) => {
    if (url.startsWith("/api/warehouses")) {
      return Promise.resolve({ items: [{ id: 1, name: "Kho A" }], total: 1 });
    }
    if (url.startsWith("/api/orders/shipments")) {
      return Promise.resolve({ items: [], count: 0 });
    }
    if (/^\/api\/orders\/\d+$/.test(url)) {
      if (patchOutcome) return Promise.reject(apiError(patchOutcome.status, patchOutcome.body));
      return Promise.resolve({ id: 1 });
    }
    return Promise.resolve({});
  }),
}));

// OrdersTable thật quá nặng cho test này — thay bằng stub gọi đúng prop `onPatch`
// mà trang truyền vào (chính là handlePatch cần kiểm chứng).
vi.mock("@/features/orders/OrdersTable", () => ({
  OrdersTable: ({ onPatch }: { onPatch: (id: number, payload: Partial<OrderRow>) => void }) => (
    <button
      type="button"
      onClick={() =>
        onPatch(1, { crm: { delivery_business_status_code: "dispatched" } } as Partial<OrderRow>)
      }
    >
      set-dispatched
    </button>
  ),
}));

import { toast } from "sonner";
import ShipmentsPage from "../ShipmentsPage";

const toastError = vi.mocked(toast.error);

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <I18nProvider>{children}</I18nProvider>
    </QueryClientProvider>
  );
  return render(<ShipmentsPage />, { wrapper });
}

beforeEach(() => {
  patchOutcome = null;
  toastError.mockClear();
});

afterEach(cleanup);

describe("ShipmentsPage — PATCH lỗi phải hiện thông báo thật của backend", () => {
  it("409 đơn đã hủy → toast đúng câu backend, KHÔNG phải 'Cập nhật đơn thất bại'", async () => {
    patchOutcome = { status: 409, body: { detail: CANCELLED_DETAIL } };
    renderPage();

    fireEvent.click(await screen.findByText("set-dispatched"));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(toastError).toHaveBeenCalledWith(CANCELLED_DETAIL);
    expect(toastError).not.toHaveBeenCalledWith("Cập nhật đơn thất bại");
  });

  it("503 chưa xác minh được → toast nguyên văn detail của backend", async () => {
    const detail =
      "Chưa xác minh được trạng thái đơn với KiotViet nên tạm thời không thể đánh dấu Đã xuất kho. Vui lòng thử lại sau ít phút.";
    patchOutcome = { status: 503, body: { detail } };
    renderPage();

    fireEvent.click(await screen.findByText("set-dispatched"));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith(detail));
  });

  it("lỗi không có detail → vẫn có fallback tiếng Việt", async () => {
    patchOutcome = { status: 500, body: null };
    renderPage();

    fireEvent.click(await screen.findByText("set-dispatched"));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(String(toastError.mock.calls[0][0]).length).toBeGreaterThan(0);
  });
});
