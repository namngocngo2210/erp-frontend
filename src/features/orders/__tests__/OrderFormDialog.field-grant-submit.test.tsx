/**
 * Task 8 review fix (CRITICAL): `OrderFormDialog` KHÔNG được tự strip field
 * thiếu quyền trước khi gọi `onSubmit` — việc strip đã chuyển xuống
 * `prepareOrderEditSubmit` (order-import-format.ts, xem order-payload.test.ts)
 * vì `buildPatchPayload` dựng lại MỌI field bằng fallback rỗng/null/0, nên
 * strip ở `values` (input của nó) sẽ bị nó "hồi sinh" field đó thành giá trị
 * rỗng tường minh — backend coi là "đổi thật" trên field chưa cấp quyền → 403.
 *
 * Test này khoá phần hợp đồng của OrderFormDialog: `onSubmit` luôn nhận `form`
 * ĐẦY ĐỦ (kể cả field đang bị khoá quyền/disabled trên UI), không phải bản đã
 * strip — dù ô nhập tương ứng có bị `disabled` (secondary requirement) hay
 * không.
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
    channelStaffByCode: {},
    submitting: false,
    onSubmit: vi.fn().mockResolvedValue(undefined),
    onFetchOrderHistoryByPhone: vi.fn().mockResolvedValue([]),
    onLookupCustomerByPhone: vi.fn().mockResolvedValue(null),
    onLoadDistrictsForProvince: noop,
    onLoadWardsForDistrict: noop,
    products: [],
    productsPriceBook: "",
  };
}

const ORDER: OrderRow = {
  id: 5,
  channel_code: "facebook",
  name: "Khach A",
  phone: "0900123456",
  total_amount: "500000",
} as unknown as OrderRow;

describe("OrderFormDialog — submit không tự strip field thiếu quyền", () => {
  it("bấm Lưu gửi `onSubmit` với form ĐẦY ĐỦ dù có field bị khoá quyền, không ném lỗi", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    // `total_amount` bị khoá quyền — chỉ ảnh hưởng UI disable, KHÔNG được phép
    // biến mất khỏi object truyền cho onSubmit.
    const canEditField = (field: string) => field !== "total_amount";

    render(
      <I18nProvider>
        <OrderFormDialog
          {...baseProps()}
          mode="edit"
          initialOrder={ORDER}
          onSubmit={onSubmit}
          canEditField={canEditField}
        />
      </I18nProvider>,
    );

    await userEvent.click(screen.getByText("Lưu"));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const submittedForm = onSubmit.mock.calls[0][0];
    expect(submittedForm.channel_code).toBe("facebook");
    expect(submittedForm.phone).toBe("0900123456");
    // Field bị khoá quyền vẫn có mặt trong object — strip (nếu cần) chỉ xảy ra
    // ở tầng nhận onSubmit (OrdersPage.prepareOrderEditSubmit), không phải ở
    // đây. Đây chính là điểm regression đã cắn: strip ở đây khiến field bị
    // strip đi tiếp qua buildPatchPayload và bị dựng lại thành giá trị rỗng.
    expect("total_amount" in submittedForm).toBe(true);
    expect(submittedForm.total_amount).toBe("500000");
  });

  it("ô total_amount bị disable trên UI khi thiếu quyền (secondary requirement vẫn giữ)", () => {
    const canEditField = (field: string) => field !== "total_amount";

    render(
      <I18nProvider>
        <OrderFormDialog
          {...baseProps()}
          mode="edit"
          initialOrder={ORDER}
          canEditField={canEditField}
        />
      </I18nProvider>,
    );

    const label = screen.getAllByText("Tổng số tiền").find((el) => el.tagName === "LABEL");
    if (!label?.parentElement) throw new Error('Không tìm thấy label "Tổng số tiền"');
    const totalAmountInput = within(label.parentElement).getByRole("textbox") as HTMLInputElement;
    expect(totalAmountInput.disabled).toBe(true);
  });
});
