import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/orders", () => ({
  getOrderJourneyEvents: vi.fn(),
}));

import { getOrderJourneyEvents } from "@/lib/api/orders";
import { BlockJourneyEvents } from "@/features/orders/BlockJourneyEvents";
import type { CrmCatalogPayload } from "@/features/orders/BlockCrmRating";
import type { OrderJourneyEventRow } from "@/features/orders/order-types";

const mockGetEvents = vi.mocked(getOrderJourneyEvents);

const CATALOG: CrmCatalogPayload = {
  sales_status_options: [
    { code: "no_answer_1", label: "Không nghe máy lần 1" },
    { code: "closed", label: "Đã chốt" },
  ],
};

const EVENTS: OrderJourneyEventRow[] = [
  {
    id: 2,
    event_type: "sales_status_changed",
    event_type_label: "Đổi trạng thái chốt sale",
    from_code: "no_answer_1",
    to_code: "closed",
    payload_json: { field: "sales_status_code" },
    actor_name: "Trần Nam",
    created_at: "2026-08-06T03:15:00Z",
  },
  {
    id: 1,
    event_type: "assessment_ai_filled",
    event_type_label: "AI điền từ cuộc gọi",
    note: "Điền 3 trường từ transcript",
    actor_name: null,
    created_at: "2026-08-05T09:00:00Z",
  },
];

function renderBlock(active = true) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <BlockJourneyEvents orderId={42} active={active} crmCatalog={CATALOG} />
    </QueryClientProvider>,
  );
}

afterEach(() => cleanup());

beforeEach(() => {
  mockGetEvents.mockReset();
  mockGetEvents.mockResolvedValue(EVENTS);
});

describe("BlockJourneyEvents", () => {
  it("hiện mọi loại event kèm người thực hiện và diễn giải thay đổi", async () => {
    renderBlock();

    expect(await screen.findByText("Đổi trạng thái chốt sale")).toBeInTheDocument();
    expect(screen.getByText("Không nghe máy lần 1 → Đã chốt")).toBeInTheDocument();
    expect(screen.getByText("· Trần Nam")).toBeInTheDocument();

    // Event do AI ghi (không actor) vẫn hiện, không bị lọc bỏ.
    expect(screen.getByText("AI điền từ cuộc gọi")).toBeInTheDocument();
    expect(screen.getByText("Điền 3 trường từ transcript")).toBeInTheDocument();
    expect(screen.getByText("· Hệ thống")).toBeInTheDocument();
  });

  it("đơn chưa có thao tác nào thì báo rỗng", async () => {
    mockGetEvents.mockResolvedValue([]);
    renderBlock();
    expect(
      await screen.findByText("Chưa có thao tác nào được ghi nhận cho đơn này."),
    ).toBeInTheDocument();
  });

  it("lỗi tải thì báo lỗi thay vì khẳng định đơn không có thao tác", async () => {
    mockGetEvents.mockRejectedValue(new Error("boom"));
    renderBlock();
    expect(await screen.findByText("Không tải được lịch sử thao tác.")).toBeInTheDocument();
  });

  it("không gọi API khi tab chưa được mở", () => {
    renderBlock(false);
    expect(mockGetEvents).not.toHaveBeenCalled();
  });
});
