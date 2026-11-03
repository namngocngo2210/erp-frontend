import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, screen } from "@testing-library/react";

import { KiotVietManagement } from "@/features/kiotviet/components/KiotVietManagement";
import type { KiotVietChannelRow } from "@/features/kiotviet/types";
import { renderWithI18n } from "@/test/render-with-i18n";

function makeRow(
  overrides: Partial<KiotVietChannelRow> & Pick<KiotVietChannelRow, "id" | "name">,
): KiotVietChannelRow {
  return {
    branch_id: "",
    branch_ids: [],
    client_id: "",
    client_secret: "secret",
    retailer: "",
    old: false,
    created_at: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

const ROWS: KiotVietChannelRow[] = [
  makeRow({
    id: 1,
    name: "Kiot Hà Nội",
    branch_ids: ["1001", "1002"],
    client_id: "cid-hn",
    retailer: "desi-hn",
  }),
  makeRow({
    id: 2,
    name: "Kiot Sài Gòn",
    branch_ids: ["2001"],
    client_id: "cid-sg",
    retailer: "desi-sg",
  }),
  makeRow({
    id: 3,
    name: "Kiot cũ Đà Nẵng",
    branch_ids: ["3001"],
    client_id: "cid-dn",
    retailer: "desi-dn",
    old: true,
  }),
];

function renderManagement(rows: KiotVietChannelRow[]) {
  return renderWithI18n(
    <KiotVietManagement
      rows={rows}
      onCreate={vi.fn()}
      onUpdate={vi.fn()}
      onDelete={vi.fn()}
      onBulkDelete={vi.fn()}
    />,
  );
}

function typeSearch(value: string) {
  fireEvent.change(screen.getByPlaceholderText(/Tìm theo tên/i), { target: { value } });
}

afterEach(cleanup);

describe("KiotVietManagement — tìm kiếm", () => {
  it("lọc theo tên kể cả khi gõ không dấu", () => {
    renderManagement(ROWS);

    typeSearch("kiot ha noi");

    expect(screen.getByText("Kiot Hà Nội")).toBeInTheDocument();
    expect(screen.queryByText("Kiot Sài Gòn")).not.toBeInTheDocument();
  });

  it("lọc theo mã kho, retailer và client ID", () => {
    renderManagement(ROWS);

    typeSearch("1002");
    expect(screen.getByText("Kiot Hà Nội")).toBeInTheDocument();
    expect(screen.queryByText("Kiot Sài Gòn")).not.toBeInTheDocument();

    typeSearch("desi-sg");
    expect(screen.getByText("Kiot Sài Gòn")).toBeInTheDocument();

    typeSearch("cid-dn");
    expect(screen.getByText("Kiot cũ Đà Nẵng")).toBeInTheDocument();
    expect(screen.queryByText("Kiot Hà Nội")).not.toBeInTheDocument();
  });

  it("hiện thông báo rỗng riêng khi không có kết quả", () => {
    renderManagement(ROWS);

    typeSearch("khong-ton-tai");

    expect(screen.getByText("Không tìm thấy kênh KiotViet phù hợp.")).toBeInTheDocument();
    expect(screen.getByText("Tìm thấy 0 / 3 kênh KiotViet")).toBeInTheDocument();
  });

  it("quay về trang 1 khi đổi từ khoá", () => {
    const many = Array.from({ length: 25 }, (_, index) =>
      makeRow({ id: index + 1, name: `Kiot số ${index + 1}`, client_id: `cid-${index + 1}` }),
    );
    renderManagement(many);

    fireEvent.click(screen.getByRole("button", { name: "Trang 2" }));
    expect(screen.getByText("Kiot số 21")).toBeInTheDocument();
    expect(screen.queryByText("Kiot số 1")).not.toBeInTheDocument();

    typeSearch("cid-1");
    expect(screen.getByText("Kiot số 1")).toBeInTheDocument();
  });
});
