import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/pancake", () => ({
  getConnection: vi.fn(),
  saveConnection: vi.fn(),
  syncPages: vi.fn(),
  listPages: vi.fn(),
  updatePage: vi.fn(),
  listStaffMaps: vi.fn(),
  saveStaffMaps: vi.fn(),
}));
vi.mock("@/lib/api/channels", () => ({
  listChannels: vi.fn(async () => []),
  listChannelStaff: vi.fn(async () => []),
}));
vi.mock("sonner", async () => (await import("@/test/utils")).makeToastMock());

import { toast } from "sonner";

import * as api from "@/lib/api/pancake";
import * as channelsApi from "@/lib/api/channels";
import PancakeSettingsPage from "@/features/pancake/pages/PancakeSettingsPage";
import { I18nProvider } from "@/i18n";
import { renderWithClient } from "@/test/utils";

const CONNECTION = {
  has_token: true,
  auth_status: "ok" as const,
  auth_error: "",
  last_pages_synced_at: "2026-09-16T02:00:00Z",
  name: "Pancake",
};
const PAGE = {
  id: 1,
  pancake_page_id: "945997011940587",
  name: "DELAX",
  platform: "facebook",
  is_activated: true,
  has_active_subscription: true,
  role_in_page: "ADMINISTER",
  channel_id: null,
  channel_name: "",
  foxia_kind: "messenger" as const,
  is_enabled: false,
  has_token: false,
  token_error: "",
  polled_until: null,
  last_polled_at: null,
  last_error: "",
};
const TIKTOK = {
  ...PAGE,
  id: 2,
  pancake_page_id: "tts_1",
  name: "Tiktok Shop",
  platform: "tiktok_shop",
  foxia_kind: null,
};
const CHANNELS = [
  { id: 11, name: "Kênh A", code: "a", is_active: true },
  { id: 12, name: "Kênh ẩn", code: "b", is_active: false },
];
const STAFF_MAP = {
  id: 1,
  pancake_name: "Nhung HN",
  user_id: null,
  user_username: "",
  user_display_name: "",
  last_seen_at: "2026-09-16T09:54:26Z",
};
const STAFF_USERS = [{ id: 7, username: "sale7", display_name: "Sale Bảy" }];

function renderPage() {
  return renderWithClient(
    <I18nProvider>
      <PancakeSettingsPage />
    </I18nProvider>,
  );
}

describe("PancakeSettingsPage", () => {
  beforeEach(() => {
    vi.mocked(api.getConnection).mockResolvedValue(CONNECTION);
    vi.mocked(api.listPages).mockResolvedValue([PAGE, TIKTOK]);
    vi.mocked(channelsApi.listChannels).mockResolvedValue(CHANNELS as never);
    vi.mocked(api.listStaffMaps).mockResolvedValue([STAFF_MAP]);
    vi.mocked(channelsApi.listChannelStaff).mockResolvedValue(STAFF_USERS as never);
  });

  it("hiện trạng thái kết nối và bảng page; page nền tảng lạ bị khoá select", async () => {
    renderPage();
    expect(await screen.findByText("Hợp lệ")).toBeInTheDocument();
    expect(await screen.findByText("DELAX")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("combobox", { name: "Kênh bán: DELAX" }));
    const options = within(screen.getByRole("listbox"))
      .getAllByRole("option")
      .map((o) => o.textContent);
    expect(options).toEqual(["— Chưa gán —", "Kênh A"]); // kênh is_active=false không hiện
    expect(screen.getByLabelText("Kênh bán: Tiktok Shop")).toBeDisabled();
    expect(screen.getByLabelText("Bật: Tiktok Shop")).toBeDisabled();
    // Chưa gán kênh → không bật được.
    expect(screen.getByLabelText("Bật: DELAX")).toBeDisabled();
  });

  it("lưu token gọi saveConnection và báo thành công", async () => {
    const user = userEvent.setup();
    vi.mocked(api.saveConnection).mockResolvedValue({ ...CONNECTION, auth_status: "ok" });
    renderPage();
    await screen.findByText("DELAX");
    await user.type(screen.getByLabelText("Access token"), "tok-moi");
    await user.click(screen.getByRole("button", { name: "Lưu & kiểm tra" }));
    await waitFor(() => expect(api.saveConnection).toHaveBeenCalledWith("tok-moi"));
    expect(toast.success).toHaveBeenCalledWith("Đã lưu token và đồng bộ page");
  });

  it("token sai hiện thông báo lỗi của BE", async () => {
    const user = userEvent.setup();
    vi.mocked(api.saveConnection).mockRejectedValue(
      new Error("Pancake từ chối token: Invalid token"),
    );
    renderPage();
    await screen.findByText("DELAX");
    await user.type(screen.getByLabelText("Access token"), "sai");
    await user.click(screen.getByRole("button", { name: "Lưu & kiểm tra" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Pancake từ chối token: Invalid token"),
    );
  });

  it("token sai vẫn refetch trạng thái kết nối (BE đã lưu auth_status/auth_error dù PUT lỗi)", async () => {
    const user = userEvent.setup();
    vi.mocked(api.saveConnection).mockRejectedValue(
      new Error("Pancake từ chối token: Invalid token"),
    );
    renderPage();
    await screen.findByText("DELAX");
    // Đếm tương đối: mock getConnection không bị reset giữa các `it` trong file
    // này (không có clearAllMocks toàn cục), nên số lần gọi cộng dồn qua các
    // test trước — so lệch trước/sau thay vì đòi đúng "2" là cách ổn định.
    const callsBefore = vi.mocked(api.getConnection).mock.calls.length;
    await user.type(screen.getByLabelText("Access token"), "sai");
    await user.click(screen.getByRole("button", { name: "Lưu & kiểm tra" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    // handleSaveToken giờ luôn invalidate() ở finally → refetch cả khi PUT lỗi.
    await waitFor(() =>
      expect(vi.mocked(api.getConnection).mock.calls.length).toBeGreaterThan(callsBefore),
    );
  });

  it("gán kênh rồi bật page gọi updatePage; lỗi 400 hiện detail và giữ nguyên switch", async () => {
    const user = userEvent.setup();
    vi.mocked(api.updatePage).mockResolvedValueOnce({
      ...PAGE,
      channel_id: 11,
      channel_name: "Kênh A",
    });
    renderPage();
    await screen.findByText("DELAX");
    // Sau PATCH trang invalidate + refetch: mock list phải trả page đã gán kênh.
    vi.mocked(api.listPages).mockResolvedValue([
      { ...PAGE, channel_id: 11, channel_name: "Kênh A" },
      TIKTOK,
    ]);
    await user.click(screen.getByRole("combobox", { name: "Kênh bán: DELAX" }));
    await user.click(screen.getByRole("option", { name: "Kênh A" }));
    await waitFor(() => expect(api.updatePage).toHaveBeenCalledWith(1, { channel_id: 11 }));

    vi.mocked(api.updatePage).mockRejectedValueOnce(
      new Error("Không sinh được token page: Thiếu quyền Admin"),
    );
    await waitFor(() => expect(screen.getByLabelText("Bật: DELAX")).toBeEnabled());
    await user.click(screen.getByLabelText("Bật: DELAX"));
    await waitFor(() => expect(api.updatePage).toHaveBeenCalledWith(1, { is_enabled: true }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Không sinh được token page: Thiếu quyền Admin"),
    );
    expect(screen.getByLabelText("Bật: DELAX")).not.toBeChecked();
  });

  it("đồng bộ page báo số lượng", async () => {
    const user = userEvent.setup();
    vi.mocked(api.syncPages).mockResolvedValue({
      fetched: 3,
      created: 1,
      updated: 2,
      deactivated: 0,
      pages: [PAGE],
    });
    renderPage();
    await screen.findByText("DELAX");
    await user.click(screen.getByRole("button", { name: "Đồng bộ page" }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Đã đồng bộ 3 page (mới 1, ẩn 0)"),
    );
  });

  it("chọn sale cho nhân viên Pancake gọi saveStaffMaps ngay và báo thành công", async () => {
    const user = userEvent.setup();
    vi.mocked(api.saveStaffMaps).mockResolvedValue([
      { ...STAFF_MAP, user_id: 7, user_username: "sale7", user_display_name: "Sale Bảy" },
    ]);
    renderPage();
    await screen.findByText("Nhung HN");
    await user.click(screen.getByRole("combobox", { name: "Sale nội bộ: Nhung HN" }));
    await user.click(screen.getByRole("option", { name: "Sale Bảy" }));
    await waitFor(() => expect(api.saveStaffMaps).toHaveBeenCalledWith([{ id: 1, user_id: 7 }]));
    expect(toast.success).toHaveBeenCalledWith("Đã lưu ánh xạ nhân viên");
  });
});
