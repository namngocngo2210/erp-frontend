import type { DateFilterValue } from "@/components/ui/date-filter";
import type { ChannelRow, StaffUser } from "@/features/channels/components/ChannelManagement";
import type { LandingTabKey } from "@/features/orders/landing-tabs";
import type { OrderColumnKey, OrderRow, ProductRow } from "@/features/orders/order-types";
import type {
  AddressCatalog,
  CreateOrderPayload,
  KshipOptionsPayload,
  KiotVietJobLogRow,
  KiotVietOption,
  KiotVietOrderAction,
  KiotVietOrderPrecheckResult,
  OrdersSortValue,
} from "@/features/orders/use-orders-data";

/**
 * Props của trang đơn hàng gom theo 5 nhóm có tên (audit 2026-09-23 P1-4 —
 * trước đây 220 dòng props phẳng). Route (`useOrdersPageProps` ở app/routed-pages)
 * lắp từng nhóm từ AppShell; OrdersPage destructure lại từng nhóm nên thân
 * component không đổi.
 */

/** Danh mục nuôi ô lọc + form đơn. */
export type OrdersCatalogs = {
  channels: ChannelRow[];
  /** Full danh sách kênh cho filter dropdown (dùng để fallback khi staff không có assigned channels). */
  allChannels?: Array<{ id: number; code: string; name: string }>;
  staffUsers: StaffUser[];
  userAssignedChannels?: Array<{
    id: number;
    code: string;
    name: string;
    is_active: boolean;
  }>;
  kiotvietOptions: KiotVietOption[];
  products: ProductRow[];
  /** Code bảng giá THẬT SỰ của `products` hiện tại ("" = mặc định) — xem
   * use-orders-catalogs.ts. Truyền nguyên cho OrderFormDialog để form đơn biết
   * `products` có phải dữ liệu của bảng giá đang cần hay còn là bảng giá cũ. */
  productsPriceBook: string;
  addressCatalog: AddressCatalog;
};

/** Giá trị bộ lọc / sắp xếp / cột hiện hành. */
export type OrdersFilterValues = {
  q: string;
  dateFilter: DateFilterValue;
  returnDateFilter: DateFilterValue;
  kiotvietPurchaseDateFilter: DateFilterValue;
  status: string[];
  channel: string[];
  product: string[];
  staff: string[];
  deliveryBusinessStatus: string[];
  salesStatus: string[];
  kiotvietChannel: string[];
  branchId: string[];
  fulfillmentWarehouse: string[];
  invoiceStatus: string[];
  vat: string[];
  orderType: string[];
  shippingType: string[];
  channelType: string[];
  kocOrderType: string[];
  hasShippingCode: string;
  hasInvoiceCode: string;
  isDeliveryInvoicePrinted: string;
  customerReturn: string;
  hasInternalNote: string;
  hasAddress: string;
  hasReturnSlip: string;
  hasRecallCode: string;
  hasCallRecording: string;
  sort: OrdersSortValue;
  visibleOrderColumns: OrderColumnKey[];
  lockedOrderColumns: OrderColumnKey[];
};

/** Handler đổi bộ lọc / cột / áp dụng / xoá lọc. */
export type OrdersFilterHandlers = {
  onQChange: (value: string) => void;
  onDateFilterChange: (value: DateFilterValue) => void;
  onReturnDateFilterChange: (value: DateFilterValue) => void;
  onKiotvietPurchaseDateFilterChange: (value: DateFilterValue) => void;
  onStatusChange: (value: string[]) => void;
  onChannelChange: (value: string[]) => void;
  onProductChange: (value: string[]) => void;
  onStaffChange: (value: string[]) => void;
  onDeliveryBusinessStatusChange: (value: string[]) => void;
  onSalesStatusChange: (value: string[]) => void;
  onKiotvietChannelChange: (value: string[]) => void;
  onBranchIdChange: (value: string[]) => void;
  onFulfillmentWarehouseChange: (value: string[]) => void;
  onInvoiceStatusChange: (value: string[]) => void;
  onVatChange: (value: string[]) => void;
  onOrderTypeChange: (value: string[]) => void;
  onShippingTypeChange: (value: string[]) => void;
  onChannelTypeChange: (value: string[]) => void;
  onKocOrderTypeChange: (value: string[]) => void;
  onHasShippingCodeChange: (value: string) => void;
  onHasInvoiceCodeChange: (value: string) => void;
  onIsDeliveryInvoicePrintedChange: (value: string) => void;
  onCustomerReturnChange: (value: string) => void;
  onHasInternalNoteChange: (value: string) => void;
  onHasAddressChange: (value: string) => void;
  onHasReturnSlipChange: (value: string) => void;
  onHasRecallCodeChange: (value: string) => void;
  onHasCallRecordingChange: (value: string) => void;
  onSortChange: (value: OrdersSortValue) => void;
  onToggleOrderColumn: (key: OrderColumnKey) => void;
  onToggleLockOrderColumn: (key: OrderColumnKey) => void;
  onSetOrderColumns: (next: OrderColumnKey[]) => void;
  onResetOrderColumns: () => void;
  onApplyFilters: (
    overrides?: Partial<{
      q: string;
      dateFilter: DateFilterValue;
      returnDateFilter: DateFilterValue;
      kiotvietPurchaseDateFilter: DateFilterValue;
      status: string[];
      channel: string[];
      product: string[];
      staff: string[];
      deliveryBusinessStatus: string[];
      salesStatus: string[];
      kiotvietChannel: string[];
      branchId: string[];
      fulfillmentWarehouse: string[];
      invoiceStatus: string[];
      vat: string[];
      orderType: string[];
      shippingType: string[];
      channelType: string[];
      kocOrderType: string[];
      hasShippingCode: string;
      hasInvoiceCode: string;
      isDeliveryInvoicePrinted: string;
      customerReturn: string;
      hasInternalNote: string;
      hasAddress: string;
      hasReturnSlip: string;
      hasRecallCode: string;
      hasCallRecording: string;
      sort: OrdersSortValue;
    }>,
  ) => Promise<void>;
  onClearFilters: () => Promise<void>;
};

/** Phân trang + các bộ đếm theo trạng thái. */
export type OrdersPaginationProps = {
  ordersPage: number;
  ordersPageSize: number;
  ordersHasNextPage: boolean;
  ordersTotalCount: number;
  salesStatusCounts?: Record<string, number>;
  /** Số đơn theo Order.status cho thanh chip lọc trạng thái (key "6" = đã hủy). */
  statusCounts?: Record<string, number>;
  sheetStats?: Record<string, number>;
  onOrdersPageChange: (nextPage: number) => Promise<void>;
  onOrdersPageSizeChange: (nextPageSize: number) => Promise<void>;
};

/** Thao tác trên đơn (ghi, KiotViet, KShip, tra cứu…) và điều hướng. */
export type OrdersActions = {
  onLogContact?: (
    orderId: number,
    payload: {
      outcome?: string;
      transcript?: string;
      sales_status?: string;
      not_closed_reason?: string;
    },
  ) => Promise<void>;
  onCloseCase?: (orderId: number, reason?: string) => Promise<void>;
  onPatchOrder: (id: number, payload: Partial<OrderRow>, silent?: boolean) => Promise<void>;
  onCreateOrder: (payload: CreateOrderPayload) => Promise<void>;
  /** Nạp lại catalog sản phẩm theo bảng giá — form đơn gọi khi kênh đang chọn đổi bảng giá. */
  onEnsureProductsLoaded?: (options?: { force?: boolean; priceBook?: string }) => Promise<void>;
  onSearchProducts?: (
    query: string,
    options?: { limit?: number; signal?: AbortSignal; priceBook?: string },
  ) => Promise<ProductRow[]>;
  onDuplicateOrder: (id: number) => Promise<void>;
  onFetchOrderHistoryByPhone: (
    phone: string,
    options?: { signal?: AbortSignal },
  ) => Promise<OrderRow[]>;
  onLookupCustomerByPhone: (
    phone: string,
    options?: { signal?: AbortSignal },
  ) => Promise<{
    id: number;
    code?: string;
    full_name?: string;
    phone_raw: string;
    phone_normalized: string;
    gender?: number | null;
  } | null>;
  onBulkDeleteOrders: (ids: number[]) => Promise<void>;
  onKiotVietPrecheck: (
    action: KiotVietOrderAction,
    ids: number[],
  ) => Promise<KiotVietOrderPrecheckResult>;
  onKiotVietAction: (action: KiotVietOrderAction, ids: number[]) => Promise<void>;
  onLoadDistrictsForProvince: (
    provinceCode: string,
    options?: { force?: boolean },
  ) => Promise<void>;
  onLoadWardsForDistrict: (
    provinceCode: string,
    districtCode: string,
    options?: { force?: boolean },
  ) => Promise<void>;
  onFetchKiotVietLogs: () => Promise<KiotVietJobLogRow[]>;
  onFetchKshipOptions: (ids: number[]) => Promise<KshipOptionsPayload>;
  onCreateKshipDelivery: (
    ids: number[],
    providerCode: string,
    serviceCode: string,
    notes?: Record<number, string>,
    senderAddressId?: number | null,
  ) => Promise<{ created_count: number; detail: string }>;
  onRefreshOrdersAfterImport: () => Promise<void>;
  /** Điều hướng sang trang chi tiết đơn hàng */
  onNavigateToDetail: (orderId: number) => void;
  /** Callback chuyển đơn landing sang đơn hàng */
  onTransferLandingOrders?: (ids: number[]) => Promise<unknown>;
  /** Callback hủy đơn trên KiotViet */
  onCancelKiotvietOrders?: (
    ids: number[],
  ) => Promise<{ queued_count: number; skipped_count: number; dispatch_failed_count: number }>;
  /** Callback khôi phục đơn đã hủy (chỉ truyền khi landingTab === "cancelled"). */
  onRestoreCancelledOrders?: (
    ids: number[],
  ) => Promise<{ queued_count: number; skipped_count: number }>;
};

/** Tham số `onApplyFilters` — phần bộ lọc được ghi đè khi áp dụng. */
export type OrdersFilterOverrides = Parameters<OrdersFilterHandlers["onApplyFilters"]>[0];

export type { LandingTabKey };
