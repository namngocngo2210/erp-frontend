import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ChannelTypesDialog } from "@/features/channels/ChannelTypesDialog";
import { renderWithI18n } from "@/test/render-with-i18n";
import {
  createChannelType,
  deleteChannelType,
  listChannelTypes,
  updateChannelType,
} from "@/lib/api/channels";

vi.mock("@/lib/api/channels", () => ({
  listChannelTypes: vi.fn(),
  createChannelType: vi.fn().mockResolvedValue({}),
  updateChannelType: vi.fn().mockResolvedValue({}),
  deleteChannelType: vi.fn().mockResolvedValue(undefined),
}));

const CATALOG = [
  { id: 1, code: "shopee", name: "Shopee", sort_order: 10, is_active: true, channel_count: 3 },
  { id: 2, code: "tiktok", name: "TikTok", sort_order: 20, is_active: true, channel_count: 0 },
  { id: 3, code: "lazada", name: "Lazada", sort_order: 50, is_active: false, channel_count: 0 },
];

function render(onChanged = vi.fn()) {
  renderWithI18n(<ChannelTypesDialog open onOpenChange={vi.fn()} onChanged={onChanged} />);
  return onChanged;
}

beforeEach(() => {
  vi.mocked(listChannelTypes).mockResolvedValue(CATALOG);
  vi.mocked(createChannelType).mockClear();
  vi.mocked(updateChannelType).mockClear();
  vi.mocked(deleteChannelType).mockClear();
});

afterEach(cleanup);

describe("ChannelTypesDialog", () => {
  it("nạp danh mục kèm loại đã tắt (include_inactive)", async () => {
    render();
    await screen.findByDisplayValue("Shopee");
    // Màn quản lý phải thấy cả loại đã tắt — khác dropdown chọn loại kênh.
    expect(listChannelTypes).toHaveBeenCalledWith(true);
    expect(screen.getByDisplayValue("Lazada")).toBeInTheDocument();
  });

  it("thêm loại kênh mới, mã được chuẩn hoá về chữ thường", async () => {
    const user = userEvent.setup();
    const onChanged = render();
    await screen.findByDisplayValue("Shopee");

    await user.type(screen.getByLabelText("Mã"), "  Sendo ");
    await user.type(screen.getByLabelText("Tên"), "Sendo");
    await user.type(screen.getByLabelText("Thứ tự"), "60");
    await user.click(screen.getByRole("button", { name: "Thêm" }));

    await waitFor(() => expect(createChannelType).toHaveBeenCalled());
    expect(vi.mocked(createChannelType).mock.calls[0][0]).toEqual({
      code: "sendo",
      name: "Sendo",
      sort_order: 60,
    });
    expect(onChanged).toHaveBeenCalled();
  });

  it("lưu tên + thứ tự, KHÔNG gửi code (BE không cho sửa mã)", async () => {
    const user = userEvent.setup();
    render();
    const nameInput = await screen.findByDisplayValue("Shopee");

    await user.clear(nameInput);
    await user.type(nameInput, "Shopee Mall");
    await user.click(screen.getAllByRole("button", { name: "Lưu" })[0]);

    await waitFor(() => expect(updateChannelType).toHaveBeenCalled());
    const [id, payload] = vi.mocked(updateChannelType).mock.calls[0];
    expect(id).toBe(1);
    expect(payload).toEqual({ name: "Shopee Mall", sort_order: 10 });
    expect(payload).not.toHaveProperty("code");
  });

  it("bật/tắt loại kênh gửi PATCH is_active", async () => {
    const user = userEvent.setup();
    render();
    await screen.findByDisplayValue("Shopee");

    await user.click(screen.getByLabelText("Bật/tắt loại kênh shopee"));

    await waitFor(() => expect(updateChannelType).toHaveBeenCalledWith(1, { is_active: false }));
  });

  it("khoá nút xoá khi loại kênh còn kênh đang dùng", async () => {
    render();
    await screen.findByDisplayValue("Shopee");

    // shopee: channel_count = 3 -> BE sẽ trả 400 (FK PROTECT), khoá nút từ đầu.
    expect(screen.getByLabelText("Xoá loại kênh shopee")).toBeDisabled();
    // tiktok: chưa kênh nào dùng -> xoá được.
    expect(screen.getByLabelText("Xoá loại kênh tiktok")).toBeEnabled();
  });

  it("xoá loại kênh chưa dùng", async () => {
    const user = userEvent.setup();
    const onChanged = render();
    await screen.findByDisplayValue("TikTok");

    await user.click(screen.getByLabelText("Xoá loại kênh tiktok"));

    await waitFor(() => expect(deleteChannelType).toHaveBeenCalledWith(2));
    expect(onChanged).toHaveBeenCalled();
  });

  it("thiếu mã hoặc tên thì không gọi API", async () => {
    const user = userEvent.setup();
    render();
    await screen.findByDisplayValue("Shopee");

    await user.type(screen.getByLabelText("Mã"), "sendo");
    await user.click(screen.getByRole("button", { name: "Thêm" }));

    expect(createChannelType).not.toHaveBeenCalled();
  });
});
