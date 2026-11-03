import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import {
  ORDER_COLUMN_OPTIONS,
  TABLE_ONLY_COLUMN_KEYS,
  type OrderColumnKey,
  type OrderRow,
} from "@/features/orders/order-types";
import { ExportColumnsDialog } from "@/features/orders/ExportColumnsDialog";
import { RECALL_COLUMN_KEYS } from "@/features/orders/order-import-format";
import { DEFAULT_ORDER_COLUMNS } from "@/features/orders/order-storage";
import { OrderCell } from "@/features/orders/OrdersTable/OrderCell";
import { I18nProvider } from "@/i18n";

// Không cast `as never` như trong brief gốc: BASE_PROPS được spread vào JSX
// (`{...BASE_PROPS}`), spread một giá trị kiểu `never` là lỗi TS2698 — mirror
// đúng cách shipping-type.test.tsx khai báo (không cast).
const BASE_PROPS = {
  kiotvietOptions: [],
  addressCatalog: { provinces: [], districts_by_province: {}, wards_by_district_key: {} },
  channelStaffByCode: {},
};

describe("cột Loại đơn KOC", () => {
  it("chọn được nhưng không bật sẵn, và chỉ hiện ở trang KOC", () => {
    expect(ORDER_COLUMN_OPTIONS.some((c) => c.key === "koc_order_type")).toBe(true);
    expect(DEFAULT_ORDER_COLUMNS).not.toContain("koc_order_type");
    // Nằm trong nhóm cột KOC → OrdersPage/OrdersColumnPicker tự lọc bỏ ở trang khác.
    expect(RECALL_COLUMN_KEYS).toContain("koc_order_type");
  });

  it("hiện nhãn tiếng Việt", () => {
    const row = { id: 1, koc_order_type: "renewal" } as unknown as OrderRow;
    render(
      <I18nProvider>
        <OrderCell {...BASE_PROPS} columnKey="koc_order_type" row={row} />
      </I18nProvider>,
    );
    expect(screen.getByText("Gia hạn")).toBeInTheDocument();
  });

  it("đơn chưa gán nhãn hiện gạch ngang", () => {
    const row = { id: 2, koc_order_type: "" } as unknown as OrderRow;
    render(
      <I18nProvider>
        <OrderCell {...BASE_PROPS} columnKey="koc_order_type" row={row} />
      </I18nProvider>,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  // Trước đây cột này chỉ hiển thị badge, muốn gán nhãn phải mở trang chi tiết.
  it("sửa được ngay trên lưới, gửi giá trị vừa chọn", async () => {
    const onPatch = vi.fn().mockResolvedValue(undefined);
    const row = { id: 3, can_edit: true, koc_order_type: "" } as unknown as OrderRow;
    render(
      <I18nProvider>
        <OrderCell {...BASE_PROPS} columnKey="koc_order_type" row={row} onPatch={onPatch} />
      </I18nProvider>,
    );
    await userEvent.selectOptions(screen.getByRole("combobox"), "recall");
    expect(onPatch).toHaveBeenCalledWith(3, { koc_order_type: "recall" });
  });

  it("không có quyền sửa field thì quay về badge chỉ đọc", () => {
    const row = { id: 4, can_edit: true, koc_order_type: "renewal" } as unknown as OrderRow;
    render(
      <I18nProvider>
        <OrderCell
          {...BASE_PROPS}
          columnKey="koc_order_type"
          row={row}
          onPatch={vi.fn()}
          canEditField={() => false}
        />
      </I18nProvider>,
    );
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByText("Gia hạn")).toBeInTheDocument();
  });
});

/**
 * File Excel CỐ Ý giữ 3 cột thu hồi rời (file mẫu/pivot của người dùng bám theo
 * đúng 3 cột đó) — chỉ LƯỚI mới gộp. Cột gộp lọt vào đây thì file xuất ra có
 * một cột trống, backend không biết dựng key `recall_entries`.
 */
describe("hộp thoại chọn cột xuất Excel", () => {
  it("giữ 3 cột thu hồi rời và loại cột gộp của lưới", async () => {
    expect(TABLE_ONLY_COLUMN_KEYS).toContain("recall_entries");
    expect(ORDER_COLUMN_OPTIONS.some((c) => c.key === "recall_entries")).toBe(true);

    render(
      <I18nProvider>
        <ExportColumnsDialog
          open
          onOpenChange={() => {}}
          exportColumns={["invoice_code"] as OrderColumnKey[]}
          setExportColumns={() => {}}
          onConfirm={() => {}}
        />
      </I18nProvider>,
    );
    const pane = within(screen.getByTestId("column-manager-available"));
    await userEvent.type(screen.getByLabelText("Tìm cột…"), "thu hồi");
    expect(pane.getByText("Mã đơn thu hồi")).toBeTruthy();
    expect(pane.getByText("Ngày tạo đơn thu hồi")).toBeTruthy();
    expect(pane.getByText("Ngày nhận hàng thu hồi")).toBeTruthy();
    expect(pane.queryByText("Đợt thu hồi")).toBeNull();
  });
});
