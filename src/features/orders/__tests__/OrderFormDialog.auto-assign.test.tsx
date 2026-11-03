/**
 * Checkbox "Chia đơn tự động" trên form tạo đơn: mặc định bật, khoá ô chọn nhân
 * viên khi bật (backend chỉ chia được đơn còn trống sale), và không tồn tại ở
 * form sửa đơn (đơn đã có chủ, cờ cũng không đi kèm PATCH).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { OrderFormDialog } from "@/features/orders/OrderFormDialog";
import type { ChannelOption } from "@/features/orders/order-form/order-form-helpers";
import type { OrderRow } from "@/features/orders/order-types";
import { I18nProvider } from "@/i18n";

afterEach(cleanup);

const CHANNELS: ChannelOption[] = [{ code: "facebook", name: "Facebook", price_book: null }];

function noop() {
  return Promise.resolve();
}

function baseProps() {
  return {
    open: true,
    onOpenChange: vi.fn(),
    channels: CHANNELS,
    kiotvietOptions: [],
    addressCatalog: { provinces: [], districts_by_province: {}, wards_by_district_key: {} },
    channelStaffByCode: { facebook: [{ id: 7, name: "Sale A" }] },
    submitting: false,
    onSubmit: vi.fn().mockResolvedValue(undefined),
    onFetchOrderHistoryByPhone: vi.fn().mockResolvedValue([]),
    onLookupCustomerByPhone: vi.fn().mockResolvedValue(null),
    onLoadDistrictsForProvince: noop,
    onLoadWardsForDistrict: noop,
    products: [],
    productsPriceBook: "",
    canAssignSale: true,
    currentUserId: 99,
  };
}

function autoAssignCheckbox() {
  return screen.getByLabelText("Chia đơn tự động theo cấu hình") as HTMLInputElement;
}

/** Khối field "Nhân viên" (label + SearchableSelect + checkbox chia tự động). */
function staffField() {
  const label = screen.getAllByText("Nhân viên").find((el) => el.tagName === "LABEL");
  if (!label?.parentElement) throw new Error('Không tìm thấy label "Nhân viên"');
  return label.parentElement;
}

/** SearchableSelect bị khoá đánh dấu `aria-disabled` trên ô combobox. */
function staffSelectDisabled() {
  return staffField().querySelector('[aria-disabled="true"]') !== null;
}

describe("OrderFormDialog — chia đơn tự động", () => {
  it("form tạo đơn: mặc định bật và khoá ô chọn nhân viên", () => {
    render(
      <I18nProvider>
        <OrderFormDialog {...baseProps()} mode="create" initialOrder={null} />
      </I18nProvider>,
    );

    expect(autoAssignCheckbox().checked).toBe(true);
    expect(staffSelectDisabled()).toBe(true);
  });

  it("bỏ tích thì mở lại ô chọn nhân viên", async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider>
        <OrderFormDialog {...baseProps()} mode="create" initialOrder={null} />
      </I18nProvider>,
    );

    // Ô nhân viên vốn còn bị khoá bởi điều kiện "chưa chọn kênh" — chọn kênh trước
    // để cô lập đúng ảnh hưởng của checkbox.
    const channelLabel = screen.getAllByText("Kênh bán hàng").find((el) => el.tagName === "LABEL");
    const channelCombobox = within(channelLabel!.parentElement!).getByRole("combobox");
    await user.click(channelCombobox);
    await user.click(await screen.findByRole("option", { name: "Facebook" }));

    await user.click(autoAssignCheckbox());

    expect(autoAssignCheckbox().checked).toBe(false);
    expect(staffSelectDisabled()).toBe(false);
    expect(within(staffField()).getByRole("combobox")).toBeTruthy();
  });

  it("form sửa đơn không có checkbox", () => {
    const order = {
      id: 5,
      channel_code: "facebook",
      name: "Khach A",
      phone: "0900123456",
      staff_id: 7,
    } as unknown as OrderRow;

    render(
      <I18nProvider>
        <OrderFormDialog {...baseProps()} mode="edit" initialOrder={order} />
      </I18nProvider>,
    );

    expect(screen.queryByLabelText("Chia đơn tự động theo cấu hình")).toBeNull();
  });
});
