import { type DateFilterValue } from "@/components/ui/date-filter";

export type { FetchJson } from "@/services/http";

/**
 * Thứ tự sắp xếp danh sách đơn. "newest"/"oldest" theo ngày TẠO đơn;
 * "closed_*" theo ngày CHỐT (`sales_closed_at`) — đơn chưa chốt luôn xuống cuối
 * ở cả hai chiều; "amount_*" theo "Tổng sau giảm giá". Giá trị phải khớp
 * `ORDERS_SORT_VALUES` phía backend (`_view_helpers.py`); gửi giá trị lạ sẽ bị
 * backend lặng lẽ đưa về mặc định.
 */
export type OrdersSortValue =
  | "newest"
  | "oldest"
  | "closed_newest"
  | "closed_oldest"
  | "amount_desc"
  | "amount_asc";

export type LoadOrdersOverrides = {
  q?: string;
  dateFilter?: DateFilterValue;
  returnDateFilter?: DateFilterValue;
  kiotvietPurchaseDateFilter?: DateFilterValue;
  status?: string[];
  channel?: string[];
  product?: string[];
  staff?: string[];
  deliveryBusinessStatus?: string[];
  salesStatus?: string[];
  kiotvietChannel?: string[];
  kiotvietChannelNull?: string;
  showOrders?: string;
  branchId?: string[];
  fulfillmentWarehouse?: string[];
  invoiceStatus?: string[];
  vat?: string[];
  orderType?: string[];
  shippingType?: string[];
  channelType?: string[];
  kocOrderType?: string[];
  hasShippingCode?: string;
  hasInvoiceCode?: string;
  isDeliveryInvoicePrinted?: string;
  customerReturn?: string;
  hasInternalNote?: string;
  hasAddress?: string;
  hasReturnSlip?: string;
  hasRecallCode?: string;
  hasCallRecording?: string;
  sort?: OrdersSortValue;
  limit?: number;
  offset?: number;
};

export const ORDERS_FETCH_LIMIT = 100;

/** Kẹp page size vào [1, ORDERS_FETCH_LIMIT]; giá trị hỏng → về mặc định. */
export function clampOrdersPageSize(value: number): number {
  return Number.isFinite(value) && value > 0
    ? Math.max(1, Math.min(ORDERS_FETCH_LIMIT, Math.trunc(value)))
    : ORDERS_FETCH_LIMIT;
}

/**
 * Trang Đơn hàng chạy ở nhiều "chế độ" dùng chung cùng bộ máy danh sách nhưng
 * khác endpoint. Cờ chế độ do `useOrdersData` sở hữu (ref, đổi qua setLandingMode
 * / setKocMode) nên hook này chỉ nhận hàm đọc.
 */
export type OrdersModeAccess = {
  isLanding: () => boolean;
  isKoc: () => boolean;
};

/**
 * Chữ ký của `loadOrders` khi được gọi qua latest-ref từ
 * `scheduleStatusCountsRefresh` (chỉ dùng chế độ counts-only, không overrides).
 */
export type LoadOrdersFn = (
  overrides?: undefined,
  options?: { statusCountsOnly?: boolean },
) => Promise<unknown>;
