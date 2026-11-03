import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/orders", () => ({
  getCrmCatalogs: vi.fn(),
  getOrder: vi.fn(),
  getOrderJourneyEvents: vi.fn(),
  listKshipSenderAddresses: vi.fn(),
  parseAddress: vi.fn(),
}));

vi.mock("@/lib/api/callcenter", () => ({
  fetchOrderCallRecords: vi.fn(),
}));

import { getCrmCatalogs, getOrderJourneyEvents } from "@/lib/api/orders";
import { fetchOrderCallRecords } from "@/lib/api/callcenter";
import { I18nProvider } from "@/i18n";
import { OrderDetailPage } from "@/pages/OrderDetailPage";
import type { OrderRow } from "@/features/orders/order-types";

const mockCatalogs = vi.mocked(getCrmCatalogs);
const mockJourney = vi.mocked(getOrderJourneyEvents);
const mockCallRecords = vi.mocked(fetchOrderCallRecords);

const ORDER = {
  id: 42,
  name: "Nguyễn Văn A",
  status: 1,
  crm: {
    sales_status_code: "closed",
    ai_open_insights: [
      {
        topic: "Ngân sách",
        content: "Khách muốn dưới 20 triệu",
        quote: "tầm 20 triệu thôi em",
        call_record_id: 5,
        at: "2026-08-05T09:00:00Z",
      },
    ],
  },
} as unknown as OrderRow;

function renderPage(props: Partial<Parameters<typeof OrderDetailPage>[0]> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <I18nProvider>
        <OrderDetailPage
          orderId={42}
          order={ORDER}
          onBack={vi.fn()}
          onPatch={vi.fn().mockResolvedValue(undefined)}
          {...props}
        />
      </I18nProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => cleanup());

beforeEach(() => {
  mockCatalogs.mockReset().mockResolvedValue({ sales_status_options: [] });
  mockJourney.mockReset().mockResolvedValue([
    {
      id: 1,
      event_type: "sale_contact",
      event_type_label: "Ghi liên hệ",
      note: "Khách hẹn gọi lại chiều",
      actor_name: "Trần Nam",
      created_at: "2026-08-06T03:15:00Z",
    },
  ]);
  mockCallRecords.mockReset().mockResolvedValue({ items: [] });
});

describe("OrderDetailPage — khối tab cuối trang", () => {
  it("gộp hành vi mua hàng, AI ghi nhận thêm và cuộc gọi CSKH vào cùng một tab", async () => {
    renderPage();

    expect(screen.getByRole("button", { name: "Hành vi mua hàng" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lịch sử thao tác" })).toBeInTheDocument();

    // Cả ba mục cùng nằm trong tab đang mở.
    expect(await screen.findByText("AI ghi nhận thêm")).toBeInTheDocument();
    expect(await screen.findByText("Cuộc gọi CSKH")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Hành vi mua hàng" })).toBeInTheDocument();
  });

  it("chỉ gọi API journey khi mở tab lịch sử thao tác", async () => {
    renderPage();
    const user = userEvent.setup();

    expect(mockJourney).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Lịch sử thao tác" }));

    expect(await screen.findByText("Ghi liên hệ")).toBeInTheDocument();
    expect(screen.getByText("Khách hẹn gọi lại chiều")).toBeInTheDocument();
    expect(mockJourney).toHaveBeenCalledWith(42);
  });

  it("đơn KOC đổi nhãn tab đầu sang panel thu hồi", () => {
    renderPage({ isKoc: true });
    expect(screen.queryByRole("button", { name: "Hành vi mua hàng" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lịch sử thao tác" })).toBeInTheDocument();
  });
});
