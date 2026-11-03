import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

import { OrdersFilterBar } from "@/features/orders/orders-filters/OrdersFilterBar";
import { OrdersFilterSheet } from "@/features/orders/orders-filters/OrdersFilterSheet";
import { OrdersFilters } from "@/features/orders/orders-filters/OrdersFilters";
import {
  buildOrdersFilterChips,
  countChipsByGroup,
} from "@/features/orders/orders-filters/orders-filter-chips";
import { type OrdersFilterProps } from "@/features/orders/orders-filters/types";
import { I18nProvider } from "@/i18n";

afterEach(cleanup);

/** `t` giả cho test thuần: trả fallback tiếng Việt như UI thật đang hiển thị. */
const t = (key: string, fallback?: string) => fallback ?? key;

/**
 * Bộ props mặc định = "chưa lọc gì": ngày tạo ở mốc mặc định `this_month`, mọi
 * mảng rỗng, mọi cờ rỗng. Từng test chỉ ghi đè đúng trục nó quan tâm.
 */
function makeProps(overrides: Partial<OrdersFilterProps> = {}): OrdersFilterProps {
  return {
    dateFilter: { option: "this_month", from: "2026-08-01", to: "2026-08-31" },
    onDateFilterChange: vi.fn(),
    returnDateFilter: { option: "custom", from: "", to: "" },
    onReturnDateFilterChange: vi.fn(),
    kiotvietPurchaseDateFilter: { option: "custom", from: "", to: "" },
    onKiotvietPurchaseDateFilterChange: vi.fn(),

    kiotvietChannelOptions: [{ value: "1", label: "Kênh KV 1" }],
    selectedKiotvietChannelOptions: [],
    onKiotvietChannelChange: vi.fn(),

    branchIdOptions: [{ value: "10", label: "Chi nhánh Hà Nội" }],
    selectedBranchIdOptions: [],
    onBranchIdChange: vi.fn(),

    fulfillmentWarehouseOptions: [{ value: "7", label: "Kho HN" }],
    selectedFulfillmentWarehouseOptions: [],
    onFulfillmentWarehouseChange: vi.fn(),

    hideChannelFilter: false,
    channelOptions: [
      { value: "fb", label: "Facebook" },
      { value: "web", label: "Web" },
    ],
    selectedChannelOptions: [],
    onChannelChange: vi.fn(),

    staffOptions: [{ value: "7", label: "thuha" }],
    selectedStaffOptions: [],
    onStaffChange: vi.fn(),

    salesStatusOptions: [{ value: "closed", label: "Đã chốt" }],
    selectedSalesStatusOptions: [],
    onSalesStatusChange: vi.fn(),

    invoiceStatusOptions: [{ value: "1", label: "Hoàn thành" }],
    invoiceStatus: [],
    onInvoiceStatusChange: vi.fn(),

    vatOptions: [{ value: "yes", label: "Có VAT" }],
    vat: [],
    onVatChange: vi.fn(),

    orderTypeOptions: [{ value: "normal", label: "Bình thường" }],
    orderType: [],
    onOrderTypeChange: vi.fn(),

    shippingTypeOptions: [{ value: "shipment", label: "Giao vận" }],
    channelTypeOptions: [{ value: "shopee", label: "Shopee" }],
    shippingType: [],
    channelType: [],
    onShippingTypeChange: vi.fn(),
    onChannelTypeChange: vi.fn(),

    isKoc: false,
    kocOrderTypeOptions: [{ value: "gift", label: "Đơn tặng" }],
    kocOrderType: [],
    onKocOrderTypeChange: vi.fn(),

    statusOptions: [{ value: "2", label: "Đang giao hàng" }],
    status: [],
    onStatusChange: vi.fn(),

    deliveryBusinessStatusOptions: [{ value: "received", label: "Đã nhận" }],
    selectedDeliveryBusinessStatusOptions: [],
    onDeliveryBusinessStatusChange: vi.fn(),

    hasShippingCode: "",
    onHasShippingCodeChange: vi.fn(),
    isDeliveryInvoicePrinted: "",
    onIsDeliveryInvoicePrintedChange: vi.fn(),
    customerReturn: "",
    onCustomerReturnChange: vi.fn(),
    hasReturnSlip: "",
    onHasReturnSlipChange: vi.fn(),
    hasRecallCode: "",
    onHasRecallCodeChange: vi.fn(),
    hasCallRecording: "",
    onHasCallRecordingChange: vi.fn(),
    hasInternalNote: "",
    onHasInternalNoteChange: vi.fn(),
    hasAddress: "",
    onHasAddressChange: vi.fn(),

    productOptions: [{ value: "100", label: "TMS01" }],
    selectedProductOptions: [],
    onProductChange: vi.fn(),

    onClearFilters: vi.fn(),
    ...overrides,
  };
}

function renderWithI18n(ui: ReactNode) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe("Bộ lọc đơn hàng — chip điều kiện đang áp", () => {
  it("chưa lọc gì thì không có chip nào", () => {
    expect(buildOrdersFilterChips(makeProps(), t)).toHaveLength(0);
  });

  it("ngày tạo ở mốc mặc định 'tháng này' không tính là điều kiện", () => {
    const chips = buildOrdersFilterChips(
      makeProps({ dateFilter: { option: "this_month", from: "2026-08-01", to: "2026-08-31" } }),
      t,
    );
    expect(chips.find((chip) => chip.key === "dateFilter")).toBeUndefined();
  });

  it("đổi ngày tạo sang khoảng tùy chọn thì hiện chip DD/MM – DD/MM", () => {
    const chips = buildOrdersFilterChips(
      makeProps({ dateFilter: { option: "custom", from: "2026-08-01", to: "2026-08-26" } }),
      t,
    );
    const chip = chips.find((item) => item.key === "dateFilter");
    expect(chip?.label).toBe("Ngày tạo");
    expect(chip?.value).toBe("01/08 – 26/08");
  });

  it("nhiều lựa chọn thì rút gọn thành 'nhãn đầu +n'", () => {
    const chips = buildOrdersFilterChips(
      makeProps({
        selectedChannelOptions: [
          { value: "fb", label: "Facebook" },
          { value: "web", label: "Web" },
        ],
      }),
      t,
    );
    expect(chips.find((chip) => chip.key === "channel")?.value).toBe("Facebook +1");
  });

  it("cờ ba trạng thái hiện Có / Không", () => {
    const yes = buildOrdersFilterChips(makeProps({ hasShippingCode: "yes" }), t);
    const no = buildOrdersFilterChips(makeProps({ hasShippingCode: "no" }), t);
    expect(yes.find((chip) => chip.key === "hasShippingCode")?.value).toBe("Có");
    expect(no.find((chip) => chip.key === "hasShippingCode")?.value).toBe("Không");
  });

  it("gỡ chip chỉ gọi handler của đúng trục đó", () => {
    const props = makeProps({
      selectedChannelOptions: [{ value: "fb", label: "Facebook" }],
      hasShippingCode: "yes",
    });
    const chips = buildOrdersFilterChips(props, t);

    chips.find((chip) => chip.key === "channel")?.onClear();
    expect(props.onChannelChange).toHaveBeenCalledWith([]);
    expect(props.onHasShippingCodeChange).not.toHaveBeenCalled();

    chips.find((chip) => chip.key === "hasShippingCode")?.onClear();
    expect(props.onHasShippingCodeChange).toHaveBeenCalledWith("");
  });

  it("gỡ chip ngày tạo trả về mốc mặc định 'tháng này'", () => {
    const props = makeProps({
      dateFilter: { option: "custom", from: "2026-08-01", to: "2026-08-26" },
    });
    buildOrdersFilterChips(props, t)
      .find((chip) => chip.key === "dateFilter")
      ?.onClear();
    expect(props.onDateFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ option: "this_month" }),
    );
  });

  it("ô lọc bị ẩn theo trang thì không sinh chip", () => {
    const hiddenChannel = buildOrdersFilterChips(
      makeProps({
        hideChannelFilter: true,
        selectedChannelOptions: [{ value: "fb", label: "Facebook" }],
      }),
      t,
    );
    expect(hiddenChannel.find((chip) => chip.key === "channel")).toBeUndefined();

    const notKoc = buildOrdersFilterChips(makeProps({ isKoc: false, kocOrderType: ["gift"] }), t);
    expect(notKoc.find((chip) => chip.key === "kocOrderType")).toBeUndefined();
  });

  it("đếm điều kiện theo nhóm đúng nhóm của từng trục", () => {
    const chips = buildOrdersFilterChips(
      makeProps({
        selectedChannelOptions: [{ value: "fb", label: "Facebook" }],
        selectedStaffOptions: [{ value: "7", label: "thuha" }],
        status: ["2"],
        hasShippingCode: "yes",
        hasInternalNote: "no",
        selectedProductOptions: [{ value: "100", label: "TMS01" }],
      }),
      t,
    );
    expect(countChipsByGroup(chips)).toEqual({
      time: 0,
      channelStaff: 2,
      status: 1,
      flags: 2,
      product: 1,
    });
  });
});

describe("Bộ lọc đơn hàng — thanh ngang", () => {
  it("nút Bộ lọc đeo badge bằng số điều kiện đang áp", () => {
    renderWithI18n(
      <OrdersFilterBar
        {...makeProps({
          selectedChannelOptions: [{ value: "fb", label: "Facebook" }],
          hasShippingCode: "yes",
        })}
        onOpenSheet={vi.fn()}
      />,
    );
    const button = screen.getByRole("button", { name: /Bộ lọc/ });
    expect(within(button).getByText("2")).toBeInTheDocument();
  });

  it("chưa lọc gì thì không có chip và không có nút Xoá bộ lọc", () => {
    renderWithI18n(<OrdersFilterBar {...makeProps()} onOpenSheet={vi.fn()} />);
    expect(screen.queryByText("Lọc thêm:")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Xóa bộ lọc" })).not.toBeInTheDocument();
  });

  it("trục đã có ô riêng trên thanh thì không dựng chip trùng", () => {
    renderWithI18n(
      <OrdersFilterBar
        {...makeProps({ selectedChannelOptions: [{ value: "fb", label: "Facebook" }] })}
        onOpenSheet={vi.fn()}
      />,
    );
    // Kênh đã hiện ngay trong ô lọc trên thanh — không được lặp lại thành chip.
    expect(screen.queryByRole("button", { name: "Bỏ lọc Kênh" })).not.toBeInTheDocument();
    expect(screen.queryByText("Lọc thêm:")).not.toBeInTheDocument();
  });

  it("trục chỉ có trong ngăn kéo thì hiện thành chip", () => {
    renderWithI18n(<OrdersFilterBar {...makeProps({ status: ["2"] })} onOpenSheet={vi.fn()} />);
    expect(screen.getByText("Lọc thêm:")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Bỏ lọc Trạng thái vận chuyển" }),
    ).toBeInTheDocument();
  });

  it("bấm nút Bộ lọc thì mở ngăn kéo", async () => {
    const user = userEvent.setup();
    const onOpenSheet = vi.fn();
    renderWithI18n(<OrdersFilterBar {...makeProps()} onOpenSheet={onOpenSheet} />);

    await user.click(screen.getByRole("button", { name: /Bộ lọc/ }));
    expect(onOpenSheet).toHaveBeenCalledTimes(1);
  });

  it("bấm ✕ trên chip chỉ gỡ đúng điều kiện đó", async () => {
    const user = userEvent.setup();
    const props = makeProps({ status: ["2"], hasShippingCode: "yes" });
    renderWithI18n(<OrdersFilterBar {...props} onOpenSheet={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Bỏ lọc Trạng thái vận chuyển" }));
    expect(props.onStatusChange).toHaveBeenCalledWith([]);
    expect(props.onHasShippingCodeChange).not.toHaveBeenCalled();
  });
});

describe("Bộ lọc đơn hàng — ngăn kéo 5 nhóm", () => {
  it("mở ra là thấy đủ 5 nhóm", () => {
    renderWithI18n(<OrdersFilterSheet {...makeProps()} open onOpenChange={vi.fn()} />);
    for (const group of ["Thời gian", "Kênh & Nhân sự", "Trạng thái", "Cờ Có/Không", "Sản phẩm"]) {
      expect(screen.getByRole("button", { name: new RegExp(group) })).toBeInTheDocument();
    }
  });

  it("đóng thì không render nội dung bộ lọc", () => {
    renderWithI18n(<OrdersFilterSheet {...makeProps()} open={false} onOpenChange={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /Thời gian/ })).not.toBeInTheDocument();
  });

  it("nhóm đang có điều kiện được mở sẵn", () => {
    renderWithI18n(
      <OrdersFilterSheet {...makeProps({ hasShippingCode: "yes" })} open onOpenChange={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: /Cờ Có\/Không/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    // Nhóm không có điều kiện thì vẫn gập, trừ "Thời gian" luôn mở.
    expect(screen.getByRole("button", { name: /Sản phẩm/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByRole("button", { name: /Thời gian/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("cờ ba trạng thái gửi đúng chuỗi rỗng / yes / no", async () => {
    const user = userEvent.setup();
    const props = makeProps({ hasShippingCode: "yes" });
    renderWithI18n(<OrdersFilterSheet {...props} open onOpenChange={vi.fn()} />);

    const group = screen.getByRole("group", { name: "Mã vận đơn" });
    expect(within(group).getByRole("button", { name: "Có" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(within(group).getByRole("button", { name: "Không" }));
    expect(props.onHasShippingCodeChange).toHaveBeenLastCalledWith("no");

    await user.click(within(group).getByRole("button", { name: "Tất cả" }));
    expect(props.onHasShippingCodeChange).toHaveBeenLastCalledWith("");
  });

  it("ô lọc Loại đơn KOC chỉ hiện ở trang KOC", async () => {
    const user = userEvent.setup();
    // Nhóm "Trạng thái" gập khi chưa có điều kiện nào, phải mở ra mới soi được ô bên trong.
    const openStatusGroup = () =>
      user.click(screen.getByRole("button", { name: /Trạng thái(?!\s+sale)/ }));

    const { unmount } = renderWithI18n(
      <OrdersFilterSheet {...makeProps({ isKoc: false })} open onOpenChange={vi.fn()} />,
    );
    await openStatusGroup();
    expect(screen.queryByText("Loại đơn KOC")).not.toBeInTheDocument();
    unmount();

    renderWithI18n(
      <OrdersFilterSheet {...makeProps({ isKoc: true })} open onOpenChange={vi.fn()} />,
    );
    await openStatusGroup();
    expect(screen.getByText("Loại đơn KOC")).toBeInTheDocument();
  });
});

describe("Bộ lọc đơn hàng — bản điện thoại (compact)", () => {
  it("chỉ còn nút icon có badge, không dựng thanh lọc ngang", () => {
    renderWithI18n(<OrdersFilters {...makeProps({ hasShippingCode: "yes" })} compact />);
    const button = screen.getByRole("button", { name: "Bộ lọc" });
    expect(within(button).getByText("1")).toBeInTheDocument();
    // Thanh ngang hiện chip "Lọc thêm:" cho trục chỉ có trong ngăn kéo — bản compact thì không.
    expect(screen.queryByText("Lọc thêm:")).not.toBeInTheDocument();
  });

  it("bấm nút mở ngăn kéo từ đáy với đủ nhóm lọc", async () => {
    const user = userEvent.setup();
    renderWithI18n(<OrdersFilters {...makeProps()} compact />);
    await user.click(screen.getByRole("button", { name: "Bộ lọc" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("bottom-0");
    expect(within(dialog).getByText("Thời gian")).toBeInTheDocument();
  });
});
