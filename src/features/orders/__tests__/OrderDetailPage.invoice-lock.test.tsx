/**
 * Trang chi tiết đơn: đơn đã có mã hóa đơn thì khối Sản phẩm + Tài chính chỉ đọc, mọi
 * khối khác (khách, địa chỉ, kênh/sale, phí vận chuyển, VAT, CRM) vẫn sửa được.
 * Xem docs/invoice-code-edit-lock.md.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
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

import { getCrmCatalogs, getKiotVietLocationData, getOrderJourneyEvents } from "@/lib/api/orders";
import { fetchOrderCallRecords } from "@/lib/api/callcenter";
import { I18nProvider } from "@/i18n";
import { OrderDetailPage } from "@/pages/OrderDetailPage";
import { INVOICE_LOCK_HINT } from "@/features/orders/invoice-lock";
import type { OrderRow } from "@/features/orders/order-types";

const mockCatalogs = vi.mocked(getCrmCatalogs);
const mockJourney = vi.mocked(getOrderJourneyEvents);
const mockCallRecords = vi.mocked(fetchOrderCallRecords);
const mockLocations = vi.mocked(getKiotVietLocationData);

const BASE_ORDER = {
  id: 42,
  name: "Nguyễn Văn A",
  phone: "0900000001",
  status: 2,
  total_amount: "200000",
  shipping_fee: "20000",
  vat: "no",
  can_edit: true,
  crm: { sales_status_code: "closed" },
} as unknown as OrderRow;

const LOCKED_ORDER = {
  ...BASE_ORDER,
  invoice_code: "HD-0001",
  is_invoice_locked: true,
} as unknown as OrderRow;

const OPEN_ORDER = {
  ...BASE_ORDER,
  invoice_code: "",
  is_invoice_locked: false,
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

afterEach(() => cleanup());

beforeEach(() => {
  mockCatalogs.mockReset().mockResolvedValue({ sales_status_options: [] });
  mockJourney.mockReset().mockResolvedValue([]);
  mockCallRecords.mockReset().mockResolvedValue({ items: [] });
  mockLocations.mockReset().mockResolvedValue({});
});

describe("OrderDetailPage — khoá sản phẩm + tài chính khi đã có mã hóa đơn", () => {
  it("hiện cảnh báo khoá", () => {
    renderPage(LOCKED_ORDER);

    expect(screen.getByText(INVOICE_LOCK_HINT)).toBeInTheDocument();
  });

  it("không hiện cảnh báo khi đơn chưa có mã hóa đơn", () => {
    renderPage(OPEN_ORDER);

    expect(screen.queryByText(INVOICE_LOCK_HINT)).not.toBeInTheDocument();
  });

  it("chặn thêm sản phẩm", () => {
    renderPage(LOCKED_ORDER);

    expect(screen.getByRole("button", { name: /Thêm sản phẩm/ })).toBeDisabled();
  });

  it("cho thêm sản phẩm khi đơn chưa có mã hóa đơn", () => {
    renderPage(OPEN_ORDER);

    expect(screen.getByRole("button", { name: /Thêm sản phẩm/ })).not.toBeDisabled();
  });

  // Dùng ô SĐT làm đại diện nhóm NGOÀI sản phẩm: giá trị chỉ xuất hiện một lần trên
  // trang (tên khách còn hiện ở topbar nên getByText sẽ trúng hai chỗ).
  it("vẫn sửa được số điện thoại", async () => {
    renderPage(LOCKED_ORDER);
    const user = userEvent.setup();

    await user.click(screen.getByText("0900000001"));

    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("khoá luôn ô Tổng tiền của khối Tài chính", async () => {
    renderPage(LOCKED_ORDER);
    const user = userEvent.setup();

    await user.click(screen.getByText("Tổng tiền"));

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("vẫn sửa được VAT", async () => {
    renderPage(LOCKED_ORDER);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Chưa xuất" }));

    expect(screen.getByRole("button", { name: "Đã xuất" })).toBeInTheDocument();
  });
});
