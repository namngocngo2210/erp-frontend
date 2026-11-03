import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { I18nProvider } from "@/i18n";
import type { ChannelRow } from "@/features/channels/types";
import type { OrderRow } from "@/features/orders/order-types";
import {
  OrderMobileCard,
  type OrderMobileCellProps,
} from "@/features/orders/OrdersTable/OrderMobileCard";

/**
 * Thẻ đơn điện thoại: ô Mã kênh / Trạng thái sale đi qua đúng OrderCell của bảng →
 * đổi giá trị gọi cùng onPatch, chạm thẻ = click dòng, checkbox không mở chi tiết.
 */

const channels = [
  { code: "FB", name: "Facebook Delax" },
  { code: "ZALO", name: "Zalo OA" },
] as ChannelRow[];

const row = {
  id: 42,
  name: "Nguyễn Thị Hồng Nhung",
  phone: "0981234567",
  channel_code: "FB",
  channel_name: "Facebook Delax",
  total_after_discount: "127500000",
  status: 2,
  created_at: "2026-09-24T09:15:00+07:00",
  can_edit: true,
  crm: { sales_status_code: "nurture" },
} as unknown as OrderRow;

function renderCard(
  overrides: Partial<OrderMobileCellProps> = {},
  props: { row?: OrderRow; isSelected?: boolean } = {},
) {
  const onPatch = vi.fn().mockResolvedValue(undefined);
  const onOpenDetails = vi.fn();
  const onToggleSelection = vi.fn();
  const cellProps: OrderMobileCellProps = {
    canCall: false,
    canAssignSale: false,
    canEditField: () => true,
    kiotvietOptions: [],
    addressCatalog: { provinces: [], districts_by_province: {}, wards_by_district_key: {} },
    channelStaffByCode: {},
    channels,
    crmCatalog: null,
    warehouseOptions: [],
    onPatch,
    ...overrides,
  };
  render(
    <I18nProvider>
      <ul>
        <OrderMobileCard
          row={props.row ?? row}
          isSelected={props.isSelected ?? false}
          isActive={false}
          cellProps={cellProps}
          onOpenDetails={onOpenDetails}
          onToggleSelection={onToggleSelection}
        />
      </ul>
    </I18nProvider>,
  );
  return {
    onPatch,
    onOpenDetails,
    onToggleSelection,
    card: screen.getByTestId("order-mobile-card"),
  };
}

describe("OrderMobileCard", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("hiện tên, SĐT bấm gọi, tổng tiền, trạng thái và ngày tạo", () => {
    const { card } = renderCard();
    expect(within(card).getByText("Nguyễn Thị Hồng Nhung")).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: /0981234567/ })).toHaveAttribute(
      "href",
      "tel:0981234567",
    );
    expect(within(card).getByText("127,500,000")).toBeInTheDocument();
    expect(within(card).getByText(/24\/09\/2026/)).toBeInTheDocument();
    // Mã kênh có quyền sửa → select (không phải badge chỉ đọc).
    expect(within(card).getAllByRole("combobox")).toHaveLength(2);
  });

  it("đổi trạng thái sale gọi onPatch như ô bảng, không mở chi tiết", () => {
    const { onPatch, onOpenDetails, card } = renderCard();
    const [, salesSelect] = within(card).getAllByRole("combobox");
    fireEvent.change(salesSelect, { target: { value: "closed" } });
    expect(onPatch).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        crm: expect.objectContaining({ sales_status_code: "closed" }),
      }),
    );
    fireEvent.click(salesSelect);
    expect(onOpenDetails).not.toHaveBeenCalled();
  });

  it("đổi mã kênh gọi onPatch kèm tên kênh", () => {
    const { onPatch, card } = renderCard();
    const [channelSelect] = within(card).getAllByRole("combobox");
    fireEvent.change(channelSelect, { target: { value: "ZALO" } });
    expect(onPatch).toHaveBeenCalledWith(42, { channel_code: "ZALO", channel_name: "Zalo OA" });
  });

  it("không có quyền sửa mã kênh → badge chỉ đọc", () => {
    const { card } = renderCard({ canEditField: (f) => f !== "channel_code" });
    expect(within(card).getAllByRole("combobox")).toHaveLength(1);
    expect(within(card).getByText("Facebook Delax")).toBeInTheDocument();
  });

  it("chạm thẻ mở chi tiết; checkbox chỉ đổi chọn", async () => {
    const user = userEvent.setup();
    const { onOpenDetails, onToggleSelection, card } = renderCard();
    await user.click(within(card).getByText("Nguyễn Thị Hồng Nhung"));
    expect(onOpenDetails).toHaveBeenCalledWith(row);

    onOpenDetails.mockClear();
    await user.click(within(card).getByRole("checkbox"));
    expect(onToggleSelection).toHaveBeenCalledWith(42, false);
    expect(onOpenDetails).not.toHaveBeenCalled();
  });
});
