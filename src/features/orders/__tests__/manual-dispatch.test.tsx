import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mockViewport, restoreViewport } from "@/test/viewport";

import { ManualDispatchDialog } from "../ManualDispatchDialog";

const fetchJson = vi.fn();
vi.mock("@/services/http", () => ({ fetchJson: (...a: unknown[]) => fetchJson(...a) }));
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), message: vi.fn() },
}));

// Mockable per-test — mặc định trả 2 kho ACTIVE đã tải xong. Test kho-mặc-định-đã-bị-
// vô-hiệu-hoá override để trả danh sách KHÔNG chứa id mặc định.
const useWarehousesListMock = vi.fn();
vi.mock("@/features/warehouses/queries", () => ({
  useWarehousesList: (...args: unknown[]) => useWarehousesListMock(...args),
}));

const ACTIVE_WAREHOUSES = {
  data: {
    items: [
      { id: 1, code: "K1", name: "Kho 1", is_active: true },
      { id: 2, code: "K2", name: "Kho 2", is_active: true },
    ],
    total: 2,
  },
  isLoading: false,
};

function renderDialog(defaultWarehouseId: number | null = 1) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ManualDispatchDialog
        open
        onOpenChange={() => {}}
        orderId={99}
        defaultWarehouseId={defaultWarehouseId}
        items={[{ product_name: "SP A", sku: "SKU-A", quantity: 2 }]}
      />
    </QueryClientProvider>,
  );
}

describe("ManualDispatchDialog", () => {
  beforeEach(() => {
    mockViewport(false);
    fetchJson.mockReset();
    fetchJson.mockResolvedValue({ confirmed: [99], skipped: [] });
    useWarehousesListMock.mockReset();
    useWarehousesListMock.mockReturnValue(ACTIVE_WAREHOUSES);
  });

  afterEach(() => {
    restoreViewport();
  });

  it("mặc định chọn kho xuất hiện tại của đơn", async () => {
    renderDialog(2);
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toHaveValue("2");
    });
  });

  it("cảnh báo rõ thao tác này trừ tồn kho", () => {
    renderDialog();
    expect(screen.getByText(/trừ tồn kho/i)).toBeInTheDocument();
  });

  it("gửi đúng payload order_ids + warehouse_id", async () => {
    renderDialog(1);
    await userEvent.click(screen.getByRole("button", { name: /xuất kho/i }));

    await waitFor(() => {
      expect(fetchJson).toHaveBeenCalledWith(
        "/api/inventory/orders/dispatch",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ order_ids: [99], warehouse_id: 1 }),
        }),
      );
    });
  });

  it("chặn bấm khi chưa chọn kho", () => {
    renderDialog(null);
    expect(screen.getByRole("button", { name: /xuất kho/i })).toBeDisabled();
  });

  it("kho mặc định đã bị vô hiệu hoá (không còn trong danh sách ACTIVE đã tải xong) → bỏ chọn, chặn bấm", async () => {
    // defaultWarehouseId=5 không nằm trong ACTIVE_WAREHOUSES (chỉ có id 1, 2) và
    // isLoading đã false ngay từ đầu — mô phỏng đơn được gán kho lúc trước, kho đó
    // sau đó bị vô hiệu hoá. Dialog không được để nguyên id 5 (select sẽ hiện trống
    // nhưng nút vẫn bật, gửi đi một kho người dùng chưa từng thấy).
    useWarehousesListMock.mockReturnValue(ACTIVE_WAREHOUSES);
    renderDialog(5);

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toHaveValue("");
    });
    expect(screen.getByRole("button", { name: /xuất kho/i })).toBeDisabled();
  });

  it("đang tải danh sách kho → KHÔNG xoá kho mặc định trước khi có dữ liệu", () => {
    // Trong lúc isLoading=true, danh sách active rỗng — nếu áp dụng rule "không còn
    // trong danh sách" ngay lúc này sẽ xoá oan một default hợp lệ đang chờ tải. Ô
    // select tạm hiện trống vì chưa có <option> nào khớp (bản thân DOM control, không
    // tránh được) nhưng STATE bên trong không được đổi — nút vẫn phải bật, không rơi
    // vào trạng thái "chặn bấm" của kho-đã-bị-vô-hiệu-hoá.
    useWarehousesListMock.mockReturnValue({ data: undefined, isLoading: true });
    renderDialog(2);

    expect(screen.getByRole("button", { name: /xuất kho/i })).not.toBeDisabled();
  });
});
