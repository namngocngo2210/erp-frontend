import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ChannelManagement } from "@/features/channels/components/ChannelManagement";
import type { ChannelRow } from "@/features/channels/types";
import { renderWithI18n } from "@/test/render-with-i18n";

// Task 10: gán bảng giá cho kênh — payload PATCH phải mang `price_book_id`
// (số khi chọn bảng, `null` khi chọn "(Theo mặc định)" để gỡ gán).
vi.mock("@/lib/api/price-books", () => ({
  getPriceBooks: vi.fn().mockResolvedValue([
    {
      id: 10,
      code: "facebook",
      name: "Bảng giá Facebook",
      is_default: true,
      is_active: true,
      sort_order: 0,
    },
    {
      id: 20,
      code: "web",
      name: "Bảng giá Web",
      is_default: false,
      is_active: true,
      sort_order: 1,
    },
    {
      id: 30,
      code: "archived",
      name: "Bảng giá đã ẩn",
      is_default: false,
      is_active: false,
      sort_order: 2,
    },
  ]),
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
  owner: "Nguyễn Văn A",
  price_book: null,
});

// Kênh đang gán một bảng giá đã bị tắt (id 30 — "archived" — không nằm trong danh
// sách is_active). Đây là kịch bản của Finding 1 (review round 1): trigger từng
// hiện trắng trơn ở trường hợp này, dễ khiến người quản lý tưởng "chưa gán" và bấm
// "(Theo mặc định)" — thao tác đó lại thật sự gửi `price_book_id: null`, gỡ gán.
const CHANNEL_WITH_INACTIVE_PRICE_BOOK = makeChannel({
  id: 2,
  code: "SG01",
  name: "Kênh Sài Gòn",
  owner: "Trần Thị B",
  price_book: { id: 30, code: "archived", name: "Bảng giá đã ẩn" },
});

function renderManagement(
  onUpdate = vi.fn().mockResolvedValue(undefined),
  channels: ChannelRow[] = [CHANNEL],
) {
  renderWithI18n(
    <ChannelManagement
      channels={channels}
      canManage
      staffUsers={[]}
      onCreate={vi.fn()}
      onUpdate={onUpdate}
      onBulkDelete={vi.fn()}
      onLoadAssignments={vi.fn().mockResolvedValue([])}
      onAddAssignment={vi.fn().mockResolvedValue([])}
      onRemoveAssignment={vi.fn().mockResolvedValue([])}
      kiotvietChannels={[]}
    />,
  );
  return onUpdate;
}

async function openManageDialog(user: ReturnType<typeof userEvent.setup>) {
  const manageButtons = await screen.findAllByRole("button", { name: "Quản lý" });
  await user.click(manageButtons[0]);
  // Chỉ bảng giá active mới liệt kê — chờ combobox bảng giá xuất hiện.
  await screen.findByRole("combobox", { name: "Bảng giá" });
}

afterEach(cleanup);

describe("ChannelManagement — gán bảng giá cho kênh (Task 10)", () => {
  it("chỉ liệt kê bảng giá đang active và có lựa chọn '(Theo mặc định)'", async () => {
    const user = userEvent.setup();
    renderManagement();
    await openManageDialog(user);

    await user.click(screen.getByRole("combobox", { name: "Bảng giá" }));
    expect(await screen.findByRole("option", { name: "(Theo mặc định)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Bảng giá Facebook" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Bảng giá Web" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Bảng giá đã ẩn" })).not.toBeInTheDocument();
  });

  it("chọn bảng giá rồi lưu → payload PATCH mang price_book_id của bảng đã chọn", async () => {
    const user = userEvent.setup();
    const onUpdate = renderManagement();
    await openManageDialog(user);

    await user.click(screen.getByRole("combobox", { name: "Bảng giá" }));
    await user.click(await screen.findByRole("option", { name: "Bảng giá Web" }));

    await user.click(screen.getByRole("button", { name: "Lưu thông tin" }));

    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
    const [, payload] = onUpdate.mock.calls[0];
    expect(payload.price_book_id).toBe(20);
  });

  it("chọn lại '(Theo mặc định)' rồi lưu → payload PATCH mang price_book_id = null", async () => {
    const user = userEvent.setup();
    const onUpdate = renderManagement();
    await openManageDialog(user);

    // Gán bảng Web trước, rồi gỡ về mặc định — mô phỏng đổi ý trong cùng phiên sửa.
    await user.click(screen.getByRole("combobox", { name: "Bảng giá" }));
    await user.click(await screen.findByRole("option", { name: "Bảng giá Web" }));
    await user.click(screen.getByRole("combobox", { name: "Bảng giá" }));
    await user.click(await screen.findByRole("option", { name: "(Theo mặc định)" }));

    await user.click(screen.getByRole("button", { name: "Lưu thông tin" }));

    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
    const [, payload] = onUpdate.mock.calls[0];
    expect(payload.price_book_id).toBeNull();
  });

  it("kênh đang gán bảng giá đã tắt → trigger hiện đúng tên bảng đó (không trắng), có nhãn phân biệt", async () => {
    const user = userEvent.setup();
    renderManagement(vi.fn().mockResolvedValue(undefined), [CHANNEL_WITH_INACTIVE_PRICE_BOOK]);
    await openManageDialog(user);

    const trigger = screen.getByRole("combobox", { name: "Bảng giá" });
    expect(trigger).toHaveTextContent("Bảng giá đã ẩn (đã ẩn)");

    await user.click(trigger);
    expect(
      await screen.findByRole("option", { name: "Bảng giá đã ẩn (đã ẩn)" }),
    ).toBeInTheDocument();
    // Các bảng active vẫn liệt kê đầy đủ song song với bảng đã tắt đang được gán.
    expect(screen.getByRole("option", { name: "Bảng giá Facebook" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Bảng giá Web" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "(Theo mặc định)" })).toBeInTheDocument();
  });

  it("không đụng field bảng giá rồi lưu → price_book_id giữ nguyên bảng đã tắt đang gán (không tự gỡ)", async () => {
    const user = userEvent.setup();
    const onUpdate = renderManagement(vi.fn().mockResolvedValue(undefined), [
      CHANNEL_WITH_INACTIVE_PRICE_BOOK,
    ]);
    await openManageDialog(user);

    await user.click(screen.getByRole("button", { name: "Lưu thông tin" }));

    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
    const [, payload] = onUpdate.mock.calls[0];
    expect(payload.price_book_id).toBe(30);
  });
});
