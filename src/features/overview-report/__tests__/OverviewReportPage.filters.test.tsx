import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithI18n } from "@/test/render-with-i18n";

// Hai ô lọc phụ thuộc nhau: "Nguồn" chọn tầng, "Kênh bán" chọn một nhóm TRONG
// tầng đó. Danh sách kênh phải luôn khớp các lát biểu đồ của tầng đang xem.
const mockUseOverviewReport = vi.fn();
vi.mock("@/features/overview-report/queries", () => ({
  useOverviewReport: (...args: unknown[]) => mockUseOverviewReport(...args),
}));
// Danh mục SP nạp qua React Query thật — stub rỗng để không đụng network.
vi.mock("@/features/products/queries", () => ({
  useAllProductOptions: () => ({ data: [] }),
}));

import { OverviewReportPage } from "../pages/OverviewReportPage";

/** Tham số của lần gọi `useOverviewReport` gần nhất — hợp đồng gửi sang BE. */
function lastParams(): Record<string, unknown> {
  const calls = mockUseOverviewReport.mock.calls;
  return (calls[calls.length - 1]?.[0] ?? {}) as Record<string, unknown>;
}

beforeEach(() => {
  mockUseOverviewReport.mockReset();
  // isLoading để trang dừng ở spinner: test này chỉ nói về bộ lọc, không cần
  // dựng recharts cho 4 khối biểu đồ bên dưới.
  mockUseOverviewReport.mockReturnValue({
    data: undefined,
    isLoading: true,
    isError: false,
    error: null,
  });
});

afterEach(cleanup);

async function pick(user: ReturnType<typeof userEvent.setup>, filter: string, option: string) {
  await user.click(screen.getByRole("combobox", { name: filter }));
  await user.click(await screen.findByRole("option", { name: option }));
}

describe("Báo cáo tổng — ô Nguồn và ô Kênh bán", () => {
  it("ô lọc nhóm lớn mang tên 'Nguồn', ô kênh bán đứng cạnh", () => {
    renderWithI18n(<OverviewReportPage />);

    expect(screen.getByRole("combobox", { name: "Nguồn" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Kênh bán" })).toBeInTheDocument();
  });

  it("danh sách kênh bán đổi theo Nguồn, đúng các lát biểu đồ của tầng", async () => {
    const user = userEvent.setup();
    renderWithI18n(<OverviewReportPage />);

    // Tầng "Tất cả" — hai nhóm lớn.
    await user.click(screen.getByRole("combobox", { name: "Kênh bán" }));
    expect(await screen.findByRole("option", { name: "Nội sàn" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Ngoại sàn" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Shopee" })).not.toBeInTheDocument();
    await user.keyboard("{Escape}");

    await pick(user, "Nguồn", "Nội sàn");
    await user.click(screen.getByRole("combobox", { name: "Kênh bán" }));
    expect(await screen.findByRole("option", { name: "Shopee" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "TikTok" })).toBeInTheDocument();
    await user.keyboard("{Escape}");

    await pick(user, "Nguồn", "Ngoại sàn");
    await user.click(screen.getByRole("combobox", { name: "Kênh bán" }));
    expect(await screen.findByRole("option", { name: "Facebook" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Web" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Ngoại sàn khác" })).toBeInTheDocument();
  });

  it("chọn kênh bán thì gửi kèm sale_channel_group", async () => {
    const user = userEvent.setup();
    renderWithI18n(<OverviewReportPage />);

    await pick(user, "Nguồn", "Ngoại sàn");
    await pick(user, "Kênh bán", "Web");

    expect(lastParams()).toMatchObject({ saleChannel: "off_marketplace", saleChannelGroup: "web" });
  });

  it("đổi Nguồn thì kênh bán reset về Tất cả, không gửi đi tổ hợp mâu thuẫn", async () => {
    const user = userEvent.setup();
    renderWithI18n(<OverviewReportPage />);

    await pick(user, "Nguồn", "Ngoại sàn");
    await pick(user, "Kênh bán", "Facebook");
    expect(lastParams().saleChannelGroup).toBe("facebook");

    // "Facebook" không thuộc tầng nội sàn — giữ lại là ô lọc hiện một giá trị
    // không có trong danh sách, còn BE thì âm thầm bỏ qua.
    await pick(user, "Nguồn", "Nội sàn");
    expect(lastParams()).toMatchObject({ saleChannel: "marketplace", saleChannelGroup: "" });
  });
});
