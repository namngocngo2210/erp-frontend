import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/pancake", () => ({
  listLeads: vi.fn(),
  listPages: vi.fn(),
  retryLeadOrder: vi.fn(),
}));
vi.mock("@/lib/api/channels", () => ({ listChannels: vi.fn(async () => []) }));
vi.mock("sonner", async () => (await import("@/test/utils")).makeToastMock());

import { toast } from "sonner";

import * as api from "@/lib/api/pancake";
import PancakeLeadsPage from "@/features/pancake/pages/PancakeLeadsPage";
import { I18nProvider } from "@/i18n";

const LEAD = {
  id: 1,
  page_id: 1,
  pancake_page_id: "945997011940587",
  page_name: "DELAX",
  channel_id: 11,
  channel_name: "Kênh A",
  conversation_id: "945997011940587_1",
  conversation_inserted_at: "2026-09-16T09:54:26Z",
  customer_name: "Tuan Anh Nguyen",
  phone: "0888185886",
  tags: ["BOT-BNC02"],
  phone_given_at: "2026-09-16T09:54:27Z",
  assignee_name: "Nhung HN",
  created_at: "2026-09-16T09:54:21Z",
  foxia_kind: "messenger",
  foxia_source_id: 1234,
  push_status: "order_created" as const,
  http_status: 200,
  error: "",
  pushed_at: "2026-09-16T09:54:30Z",
  cohoi_id: null,
  order_id: 123,
};
const ORDER_FAILED = {
  ...LEAD,
  id: 2,
  phone: "0912345678",
  customer_name: "Khách B",
  push_status: "order_failed" as const,
  http_status: 500,
  error: "Kênh bán không tồn tại",
  order_id: null,
};
const PENDING = {
  ...LEAD,
  id: 3,
  phone: "0900000000",
  customer_name: "Khách C",
  push_status: "pending" as const,
  http_status: null,
  error: "",
  order_id: null,
};
const ORDER_EXISTS = {
  ...LEAD,
  id: 4,
  phone: "0977777777",
  customer_name: "Khách D",
  push_status: "order_exists" as const,
  order_id: null,
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <I18nProvider>{children}</I18nProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return render(<PancakeLeadsPage />, { wrapper });
}

describe("PancakeLeadsPage", () => {
  beforeEach(() => {
    vi.mocked(api.listLeads).mockResolvedValue({
      items: [LEAD, ORDER_FAILED],
      total: 2,
      limit: 50,
      offset: 0,
    });
    vi.mocked(api.listPages).mockResolvedValue([]);
  });

  it("dựng đúng 8 cột chủ dự án chỉ định + cột Đơn hàng", async () => {
    renderPage();
    expect(await screen.findByText("Tuan Anh Nguyen")).toBeInTheDocument();
    const headerRow = screen.getAllByRole("row")[0];
    expect(
      within(headerRow)
        .getAllByRole("columnheader")
        .map((th) => th.textContent),
    ).toEqual([
      "Page Pancake",
      "Tên khách hàng",
      "Ngày tạo hội thoại",
      "Số điện thoại",
      "Thẻ Pancake",
      "Ngày tạo",
      "Ngày cho số điện thoại",
      "Nhân viên Pancake",
      "Đơn hàng",
    ]);
    expect(screen.getAllByText("[945997011940587] DELAX")).toHaveLength(2);
    expect(screen.getAllByText("BOT-BNC02")).toHaveLength(2);
    expect(screen.getAllByText("Nhung HN")).toHaveLength(2);
    expect(screen.getByText("2 lead")).toBeInTheDocument();
  });

  it("lead có order_id hiện link đến đơn kèm badge trạng thái, không có nút Tạo đơn", async () => {
    renderPage();
    await screen.findByText("Tuan Anh Nguyen");
    const link = screen.getByRole("link", { name: "#123" });
    expect(link).toHaveAttribute("href", "/sales/orders/123");
    const row = screen.getByText("Tuan Anh Nguyen").closest("tr") as HTMLElement;
    expect(within(row).getByText("Đã tạo đơn")).toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: "Tạo đơn" })).not.toBeInTheDocument();
  });

  it("lead order_failed có nút Tạo đơn; bấm gọi retryLeadOrder", async () => {
    const user = userEvent.setup();
    vi.mocked(api.retryLeadOrder).mockResolvedValue({ status: "queued" });
    renderPage();
    await screen.findByText("Khách B");
    const buttons = screen.getAllByRole("button", { name: "Tạo đơn" });
    expect(buttons).toHaveLength(1);
    await user.click(buttons[0]);
    await waitFor(() => expect(api.retryLeadOrder).toHaveBeenCalledWith(2));
    expect(toast.success).toHaveBeenCalledWith("Đã xếp lịch tạo đơn");
  });

  it("lead chờ tạo đơn (pending) cũng có nút Tạo đơn — worker có thể bị giết giữa lúc tạo lead và tạo đơn", async () => {
    vi.mocked(api.listLeads).mockResolvedValueOnce({
      items: [LEAD, PENDING],
      total: 2,
      limit: 50,
      offset: 0,
    });
    renderPage();
    await screen.findByText("Khách C");
    expect(screen.getAllByRole("button", { name: "Tạo đơn" })).toHaveLength(1);
  });

  it("lead order_exists hiện badge 'Đã có đơn' và không có nút Tạo đơn (không order_id, không eligible)", async () => {
    vi.mocked(api.listLeads).mockResolvedValueOnce({
      items: [LEAD, ORDER_EXISTS],
      total: 2,
      limit: 50,
      offset: 0,
    });
    renderPage();
    await screen.findByText("Khách D");
    const row = screen.getByText("Khách D").closest("tr") as HTMLElement;
    expect(within(row).getByText("Đã có đơn")).toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: "Tạo đơn" })).not.toBeInTheDocument();
  });

  it("đổi bộ lọc trạng thái gọi listLeads với push_status", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Khách B");
    await user.click(screen.getByRole("combobox", { name: "Trạng thái đẩy" }));
    await user.click(screen.getByRole("option", { name: "Tạo đơn lỗi" }));
    await waitFor(() =>
      expect(api.listLeads).toHaveBeenLastCalledWith(
        expect.objectContaining({ push_status: "order_failed", offset: 0 }),
      ),
    );
  });
});
