/**
 * Trang chi tiết đơn: ô "Kho xuất" trong mục Vận chuyển. Đơn chưa rời kho thì chọn được
 * kho và lưu kèm tên kho; đơn ĐÃ xuất kho thì ô chỉ đọc (tồn đã trừ ở kho hiện tại —
 * xem fulfillment-warehouse-lock.ts và guard cùng tên trong update_order_inline).
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/orders", () => ({
  getCrmCatalogs: vi.fn(),
  getOrder: vi.fn(),
  getOrderJourneyEvents: vi.fn(),
  getKiotVietLocationData: vi.fn(),
  listKshipSenderAddresses: vi.fn(),
  parseAddress: vi.fn(),
}));

vi.mock("@/lib/api/callcenter", () => ({
  fetchOrderCallRecords: vi.fn(),
}));

vi.mock("@/lib/api/warehouses", () => ({
  getWarehouses: vi.fn(),
  createWarehouse: vi.fn(),
  updateWarehouse: vi.fn(),
  deleteWarehouse: vi.fn(),
}));

import { getCrmCatalogs, getKiotVietLocationData, getOrderJourneyEvents } from "@/lib/api/orders";
import { fetchOrderCallRecords } from "@/lib/api/callcenter";
import { getWarehouses } from "@/lib/api/warehouses";
import { I18nProvider } from "@/i18n";
import { OrderDetailPage } from "@/pages/OrderDetailPage";
import { FULFILLMENT_WAREHOUSE_LOCK_HINT } from "@/features/orders/fulfillment-warehouse-lock";
import type { OrderRow } from "@/features/orders/order-types";

const mockCatalogs = vi.mocked(getCrmCatalogs);
const mockJourney = vi.mocked(getOrderJourneyEvents);
const mockCallRecords = vi.mocked(fetchOrderCallRecords);
const mockLocations = vi.mocked(getKiotVietLocationData);
const mockWarehouses = vi.mocked(getWarehouses);

const BASE_ORDER = {
  id: 42,
  name: "Nguyễn Văn A",
  phone: "0900000001",
  status: 2,
  total_amount: "200000",
  shipping_fee: "20000",
  vat: "no",
  can_edit: true,
  fulfillment_warehouse: 1,
  fulfillment_warehouse_name: "Kho HCM",
  crm: { sales_status_code: "closed", delivery_business_status_code: "warehouse_processing" },
} as unknown as OrderRow;

/** Đơn đã qua bước xuất kho — tồn đã trừ ở kho HCM. */
const DISPATCHED_ORDER = {
  ...BASE_ORDER,
  crm: { sales_status_code: "closed", delivery_business_status_code: "dispatched" },
} as unknown as OrderRow;

function renderPage(order: OrderRow) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onPatch = vi.fn().mockResolvedValue(undefined);
  render(
    <QueryClientProvider client={qc}>
      <I18nProvider>
        <OrderDetailPage orderId={42} order={order} onBack={vi.fn()} onPatch={onPatch} />
      </I18nProvider>
    </QueryClientProvider>,
  );
  return { onPatch };
}

/**
 * Mục "Thông tin đơn hàng" có sẵn vài ô select luôn hiển thị (Kênh KiotViet, Chi
 * nhánh...) nên `getByRole("combobox")` là mơ hồ — nhận diện ô kho bằng option của nó.
 */
function warehouseSelect(): HTMLElement | null {
  return (
    screen
      .queryAllByRole("combobox")
      .find((el) => within(el).queryByRole("option", { name: "Kho HN" }) !== null) ?? null
  );
}

afterEach(() => cleanup());

beforeEach(() => {
  mockCatalogs.mockReset().mockResolvedValue({ sales_status_options: [] });
  mockJourney.mockReset().mockResolvedValue([]);
  mockCallRecords.mockReset().mockResolvedValue({ items: [] });
  mockLocations.mockReset().mockResolvedValue({});
  mockWarehouses.mockReset().mockResolvedValue({
    items: [
      { id: 1, name: "Kho HCM", is_active: true },
      { id: 2, name: "Kho HN", is_active: true },
    ],
    total: 2,
  } as unknown as Awaited<ReturnType<typeof getWarehouses>>);
});

describe("OrderDetailPage — chọn kho xuất", () => {
  it("hiện kho hiện tại của đơn", async () => {
    renderPage(BASE_ORDER);

    expect(await screen.findByText("Kho xuất")).toBeInTheDocument();
    expect(screen.getByText("Kho HCM")).toBeInTheDocument();
  });

  it("chọn kho khác rồi Lưu gửi kèm cả id và tên kho", async () => {
    const { onPatch } = renderPage(BASE_ORDER);
    const user = userEvent.setup();
    // Chờ danh sách kho về, nếu không select chỉ có mỗi option rỗng.
    await screen.findByText("Kho xuất");

    await user.click(screen.getByText("Kho HCM"));
    await user.selectOptions(warehouseSelect()!, "2");
    await user.click(screen.getByRole("button", { name: /Lưu/ }));

    expect(onPatch).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        fulfillment_warehouse: 2,
        fulfillment_warehouse_name: "Kho HN",
      }),
      false,
    );
  });

  it("bỏ chọn kho gửi lên null", async () => {
    const { onPatch } = renderPage(BASE_ORDER);
    const user = userEvent.setup();
    await screen.findByText("Kho xuất");

    await user.click(screen.getByText("Kho HCM"));
    await user.selectOptions(warehouseSelect()!, "");
    await user.click(screen.getByRole("button", { name: /Lưu/ }));

    expect(onPatch).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        fulfillment_warehouse: null,
        fulfillment_warehouse_name: null,
      }),
      false,
    );
  });

  it("đơn đã xuất kho thì ô kho chỉ đọc", async () => {
    renderPage(DISPATCHED_ORDER);
    const user = userEvent.setup();
    await screen.findByText("Kho xuất");

    await user.click(screen.getByText("Kho HCM"));

    expect(warehouseSelect()).toBeNull();
    // Chốt chống pass giả: ô đúng là ô kho đang bị khoá (không phải danh sách kho
    // chưa kịp về nên chẳng có select nào).
    expect(screen.getByTitle(FULFILLMENT_WAREHOUSE_LOCK_HINT)).toBeInTheDocument();
  });
});
