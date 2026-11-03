/**
 * Trang chi tiết đơn: ô "Nhân sự" (sale phụ trách) phải gác theo quyền
 * `sale-assignment:edit` — cùng luật với cột sale ở inline edit (OrderCell).
 * Thiếu quyền thì ô chỉ đọc; backend vốn đã 403 nhưng nếu FE cho sửa rồi mới
 * chặn lúc Lưu thì 403 đánh rớt luôn các field khác trong pending payload.
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

import { getCrmCatalogs, getKiotVietLocationData, getOrderJourneyEvents } from "@/lib/api/orders";
import { fetchOrderCallRecords } from "@/lib/api/callcenter";
import { I18nProvider } from "@/i18n";
import { OrderDetailPage } from "@/pages/OrderDetailPage";
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
  staff_id: 7,
  staff_name: "Trần Sale A",
  crm: { sales_status_code: "closed" },
} as unknown as OrderRow;

function renderPage(canAssignSale?: boolean) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onPatch = vi.fn().mockResolvedValue(undefined);
  render(
    <QueryClientProvider client={qc}>
      <I18nProvider>
        <OrderDetailPage
          orderId={42}
          order={BASE_ORDER}
          onBack={vi.fn()}
          onPatch={onPatch}
          canAssignSale={canAssignSale}
        />
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

/** Wrapper của hàng "Nhân sự" (ERow stacked: label + content chung một div cha). */
function staffRow(): HTMLElement {
  return screen.getByText("Nhân sự").parentElement as HTMLElement;
}

describe("OrderDetailPage — gác quyền sale-assignment:edit cho ô Nhân sự", () => {
  it("thiếu quyền (mặc định): click tên sale KHÔNG mở được ô chọn", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByText("Trần Sale A"));

    expect(within(staffRow()).queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("có quyền: click tên sale mở được ô chọn", async () => {
    renderPage(true);
    const user = userEvent.setup();

    await user.click(screen.getByText("Trần Sale A"));

    expect(within(staffRow()).getByRole("combobox")).toBeInTheDocument();
  });

  it("thiếu quyền: các ô khác vẫn sửa được (SĐT làm đại diện)", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByText("0900000001"));

    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
});
