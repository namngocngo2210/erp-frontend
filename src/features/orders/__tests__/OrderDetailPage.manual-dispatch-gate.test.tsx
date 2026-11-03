/**
 * Trang chi tiết đơn: nút "Xuất kho" phải gác theo quyền `stock:edit` VÀ ẩn khi đơn
 * đã qua bước xuất kho — đây là thao tác TRỪ TỒN thật, không hoàn tác dễ dàng. Trang
 * này từng có một lỗi gác quyền chỉ ở FE trong khi BE đã chặn đúng (MR !1380); ở đây
 * hậu quả của một gate hở là nặng hơn nhiều (trừ tồn sai), nên nút phải được kiểm cả
 * hai chiều: ẨN khi thiếu quyền / đã xuất kho, HIỆN khi đủ quyền và đơn còn chờ xuất.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
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

import { getCrmCatalogs, getKiotVietLocationData, getOrderJourneyEvents } from "@/lib/api/orders";
import { fetchOrderCallRecords } from "@/lib/api/callcenter";
import { I18nProvider } from "@/i18n";
import { OrderDetailPage } from "@/pages/OrderDetailPage";
import type { OrderRow } from "@/features/orders/order-types";

const mockCatalogs = vi.mocked(getCrmCatalogs);
const mockJourney = vi.mocked(getOrderJourneyEvents);
const mockCallRecords = vi.mocked(fetchOrderCallRecords);
const mockLocations = vi.mocked(getKiotVietLocationData);

function baseOrder(overrides: Partial<OrderRow> = {}): OrderRow {
  return {
    id: 42,
    name: "Nguyễn Văn A",
    phone: "0900000001",
    status: 2,
    total_amount: "200000",
    shipping_fee: "20000",
    vat: "no",
    can_edit: true,
    // "" (mặc định) = trước xuất kho, xem PRE_DISPATCH_DELIVERY_CODES ở
    // fulfillment-warehouse-lock.ts.
    crm: { sales_status_code: "closed", delivery_business_status_code: "" },
    ...overrides,
  } as unknown as OrderRow;
}

function renderPage(order: OrderRow, canDispatch?: boolean) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <I18nProvider>
        <OrderDetailPage
          orderId={order.id}
          order={order}
          onBack={vi.fn()}
          onPatch={vi.fn().mockResolvedValue(undefined)}
          canDispatch={canDispatch}
        />
      </I18nProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => cleanup());

beforeEach(() => {
  mockCatalogs.mockReset().mockResolvedValue({ sales_status_options: [] });
  mockJourney.mockReset().mockResolvedValue([]);
  mockCallRecords.mockReset().mockResolvedValue({ items: [] });
  mockLocations.mockReset().mockResolvedValue({});
});

describe("OrderDetailPage — gác quyền stock:edit + trạng thái đã xuất kho cho nút Xuất kho", () => {
  it("thiếu quyền (mặc định canDispatch không truyền): nút ẨN", () => {
    renderPage(baseOrder());
    expect(screen.queryByRole("button", { name: /xuất kho/i })).not.toBeInTheDocument();
  });

  it("có quyền, đơn CHƯA xuất kho: nút HIỆN", () => {
    renderPage(baseOrder(), true);
    expect(screen.getByRole("button", { name: /xuất kho/i })).toBeInTheDocument();
  });

  it("có quyền nhưng đơn ĐÃ xuất kho (mã giao vận sau bước dispatch): nút ẨN", () => {
    renderPage(
      baseOrder({ crm: { delivery_business_status_code: "dispatched" } } as Partial<OrderRow>),
      true,
    );
    expect(screen.queryByRole("button", { name: /xuất kho/i })).not.toBeInTheDocument();
  });
});
