import { type DateFilterValue } from "@/components/ui/date-filter";
import { type FilterSelectOption } from "@/features/orders/filter-types";

/**
 * Giá trị của một ô lọc dạng cờ ba trạng thái: "" = tất cả, "yes" = có, "no" = không.
 * Giữ nguyên chuỗi gửi lên server như bản `<select>` cũ.
 */
export type TriStateValue = string;

/**
 * Bộ props dùng chung cho THANH lọc ngang và NGĂN KÉO lọc.
 *
 * Cố tình giữ nguyên chữ ký của panel dọc cũ: mọi handler vẫn là handler của
 * `use-orders-filter-handlers` (tự gọi `onApplyFilters`), nên đổi layout không
 * đụng gì tới state, localStorage hay tham số gửi lên server.
 */
export type OrdersFilterProps = {
  dateFilter: DateFilterValue;
  onDateFilterChange: (value: DateFilterValue) => void;

  returnDateFilter: DateFilterValue;
  onReturnDateFilterChange: (value: DateFilterValue) => void;
  kiotvietPurchaseDateFilter: DateFilterValue;
  onKiotvietPurchaseDateFilterChange: (value: DateFilterValue) => void;

  kiotvietChannelOptions: FilterSelectOption[];
  selectedKiotvietChannelOptions: FilterSelectOption[];
  onKiotvietChannelChange: (selected: readonly FilterSelectOption[]) => void;

  branchIdOptions: FilterSelectOption[];
  selectedBranchIdOptions: FilterSelectOption[];
  onBranchIdChange: (selected: readonly FilterSelectOption[]) => void;

  fulfillmentWarehouseOptions: FilterSelectOption[];
  selectedFulfillmentWarehouseOptions: FilterSelectOption[];
  onFulfillmentWarehouseChange: (selected: readonly FilterSelectOption[]) => void;

  hideChannelFilter: boolean;
  channelOptions: FilterSelectOption[];
  selectedChannelOptions: FilterSelectOption[];
  onChannelChange: (selected: readonly FilterSelectOption[]) => void;

  staffOptions: FilterSelectOption[];
  selectedStaffOptions: FilterSelectOption[];
  onStaffChange: (selected: readonly FilterSelectOption[]) => void;

  salesStatusOptions: FilterSelectOption[];
  selectedSalesStatusOptions: FilterSelectOption[];
  onSalesStatusChange: (selected: readonly FilterSelectOption[]) => void;

  invoiceStatusOptions: FilterSelectOption[];
  invoiceStatus: string[];
  onInvoiceStatusChange: (values: string[]) => void;

  vatOptions: FilterSelectOption[];
  vat: string[];
  onVatChange: (values: string[]) => void;

  orderTypeOptions: FilterSelectOption[];
  orderType: string[];
  onOrderTypeChange: (values: string[]) => void;

  shippingTypeOptions: FilterSelectOption[];
  channelTypeOptions: FilterSelectOption[];
  shippingType: string[];
  channelType: string[];
  onShippingTypeChange: (values: string[]) => void;
  onChannelTypeChange: (values: string[]) => void;

  /** Chỉ trang KOC mới hiện ô lọc "Loại đơn KOC" — Sheet 3 hard-exclude order_source=koc
   * nên trục lọc này là no-op về dữ liệu ở các trang khác. */
  isKoc: boolean;
  kocOrderTypeOptions: FilterSelectOption[];
  kocOrderType: string[];
  onKocOrderTypeChange: (values: string[]) => void;

  statusOptions: FilterSelectOption[];
  status: string[];
  onStatusChange: (values: string[]) => void;

  deliveryBusinessStatusOptions: FilterSelectOption[];
  selectedDeliveryBusinessStatusOptions: FilterSelectOption[];
  onDeliveryBusinessStatusChange: (selected: readonly FilterSelectOption[]) => void;

  hasShippingCode: TriStateValue;
  onHasShippingCodeChange: (value: string) => void;

  isDeliveryInvoicePrinted: TriStateValue;
  onIsDeliveryInvoicePrintedChange: (value: string) => void;

  customerReturn: TriStateValue;
  onCustomerReturnChange: (value: string) => void;

  hasReturnSlip: TriStateValue;
  onHasReturnSlipChange: (value: string) => void;

  hasRecallCode: TriStateValue;
  onHasRecallCodeChange: (value: string) => void;

  hasCallRecording: TriStateValue;
  onHasCallRecordingChange: (value: string) => void;

  hasInternalNote: TriStateValue;
  onHasInternalNoteChange: (value: string) => void;

  hasAddress: TriStateValue;
  onHasAddressChange: (value: string) => void;

  productOptions: FilterSelectOption[];
  selectedProductOptions: FilterSelectOption[];
  onProductChange: (selected: readonly FilterSelectOption[]) => void;

  onClearFilters: () => void;
};
