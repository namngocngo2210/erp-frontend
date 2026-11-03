import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/pancakePos", () => ({ startPancakePosSync: vi.fn() }));
vi.mock("sonner", async () => (await import("@/test/utils")).makeToastMock());

import * as api from "@/lib/api/pancakePos";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { SyncRunnerCard } from "@/features/pancake-pos/components/SyncRunnerCard";
import { I18nProvider } from "@/i18n";
import { answerConfirm, renderWithClient } from "@/test/utils";

const READY = {
  enabled: true,
  api_key_set: true,
  shop_id: 42,
  dirty_count: 0,
  link_counts: {},
  active_run_id: null,
  push_orders_enabled: false,
  order_link_counts: {},
};

function setup(props: Partial<Parameters<typeof SyncRunnerCard>[0]> = {}) {
  renderWithClient(
    <I18nProvider>
      <ConfirmProvider>
        <SyncRunnerCard status={READY} canEdit {...props} />
      </ConfirmProvider>
    </I18nProvider>,
  );
}

describe("SyncRunnerCard", () => {
  beforeEach(() => {
    vi.mocked(api.startPancakePosSync).mockReset();
    vi.mocked(api.startPancakePosSync).mockResolvedValue({ run_id: 5 });
  });

  it("chạy thử gửi mode dry_run kèm giới hạn + SKU đã chuẩn hoá, không hỏi xác nhận", async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByRole("textbox", { name: /Giới hạn/ }), "10");
    await user.type(
      screen.getByRole("textbox", { name: /Chỉ các SKU/ }),
      "OHI01-DEN, ohi01-den GOI01",
    );
    await user.click(screen.getByRole("button", { name: /Chạy thử/ }));
    await waitFor(() =>
      expect(api.startPancakePosSync).toHaveBeenCalledWith({
        mode: "dry_run",
        limit: 10,
        skus: ["OHI01-DEN", "GOI01"],
      }),
    );
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("đồng bộ thật phải xác nhận; huỷ thì không gọi API", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: /^Đồng bộ$/ }));
    await answerConfirm(user, false);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(api.startPancakePosSync).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /^Đồng bộ$/ }));
    await answerConfirm(user, true);
    await waitFor(() =>
      expect(api.startPancakePosSync).toHaveBeenCalledWith({
        mode: "full",
        limit: undefined,
        skus: undefined,
      }),
    );
  });

  it("cờ tắt: khoá Đồng bộ nhưng vẫn cho Chạy thử; không có quyền sửa thì khoá cả hai", () => {
    setup({ status: { ...READY, enabled: false } });
    expect(screen.getByRole("button", { name: /^Đồng bộ$/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Chạy thử/ })).toBeEnabled();
  });

  it("không có quyền sửa thì khoá cả hai nút", () => {
    setup({ canEdit: false });
    expect(screen.getByRole("button", { name: /^Đồng bộ$/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Chạy thử/ })).toBeDisabled();
  });

  it("giới hạn sai thì báo lỗi, không gọi API", async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByRole("textbox", { name: /Giới hạn/ }), "abc");
    await user.click(screen.getByRole("button", { name: /Chạy thử/ }));
    expect(api.startPancakePosSync).not.toHaveBeenCalled();
  });
});
