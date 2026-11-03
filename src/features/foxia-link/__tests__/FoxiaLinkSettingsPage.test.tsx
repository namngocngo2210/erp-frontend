import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/foxia-link", () => ({
  getLinkConfig: vi.fn(),
  addLinkChannels: vi.fn(),
  deleteLinkChannel: vi.fn(),
  saveLinkCells: vi.fn(),
}));
vi.mock("@/lib/api/channels", () => ({ listChannels: vi.fn(async () => []) }));
vi.mock("sonner", async () => (await import("@/test/utils")).makeToastMock());

import { toast } from "sonner";

import * as api from "@/lib/api/foxia-link";
import * as channelsApi from "@/lib/api/channels";
import FoxiaLinkSettingsPage from "@/features/foxia-link/pages/FoxiaLinkSettingsPage";
import { I18nProvider } from "@/i18n";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { answerConfirm, renderWithClient } from "@/test/utils";

const KINDS = [
  { value: "landing", label: "Landing" },
  { value: "messenger", label: "Messenger" },
  { value: "hotline", label: "Hotline" },
  { value: "zalo", label: "Zalo" },
  { value: "resale", label: "Resale" },
];

const GRID = {
  channels: [
    { id: 1, channel_id: 11, code: "kenh-a", name: "Kênh A", sort_order: 0 },
    { id: 2, channel_id: 12, code: "kenh-b", name: "Kênh B", sort_order: 1 },
  ],
  kinds: KINDS,
  cells: [
    { link_channel_id: 1, kind: "landing", foxia_source_id: 1234, source_name: "Nguồn X" },
    { link_channel_id: 1, kind: "zalo", foxia_source_id: 1235, source_name: "" },
  ],
};

function renderPage() {
  return renderWithClient(
    <I18nProvider>
      <ConfirmProvider>
        <FoxiaLinkSettingsPage />
      </ConfirmProvider>
    </I18nProvider>,
  );
}

describe("FoxiaLinkSettingsPage", () => {
  beforeEach(() => {
    vi.mocked(api.getLinkConfig).mockResolvedValue(structuredClone(GRID));
    vi.mocked(api.saveLinkCells).mockResolvedValue(structuredClone(GRID));
    vi.mocked(api.deleteLinkChannel).mockResolvedValue({ deleted_cells: 1 });
  });

  it("dựng hàng kênh và cột loại nguồn đúng thứ tự BE trả", async () => {
    renderPage();
    expect(await screen.findByText("Kênh A")).toBeInTheDocument();
    expect(screen.getByText("Kênh B")).toBeInTheDocument();
    // Hàng đầu của bảng là hàng tiêu đề; các th ở cột trái (tên kênh) cũng có
    // role columnheader trong jsdom nên phải khoanh vào đúng hàng.
    const headerRow = screen.getAllByRole("row")[0];
    const headers = within(headerRow)
      .getAllByRole("columnheader")
      .map((th) => th.textContent);
    expect(headers).toEqual(["Kênh bán", "Landing", "Messenger", "Hotline", "Zalo", "Resale"]);
    expect(screen.getByLabelText("Kênh A × Landing")).toHaveValue("1234");
    expect(screen.getByLabelText("Kênh A × Zalo")).toHaveValue("1235");
    expect(screen.getByLabelText("Kênh B × Landing")).toHaveValue("");
    expect(screen.getByText("Nguồn X")).toBeInTheDocument();
  });

  it("sửa ô thì bật nút Lưu và gửi đúng ô đã đổi kèm kind", async () => {
    const user = userEvent.setup();
    renderPage();

    const input = await screen.findByLabelText("Kênh A × Landing");
    await user.clear(input);
    await user.type(input, "9999");

    const save = screen.getByRole("button", { name: /Lưu/ });
    expect(save).toBeEnabled();
    await user.click(save);

    await waitFor(() =>
      expect(api.saveLinkCells).toHaveBeenCalledWith([
        { link_channel_id: 1, kind: "landing", foxia_source_id: 9999 },
      ]),
    );
  });

  it("điền ô trống ở cột khác thì gửi đúng kind của cột đó", async () => {
    const user = userEvent.setup();
    renderPage();

    const input = await screen.findByLabelText("Kênh B × Resale");
    await user.type(input, "8888");
    await user.click(screen.getByRole("button", { name: /Lưu/ }));

    await waitFor(() =>
      expect(api.saveLinkCells).toHaveBeenCalledWith([
        { link_channel_id: 2, kind: "resale", foxia_source_id: 8888 },
      ]),
    );
  });

  it("xoá trắng ô đã điền thì gửi foxia_source_id: null", async () => {
    const user = userEvent.setup();
    renderPage();

    const input = await screen.findByLabelText("Kênh A × Landing");
    await user.clear(input);

    const save = screen.getByRole("button", { name: /Lưu/ });
    expect(save).toBeEnabled();
    await user.click(save);

    await waitFor(() =>
      expect(api.saveLinkCells).toHaveBeenCalledWith([
        { link_channel_id: 1, kind: "landing", foxia_source_id: null },
      ]),
    );
  });

  it("nút Lưu tắt khi chưa sửa gì, và tắt lại khi sửa xong quay về giá trị cũ", async () => {
    const user = userEvent.setup();
    renderPage();

    const input = await screen.findByLabelText("Kênh A × Landing");
    expect(screen.getByRole("button", { name: /Lưu/ })).toBeDisabled();

    await user.clear(input);
    await user.type(input, "9999");
    expect(screen.getByRole("button", { name: /Lưu/ })).toBeEnabled();

    await user.clear(input);
    await user.type(input, "1234");
    expect(screen.getByRole("button", { name: /Lưu/ })).toBeDisabled();
  });

  it("bỏ kênh thì hỏi xác nhận kèm số ô đã điền của hàng", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Kênh A");
    await user.click(screen.getByRole("button", { name: /Bỏ kênh Kênh A/ }));

    // Kênh A có 2 ô đã điền (landing + zalo).
    expect(await screen.findByRole("alertdialog")).toHaveTextContent("2 ô");
    await answerConfirm(user, false);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(api.deleteLinkChannel).not.toHaveBeenCalled();
  });

  it("bỏ kênh và đồng ý xác nhận thì gọi API xoá kênh", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Kênh A");
    await user.click(screen.getByRole("button", { name: /Bỏ kênh Kênh A/ }));
    await answerConfirm(user, true);

    await waitFor(() => expect(api.deleteLinkChannel).toHaveBeenCalledWith(1));
  });

  it("bỏ kênh nhưng API lỗi thì báo toast, KHÔNG xoá dữ liệu trên bảng (I7)", async () => {
    const user = userEvent.setup();
    vi.mocked(api.deleteLinkChannel).mockRejectedValueOnce(new Error("network down"));
    renderPage();

    const input = await screen.findByLabelText("Kênh A × Landing");
    await user.clear(input);
    await user.type(input, "5555");
    expect(input).toHaveValue("5555");

    await user.click(screen.getByRole("button", { name: /Bỏ kênh Kênh A/ }));
    await answerConfirm(user, true);

    await waitFor(() => expect(api.deleteLinkChannel).toHaveBeenCalledWith(1));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    // Grid không refetch (refresh() không chạy khi lỗi) — ô vẫn còn "5555" đang gõ.
    expect(screen.getByDisplayValue("5555")).toBeInTheDocument();
  });

  it("thêm kênh: mở hộp chọn, ẩn kênh đã có, chọn rồi xác nhận thì gọi API", async () => {
    const user = userEvent.setup();
    vi.mocked(channelsApi.listChannels).mockResolvedValue([
      { id: 11, code: "kenh-a", name: "Kênh A" } as never,
      { id: 13, code: "kenh-c", name: "Kênh C" } as never,
    ]);
    renderPage();

    await screen.findByText("Kênh A");
    await user.click(screen.getByRole("button", { name: /Thêm kênh/ }));

    const dialog = within(await screen.findByRole("dialog"));
    // Kênh A (channel_id=11) đã có trong bảng → không hiện lại trong hộp chọn.
    expect(dialog.queryByText("Kênh A")).not.toBeInTheDocument();
    await user.click(dialog.getByText("Kênh C"));
    await user.click(dialog.getByRole("button", { name: /Thêm kênh/ }));

    await waitFor(() => expect(api.addLinkChannels).toHaveBeenCalledWith([13]));
  });

  it("bảng rỗng hiện thông báo trống thay vì bảng", async () => {
    vi.mocked(api.getLinkConfig).mockResolvedValue({ channels: [], kinds: KINDS, cells: [] });
    renderPage();
    expect(await screen.findByText(/Chưa có kênh nào trong bảng/)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
