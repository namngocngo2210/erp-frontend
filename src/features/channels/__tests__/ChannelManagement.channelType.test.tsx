import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ChannelManagement } from "@/features/channels/components/ChannelManagement";
import type { ChannelRow } from "@/features/channels/types";
import { renderWithI18n } from "@/test/render-with-i18n";
import { mockViewport, restoreViewport } from "@/test/viewport";

// Loại kênh bán (Shopee/TikTok/Facebook/Web): payload tạo/sửa phải mang
// `channel_type_id` (số khi chọn loại, `null` khi chọn "(Chưa phân loại)").
vi.mock("@/lib/api/channels", () => ({
  listChannelTypes: vi.fn().mockResolvedValue([
    { id: 1, code: "shopee", name: "Shopee", sort_order: 10, is_active: true },
    { id: 2, code: "tiktok", name: "TikTok", sort_order: 20, is_active: true },
    { id: 3, code: "lazada", name: "Lazada", sort_order: 50, is_active: false },
  ]),
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

function makeChannel(overrides: Partial<ChannelRow> & Pick<ChannelRow, "id" | "code" | "name">) {
  return {
    owner: "",
    landingpage_source: [],
    fb_ads_accounts: [],
    google_ads_accounts: [],
    is_active: true,
    created_at: "2026-07-01T00:00:00Z",
    assigned_user_count: 0,
    assigned_users: [],
    kiotviet_mappings: [],
    ...overrides,
  } satisfies ChannelRow;
}

const CHANNEL = makeChannel({
  id: 1,
  code: "HN01",
  name: "Kênh Hà Nội",
  channel_type: null,
});

// BE chỉ trả loại kênh đang bật ở /api/channels/types, nên loại đã tắt mà kênh
// đang gán KHÔNG nằm trong danh mục tải về — cùng cái bẫy đã xử lý cho bảng giá:
// trigger trắng trơn khiến người quản lý tưởng "chưa phân loại" rồi bấm chọn lại
// và vô tình gỡ phân loại thật.
const CHANNEL_WITH_INACTIVE_TYPE = makeChannel({
  id: 2,
  code: "SG01",
  name: "Kênh Sài Gòn",
  channel_type: { id: 3, code: "lazada", name: "Lazada" },
});

function renderManagement(
  handlers: { onUpdate?: ReturnType<typeof vi.fn>; onCreate?: ReturnType<typeof vi.fn> } = {},
  channels: ChannelRow[] = [CHANNEL],
) {
  const onUpdate = handlers.onUpdate ?? vi.fn().mockResolvedValue(undefined);
  const onCreate = handlers.onCreate ?? vi.fn().mockResolvedValue(undefined);
  renderWithI18n(
    <ChannelManagement
      channels={channels}
      canManage
      staffUsers={[]}
      onCreate={onCreate}
      onUpdate={onUpdate}
      onBulkDelete={vi.fn()}
      onLoadAssignments={vi.fn().mockResolvedValue([])}
      onAddAssignment={vi.fn().mockResolvedValue([])}
      onRemoveAssignment={vi.fn().mockResolvedValue([])}
      kiotvietChannels={[]}
    />,
  );
  return { onUpdate, onCreate };
}

async function openManageDialog(user: ReturnType<typeof userEvent.setup>) {
  const manageButtons = await screen.findAllByRole("button", { name: "Quản lý" });
  await user.click(manageButtons[0]);
  // Danh mục loại kênh nạp bất đồng bộ — chờ combobox render xong mới thao tác.
  await screen.findByRole("combobox", { name: "Loại kênh" });
}

afterEach(() => {
  cleanup();
  restoreViewport();
});

describe("ChannelManagement — loại kênh bán", () => {
  it("chỉ liệt kê loại kênh đang bật, kèm lựa chọn '(Chưa phân loại)'", async () => {
    const user = userEvent.setup();
    renderManagement();
    await openManageDialog(user);

    await user.click(screen.getByRole("combobox", { name: "Loại kênh" }));
    expect(await screen.findByRole("option", { name: "(Chưa phân loại)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Shopee" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "TikTok" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Lazada" })).not.toBeInTheDocument();
  });

  it("chọn loại kênh rồi lưu → payload PATCH mang channel_type_id đã chọn", async () => {
    const user = userEvent.setup();
    const { onUpdate } = renderManagement();
    await openManageDialog(user);

    await user.click(screen.getByRole("combobox", { name: "Loại kênh" }));
    await user.click(await screen.findByRole("option", { name: "TikTok" }));
    await user.click(screen.getByRole("button", { name: "Lưu thông tin" }));

    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
    expect(onUpdate.mock.calls[0][1].channel_type_id).toBe(2);
  });

  it("chọn lại '(Chưa phân loại)' rồi lưu → payload PATCH mang channel_type_id = null", async () => {
    const user = userEvent.setup();
    const { onUpdate } = renderManagement();
    await openManageDialog(user);

    await user.click(screen.getByRole("combobox", { name: "Loại kênh" }));
    await user.click(await screen.findByRole("option", { name: "Shopee" }));
    await user.click(screen.getByRole("combobox", { name: "Loại kênh" }));
    await user.click(await screen.findByRole("option", { name: "(Chưa phân loại)" }));
    await user.click(screen.getByRole("button", { name: "Lưu thông tin" }));

    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
    expect(onUpdate.mock.calls[0][1].channel_type_id).toBeNull();
  });

  it("kênh đang gán loại đã tắt → trigger hiện đúng tên loại đó kèm nhãn phân biệt", async () => {
    const user = userEvent.setup();
    renderManagement({}, [CHANNEL_WITH_INACTIVE_TYPE]);
    await openManageDialog(user);

    const trigger = screen.getByRole("combobox", { name: "Loại kênh" });
    expect(trigger).toHaveTextContent("Lazada (đã ẩn)");

    await user.click(trigger);
    expect(await screen.findByRole("option", { name: "Lazada (đã ẩn)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Shopee" })).toBeInTheDocument();
  });

  it("không đụng ô loại kênh rồi lưu → giữ nguyên loại đã tắt đang gán (không tự gỡ)", async () => {
    const user = userEvent.setup();
    const { onUpdate } = renderManagement({}, [CHANNEL_WITH_INACTIVE_TYPE]);
    await openManageDialog(user);

    await user.click(screen.getByRole("button", { name: "Lưu thông tin" }));

    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
    expect(onUpdate.mock.calls[0][1].channel_type_id).toBe(3);
  });

  it("form tạo kênh gửi kèm channel_type_id đã chọn", async () => {
    const user = userEvent.setup();
    const { onCreate } = renderManagement();

    await user.click(await screen.findByRole("button", { name: "Tạo kênh mới" }));
    await user.type(screen.getByLabelText("Mã"), "TT01");
    await user.type(screen.getByLabelText("Tên"), "Kênh TikTok");
    await user.type(screen.getByLabelText("Nguồn truy cập"), "https://example.com");

    await user.click(screen.getByRole("combobox", { name: "Loại kênh" }));
    await user.click(await screen.findByRole("option", { name: "TikTok" }));
    await user.click(screen.getByRole("button", { name: "Tạo" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalled());
    expect(onCreate.mock.calls[0][0].channel_type_id).toBe(2);
  });

  it("bảng kênh hiển thị cột loại kênh", async () => {
    // ResponsiveList mặc định rơi vào nhánh thẻ mobile trong jsdom (stub matchMedia
    // trả false cho mọi query) — phải chốt viewport desktop mới có <table>.
    mockViewport(false);
    renderManagement({}, [CHANNEL_WITH_INACTIVE_TYPE]);
    expect(await screen.findByRole("columnheader", { name: "Loại kênh" })).toBeInTheDocument();
    expect(screen.getAllByText("Lazada").length).toBeGreaterThan(0);
  });

  it("thẻ mobile hiển thị loại kênh", async () => {
    mockViewport(true);
    renderManagement({}, [CHANNEL_WITH_INACTIVE_TYPE]);
    expect(await screen.findByText("Loại kênh:")).toBeInTheDocument();
    expect(screen.getAllByText("Lazada").length).toBeGreaterThan(0);
  });
});
