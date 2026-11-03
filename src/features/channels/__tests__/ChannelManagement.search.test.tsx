import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen } from "@testing-library/react";

import { ChannelManagement } from "@/features/channels/components/ChannelManagement";
import type { ChannelRow } from "@/features/channels/types";
import { renderWithI18n } from "@/test/render-with-i18n";

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

const CHANNELS: ChannelRow[] = [
  makeChannel({
    id: 1,
    code: "HN01",
    name: "Kênh Hà Nội",
    owner: "Nguyễn Văn A",
    kiotviet_mappings: [
      {
        kiotviet_channel_id: 9,
        kiotviet_channel_name: "KV Bắc",
        external_sale_channel_id: "SC-77",
      },
    ],
  }),
  makeChannel({ id: 2, code: "SG01", name: "Kênh Sài Gòn", owner: "Trần Thị B" }),
  makeChannel({
    id: 3,
    code: "DN01",
    name: "Kênh Đà Nẵng",
    landingpage_source: ["dn.example.com"],
  }),
];

function renderManagement(channels: ChannelRow[]) {
  return renderWithI18n(
    <ChannelManagement
      channels={channels}
      canManage={false}
      staffUsers={[]}
      onCreate={vi.fn()}
      onUpdate={vi.fn()}
      onBulkDelete={vi.fn()}
      onLoadAssignments={vi.fn().mockResolvedValue([])}
      onAddAssignment={vi.fn().mockResolvedValue([])}
      onRemoveAssignment={vi.fn().mockResolvedValue([])}
      kiotvietChannels={[]}
    />,
  );
}

function typeSearch(value: string) {
  fireEvent.change(screen.getByPlaceholderText(/Tìm theo mã/i), { target: { value } });
}

afterEach(cleanup);

describe("ChannelManagement — tìm kiếm", () => {
  it("lọc theo tên kể cả khi gõ không dấu", () => {
    renderManagement(CHANNELS);

    typeSearch("kenh ha noi");

    expect(screen.getByText("Kênh Hà Nội")).toBeInTheDocument();
    expect(screen.queryByText("Kênh Sài Gòn")).not.toBeInTheDocument();
    expect(screen.queryByText("Kênh Đà Nẵng")).not.toBeInTheDocument();
  });

  it("lọc theo mã kênh, chủ sở hữu, landing page và mapping KiotViet", () => {
    renderManagement(CHANNELS);

    typeSearch("SG01");
    expect(screen.getByText("Kênh Sài Gòn")).toBeInTheDocument();

    typeSearch("tran thi b");
    expect(screen.getByText("Kênh Sài Gòn")).toBeInTheDocument();

    typeSearch("dn.example.com");
    expect(screen.getByText("Kênh Đà Nẵng")).toBeInTheDocument();

    typeSearch("SC-77");
    expect(screen.getByText("Kênh Hà Nội")).toBeInTheDocument();
    expect(screen.queryByText("Kênh Sài Gòn")).not.toBeInTheDocument();
  });

  it("hiện thông báo rỗng riêng khi không có kết quả", () => {
    renderManagement(CHANNELS);

    typeSearch("khong-ton-tai");

    expect(screen.getByText("Không tìm thấy kênh phù hợp.")).toBeInTheDocument();
    expect(screen.getByText("Tìm thấy 0 / 3 kênh")).toBeInTheDocument();
  });

  it("quay về trang 1 khi đổi từ khoá", () => {
    const many = Array.from({ length: 25 }, (_, index) =>
      makeChannel({ id: index + 1, code: `C${index + 1}`, name: `Kênh số ${index + 1}` }),
    );
    renderManagement(many);

    fireEvent.click(screen.getByRole("button", { name: "Trang 2" }));
    expect(screen.getByText("Kênh số 21")).toBeInTheDocument();
    expect(screen.queryByText("Kênh số 1")).not.toBeInTheDocument();

    typeSearch("kenh so 1");
    expect(screen.getByText("Kênh số 1")).toBeInTheDocument();
  });

  it("nút xóa từ khoá khôi phục danh sách đầy đủ", () => {
    renderManagement(CHANNELS);

    typeSearch("kenh ha noi");
    expect(screen.queryByText("Kênh Sài Gòn")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Xóa tìm kiếm" }));

    expect(screen.getByText("Kênh Sài Gòn")).toBeInTheDocument();
    expect(screen.getByText("Kênh Đà Nẵng")).toBeInTheDocument();
  });
});
