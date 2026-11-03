import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { OrderCell } from "@/features/orders/OrdersTable/OrderCell";
import type { OrderRow } from "@/features/orders/order-types";
import { I18nProvider } from "@/i18n";

afterEach(cleanup);

const ROW = {
  id: 1,
  can_edit: true,
  channel_code: "fb",
  staff_id: 7,
  staff_name: "Sale A",
} as unknown as OrderRow;

const BASE_PROPS = {
  row: ROW,
  columnKey: "staff" as const,
  kiotvietOptions: [],
  addressCatalog: { provinces: [], districts_by_province: {}, wards_by_district_key: {} },
  channelStaffByCode: {
    fb: [
      { id: 7, name: "Sale A" },
      { id: 8, name: "Sale B" },
    ],
  },
  onPatch: vi.fn().mockResolvedValue(undefined),
};

describe("OrderCell cột sale phụ trách", () => {
  it("hiện dropdown khi có quyền gán sale", () => {
    render(
      <I18nProvider>
        <OrderCell {...BASE_PROPS} canAssignSale />
      </I18nProvider>,
    );

    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("chỉ hiện text khi không có quyền gán sale", () => {
    render(
      <I18nProvider>
        <OrderCell {...BASE_PROPS} canAssignSale={false} />
      </I18nProvider>,
    );

    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByText("Sale A")).toBeTruthy();
  });
});

describe("OrderCell cột order_type", () => {
  it("dropdown sửa chỉ cho chọn 3 giá trị backend còn chấp nhận", () => {
    render(
      <I18nProvider>
        <OrderCell
          {...BASE_PROPS}
          columnKey="order_type"
          row={{ ...ROW, order_type: "normal" } as OrderRow}
        />
      </I18nProvider>,
    );

    const values = screen.getAllByRole("option").map((opt) => (opt as HTMLOptionElement).value);
    expect(values).toEqual(["normal", "no_return", "has_return"]);
  });

  it("bảng nhãn (không sửa được) vẫn hiển thị đúng cho 4 giá trị đã gỡ khỏi backend", () => {
    render(
      <I18nProvider>
        <OrderCell
          {...BASE_PROPS}
          columnKey="order_type"
          row={{ ...ROW, can_edit: false, order_type: "same_product" } as OrderRow}
        />
      </I18nProvider>,
    );

    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByText("Cùng sản phẩm")).toBeTruthy();
  });

  // Đơn cũ mang giá trị legacy: không option nào trong 3 giá trị hợp lệ khớp
  // `value` của <select> → trình duyệt chọn -1, ô hiện trống. Sale nhìn thấy ô
  // trống rồi vô ý chọn "Bình thường" là ghi đè im lặng giá trị cũ. Dropdown sửa
  // phải tự chèn thêm option mang chính giá trị legacy đó, disabled, để select
  // hiện đúng nhãn và không ai chọn lại được nó.
  it("dropdown sửa hiện đúng nhãn legacy (disabled) khi order_type là giá trị đã gỡ khỏi backend", () => {
    render(
      <I18nProvider>
        <OrderCell
          {...BASE_PROPS}
          columnKey="order_type"
          row={{ ...ROW, order_type: "same_product" } as OrderRow}
        />
      </I18nProvider>,
    );

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("same_product");

    const legacyOption = screen.getByRole("option", { name: "Cùng sản phẩm" }) as HTMLOptionElement;
    expect(legacyOption.disabled).toBe(true);
    expect(legacyOption.value).toBe("same_product");

    const values = screen.getAllByRole("option").map((opt) => (opt as HTMLOptionElement).value);
    expect(values).toEqual(["same_product", "normal", "no_return", "has_return"]);
  });
});
