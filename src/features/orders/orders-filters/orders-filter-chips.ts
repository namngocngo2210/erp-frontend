import { getDateRange, type DateFilterValue } from "@/components/ui/date-filter";
import { type FilterSelectOption } from "@/features/orders/filter-types";
import { type OrdersFilterProps } from "@/features/orders/orders-filters/types";
import { type useI18n } from "@/i18n";

type Translate = ReturnType<typeof useI18n>["t"];

/**
 * Trục lọc đã có ô riêng ngay trên thanh ngang.
 *
 * Thanh lọc KHÔNG dựng chip cho các trục này: giá trị đã hiện sẵn trong ô, thêm
 * chip nữa là cùng một điều kiện hiện hai lần cạnh nhau.
 */
export const ORDERS_FILTER_BAR_KEYS: readonly string[] = [
  "dateFilter",
  "channel",
  "staff",
  "salesStatus",
];

/** Năm nhóm của ngăn kéo bộ lọc. */
export type OrdersFilterGroup = "time" | "channelStaff" | "status" | "flags" | "product";

/**
 * Chip nào thuộc nhóm nào — dùng để gắn badge số điều kiện lên đầu mỗi nhóm và
 * quyết định nhóm nào mở sẵn khi mở ngăn kéo.
 */
export const ORDERS_FILTER_GROUP_BY_CHIP: Record<string, OrdersFilterGroup> = {
  dateFilter: "time",
  returnDateFilter: "time",
  kiotvietPurchaseDateFilter: "time",
  kiotvietChannel: "channelStaff",
  branchId: "channelStaff",
  fulfillmentWarehouse: "channelStaff",
  channel: "channelStaff",
  channelType: "channelStaff",
  staff: "channelStaff",
  salesStatus: "status",
  status: "status",
  deliveryBusinessStatus: "status",
  invoiceStatus: "status",
  vat: "status",
  orderType: "status",
  shippingType: "status",
  kocOrderType: "status",
  hasShippingCode: "flags",
  isDeliveryInvoicePrinted: "flags",
  customerReturn: "flags",
  hasReturnSlip: "flags",
  hasRecallCode: "flags",
  hasCallRecording: "flags",
  hasInternalNote: "flags",
  hasAddress: "flags",
  product: "product",
};

/** Đếm số điều kiện đang áp của từng nhóm. */
export function countChipsByGroup(chips: OrdersFilterChip[]): Record<OrdersFilterGroup, number> {
  const counts: Record<OrdersFilterGroup, number> = {
    time: 0,
    channelStaff: 0,
    status: 0,
    flags: 0,
    product: 0,
  };
  for (const chip of chips) {
    const group = ORDERS_FILTER_GROUP_BY_CHIP[chip.key];
    if (group) counts[group] += 1;
  }
  return counts;
}

/** Một điều kiện lọc đang áp, hiển thị thành chip bấm ✕ được. */
export type OrdersFilterChip = {
  key: string;
  /** Tên ô lọc, ví dụ "Kênh bán hàng". */
  label: string;
  /** Giá trị đang lọc, đã rút gọn thành "Facebook +2". */
  value: string;
  /** Gỡ đúng một điều kiện này, giữ nguyên các điều kiện còn lại. */
  onClear: () => void;
};

/**
 * `YYYY-MM-DD` -> `DD/MM`.
 *
 * Cắt chuỗi chứ KHÔNG dựng `new Date(...)`: mốc ngày ở đây là ngày lịch địa
 * phương, đưa qua Date rồi format lại là dính lệch múi giờ.
 */
function formatIsoDay(iso: string): string {
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}`;
}

function formatDateRange(value: DateFilterValue): string {
  const from = value.from ? formatIsoDay(value.from) : "";
  const to = value.to ? formatIsoDay(value.to) : "";
  if (from && to) return `${from} – ${to}`;
  return from || to;
}

/** "Facebook +2" — nhãn đầu tiên kèm số lượng còn lại. */
function summarizeLabels(labels: string[]): string {
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  return `${labels[0]} +${labels.length - 1}`;
}

function summarizeOptions(selected: FilterSelectOption[]): string {
  return summarizeLabels(selected.map((option) => option.label));
}

function summarizeValues(values: string[], options: FilterSelectOption[]): string {
  const byValue = new Map(options.map((option) => [option.value, option.label]));
  return summarizeLabels(values.map((value) => byValue.get(value) ?? value));
}

/**
 * Dựng danh sách chip từ bộ lọc đang áp.
 *
 * Cùng tập điều kiện với `activeFilterCount` ở OrdersPage — thêm ô lọc mới mà quên
 * một trong hai chỗ thì số trên nút và số chip lệch nhau.
 */
export function buildOrdersFilterChips(props: OrdersFilterProps, t: Translate): OrdersFilterChip[] {
  const chips: OrdersFilterChip[] = [];

  const pushTriState = (
    key: string,
    label: string,
    value: string,
    onChange: (next: string) => void,
  ) => {
    if (!value) return;
    chips.push({
      key,
      label,
      value:
        value === "yes" ? t("orders.filters.triYes", "Có") : t("orders.filters.triNo", "Không"),
      onClear: () => onChange(""),
    });
  };

  // Ngày tạo mặc định là "tháng này" nên chỉ thành chip khi người dùng đổi đi.
  if (props.dateFilter && props.dateFilter.option !== "this_month") {
    chips.push({
      key: "dateFilter",
      label: t("orders.filters.createdAt", "Ngày tạo"),
      value: formatDateRange(props.dateFilter),
      onClear: () => {
        const range = getDateRange("this_month");
        props.onDateFilterChange({ option: "this_month", from: range.from, to: range.to });
      },
    });
  }

  if (props.returnDateFilter && (props.returnDateFilter.from || props.returnDateFilter.to)) {
    chips.push({
      key: "returnDateFilter",
      label: t("orders.filters.returnDate", "Ngày hoàn hàng"),
      value: formatDateRange(props.returnDateFilter),
      onClear: () => props.onReturnDateFilterChange({ option: "custom", from: "", to: "" }),
    });
  }

  if (
    props.kiotvietPurchaseDateFilter &&
    (props.kiotvietPurchaseDateFilter.from || props.kiotvietPurchaseDateFilter.to)
  ) {
    chips.push({
      key: "kiotvietPurchaseDateFilter",
      label: t("orders.filters.kiotvietPurchaseDate", "Ngày tạo KiotViet"),
      value: formatDateRange(props.kiotvietPurchaseDateFilter),
      onClear: () =>
        props.onKiotvietPurchaseDateFilterChange({ option: "custom", from: "", to: "" }),
    });
  }

  if (props.selectedKiotvietChannelOptions.length > 0) {
    chips.push({
      key: "kiotvietChannel",
      label: t("orders.filters.kiotvietChannel", "Kênh KiotViet"),
      value: summarizeOptions(props.selectedKiotvietChannelOptions),
      onClear: () => props.onKiotvietChannelChange([]),
    });
  }

  if (props.selectedBranchIdOptions.length > 0) {
    chips.push({
      key: "branchId",
      label: t("orders.filters.branchId", "Chi nhánh"),
      value: summarizeOptions(props.selectedBranchIdOptions),
      onClear: () => props.onBranchIdChange([]),
    });
  }

  if (props.selectedFulfillmentWarehouseOptions.length > 0) {
    chips.push({
      key: "fulfillmentWarehouse",
      label: t("orders.filters.fulfillmentWarehouse", "Kho xuất"),
      value: summarizeOptions(props.selectedFulfillmentWarehouseOptions),
      onClear: () => props.onFulfillmentWarehouseChange([]),
    });
  }

  if (!props.hideChannelFilter && props.selectedChannelOptions.length > 0) {
    chips.push({
      key: "channel",
      label: t("orders.filters.channel", "Kênh bán hàng"),
      value: summarizeOptions(props.selectedChannelOptions),
      onClear: () => props.onChannelChange([]),
    });
  }

  if (props.channelType.length > 0) {
    chips.push({
      key: "channelType",
      label: t("orders.filters.channelType", "Loại kênh"),
      value: summarizeValues(props.channelType, props.channelTypeOptions),
      onClear: () => props.onChannelTypeChange([]),
    });
  }

  if (props.selectedStaffOptions.length > 0) {
    chips.push({
      key: "staff",
      label: t("orders.filters.staff", "Nhân viên"),
      value: summarizeOptions(props.selectedStaffOptions),
      onClear: () => props.onStaffChange([]),
    });
  }

  if (props.selectedSalesStatusOptions.length > 0) {
    chips.push({
      key: "salesStatus",
      label: t("orders.filters.salesStatus", "Trạng thái sale"),
      value: summarizeOptions(props.selectedSalesStatusOptions),
      onClear: () => props.onSalesStatusChange([]),
    });
  }

  if (props.status.length > 0) {
    chips.push({
      key: "status",
      label: t("orders.filters.status", "Trạng thái vận chuyển"),
      value: summarizeValues(props.status, props.statusOptions),
      onClear: () => props.onStatusChange([]),
    });
  }

  if (props.selectedDeliveryBusinessStatusOptions.length > 0) {
    chips.push({
      key: "deliveryBusinessStatus",
      label: t("orders.filters.deliveryBusinessStatus", "Trạng thái vận chuyển thực"),
      value: summarizeOptions(props.selectedDeliveryBusinessStatusOptions),
      onClear: () => props.onDeliveryBusinessStatusChange([]),
    });
  }

  if (props.invoiceStatus.length > 0) {
    chips.push({
      key: "invoiceStatus",
      label: t("orders.filters.invoiceStatus", "Trạng thái hóa đơn"),
      value: summarizeValues(props.invoiceStatus, props.invoiceStatusOptions),
      onClear: () => props.onInvoiceStatusChange([]),
    });
  }

  if (props.vat.length > 0) {
    chips.push({
      key: "vat",
      label: t("orders.filters.vat", "Xuất VAT"),
      value: summarizeValues(props.vat, props.vatOptions),
      onClear: () => props.onVatChange([]),
    });
  }

  if (props.orderType.length > 0) {
    chips.push({
      key: "orderType",
      label: t("orders.filters.orderType", "Loại đơn hàng"),
      value: summarizeValues(props.orderType, props.orderTypeOptions),
      onClear: () => props.onOrderTypeChange([]),
    });
  }

  if (props.shippingType.length > 0) {
    chips.push({
      key: "shippingType",
      label: t("orders.filters.shippingType", "Loại xuất hàng"),
      value: summarizeValues(props.shippingType, props.shippingTypeOptions),
      onClear: () => props.onShippingTypeChange([]),
    });
  }

  if (props.isKoc && props.kocOrderType.length > 0) {
    chips.push({
      key: "kocOrderType",
      label: t("orders.filters.kocOrderType", "Loại đơn KOC"),
      value: summarizeValues(props.kocOrderType, props.kocOrderTypeOptions),
      onClear: () => props.onKocOrderTypeChange([]),
    });
  }

  pushTriState(
    "hasShippingCode",
    t("orders.filters.hasShippingCode", "Mã vận đơn"),
    props.hasShippingCode,
    props.onHasShippingCodeChange,
  );
  pushTriState(
    "isDeliveryInvoicePrinted",
    t("orders.filters.isDeliveryInvoicePrinted", "Phiếu giao hàng"),
    props.isDeliveryInvoicePrinted,
    props.onIsDeliveryInvoicePrintedChange,
  );
  pushTriState(
    "customerReturn",
    t("orders.filters.customerReturn", "Khách trả hàng"),
    props.customerReturn,
    props.onCustomerReturnChange,
  );
  pushTriState(
    "hasReturnSlip",
    t("orders.filters.hasReturnSlip", "Phiếu trả hàng"),
    props.hasReturnSlip,
    props.onHasReturnSlipChange,
  );
  pushTriState(
    "hasRecallCode",
    t("orders.filters.hasRecallCode", "Mã đơn thu hồi"),
    props.hasRecallCode,
    props.onHasRecallCodeChange,
  );
  pushTriState(
    "hasCallRecording",
    t("orders.filters.hasCallRecording", "Ghi âm cuộc gọi"),
    props.hasCallRecording,
    props.onHasCallRecordingChange,
  );
  pushTriState(
    "hasInternalNote",
    t("orders.filters.hasInternalNote", "Ghi chú nội bộ"),
    props.hasInternalNote,
    props.onHasInternalNoteChange,
  );
  pushTriState(
    "hasAddress",
    t("orders.filters.hasAddress", "Địa chỉ khi đổ đơn"),
    props.hasAddress,
    props.onHasAddressChange,
  );

  if (props.selectedProductOptions.length > 0) {
    chips.push({
      key: "product",
      label: t("orders.filters.product", "Sản phẩm"),
      value: summarizeOptions(props.selectedProductOptions),
      onClear: () => props.onProductChange([]),
    });
  }

  return chips;
}
