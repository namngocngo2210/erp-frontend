import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ChannelManagement } from "@/features/channels/components/ChannelManagement";
import type { ChannelRow } from "@/features/channels/types";
import { renderWithI18n } from "@/test/render-with-i18n";
import { restoreViewport } from "@/test/viewport";

// "Nguồn truy cập" là field tuỳ chọn: kênh sàn (Shopee/TikTok) không có landing
// page nào để khai, nên form tạo kênh chỉ còn bắt buộc Mã + Tên.
vi.mock("@/lib/api/channels", () => ({
  listChannelTypes: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/api/price-books", () => ({
  getPriceBooks: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/api/facebook_ads", () => ({
  listAllFacebookAdAccounts: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/api/google_ads", () => ({
  listAllGoogleAdsAccounts: vi.fn().mockResolvedValue([]),
}));

const CHANNEL: ChannelRow = {
  id: 1,
  code: "HN01",
  name: "Kênh Hà Nội",
  owner: "",
  landingpage_source: [],
  fb_ads_accounts: [],
  google_ads_accounts: [],
  is_active: true,
  created_at: "2026-07-01T00:00:00Z",
  assigned_user_count: 0,
  assigned_users: [],
  kiotviet_mappings: [],
  channel_type: null,
};

function renderManagement() {
  const onCreate = vi.fn().mockResolvedValue(undefined);
  renderWithI18n(
    <ChannelManagement
      channels={[CHANNEL]}
      canManage
      staffUsers={[]}
      onCreate={onCreate}
      onUpdate={vi.fn().mockResolvedValue(undefined)}
      onBulkDelete={vi.fn()}
      onLoadAssignments={vi.fn().mockResolvedValue([])}
      onAddAssignment={vi.fn().mockResolvedValue([])}
      onRemoveAssignment={vi.fn().mockResolvedValue([])}
      kiotvietChannels={[]}
    />,
  );
  return { onCreate };
}

afterEach(() => {
  cleanup();
  restoreViewport();
});

describe("ChannelManagement — nguồn truy cập tuỳ chọn", () => {
  it("tạo kênh khi bỏ trống Nguồn truy cập → payload mang mảng rỗng", async () => {
    const user = userEvent.setup();
    const { onCreate } = renderManagement();

    await user.click(await screen.findByRole("button", { name: "Tạo kênh mới" }));
    await user.type(screen.getByLabelText("Mã"), "TT01");
    await user.type(screen.getByLabelText("Tên"), "Kênh TikTok");
    await user.click(screen.getByRole("button", { name: "Tạo" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalled());
    expect(onCreate.mock.calls[0][0].landingpage_source).toEqual([]);
  });

  it("vẫn chặn khi thiếu Mã hoặc Tên", async () => {
    const user = userEvent.setup();
    const { onCreate } = renderManagement();

    await user.click(await screen.findByRole("button", { name: "Tạo kênh mới" }));
    await user.type(screen.getByLabelText("Tên"), "Kênh thiếu mã");
    await user.click(screen.getByRole("button", { name: "Tạo" }));

    expect(onCreate).not.toHaveBeenCalled();
  });
});
