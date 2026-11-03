/**
 * localStorage persistence for the orders table: visible/locked columns and
 * per-scope saved filters. Extracted from use-orders-data.ts so the storage
 * logic is isolated and unit-testable.
 */

import { type DateFilterValue, getDateRange } from "@/components/ui/date-filter";
import {
  EXPORT_ONLY_COLUMN_KEYS,
  ORDER_COLUMN_OPTIONS,
  type OrderColumnKey,
} from "@/features/orders/order-types";
import { swallowError } from "@/lib/errors";

export const ORDER_COLUMNS_STORAGE_KEY = "desi_order_visible_columns";
export const ORDER_LOCKED_COLUMNS_STORAGE_KEY = "desi_order_locked_columns";
export const LANDING_COLUMNS_STORAGE_KEY = "desi_landing_visible_columns";
export const LANDING_LOCKED_COLUMNS_STORAGE_KEY = "desi_landing_locked_columns";
export const ORDER_FILTERS_STORAGE_KEY = "desi_order_filters";

const ALL_ORDER_COLUMN_KEYS = new Set<OrderColumnKey>(ORDER_COLUMN_OPTIONS.map((item) => item.key));

// Cột bắt buộc inject một lần cho user cũ (đã lưu danh sách cột trong localStorage
// trước khi cột này tồn tại). Sau khi inject, tôn trọng lựa chọn ẩn/hiện của user.
const FORCED_COLUMN_MIGRATIONS: Array<{ flag: string; column: OrderColumnKey }> = [
  { flag: "desi_order_kvstate_injected", column: "kiotviet_state" },
  { flag: "desi_order_vat_injected", column: "vat" },
  { flag: "desi_order_return_date_injected", column: "return_date" },
  { flag: "desi_order_customer_type_injected", column: "customer_type" },
];

/**
 * Ba cột thu hồi rời đã gộp thành một cột `recall_entries` trên lưới. User cũ
 * còn giữ 3 key rời trong localStorage — đổi tại chỗ (giữ đúng vị trí cột đầu
 * tiên trong danh sách) thay vì lọc bỏ, kẻo trang KOC mất sạch cột thu hồi.
 */
function mergeLegacyRecallColumns(columns: OrderColumnKey[]): OrderColumnKey[] {
  const next: OrderColumnKey[] = [];
  for (const key of columns) {
    const mapped = EXPORT_ONLY_COLUMN_KEYS.includes(key) ? "recall_entries" : key;
    if (!next.includes(mapped)) next.push(mapped);
  }
  return next;
}

function applyColumnMigrations(columns: OrderColumnKey[], storageKey: string): OrderColumnKey[] {
  let next = columns;
  for (const { flag, column } of FORCED_COLUMN_MIGRATIONS) {
    const flagKey = `${flag}:${storageKey}`;
    try {
      if (localStorage.getItem(flagKey)) continue; // đã migrate, không ép lại
      localStorage.setItem(flagKey, "1");
      if (!next.includes(column)) {
        next = [column, ...next];
        localStorage.setItem(storageKey, JSON.stringify(next));
      }
    } catch (err) {
      // localStorage không khả dụng — bỏ qua migration, không chặn render.
      swallowError(err, "orders.columns.storage.migrate");
    }
  }
  return next;
}

export const DEFAULT_ORDER_COLUMNS: OrderColumnKey[] = [
  "kiotviet_state",
  "channel_code",
  "name",
  "phone",
  "customer_type",
  "kiotviet_location",
  "kiotviet_ward",
  "sku",
  "total_amount",
  "total_after_discount",
  "status",
  "created_at",
  "return_date",
  "vat",
];

export function getStoredOrderColumns(landing = false): OrderColumnKey[] {
  try {
    const key = landing ? LANDING_COLUMNS_STORAGE_KEY : ORDER_COLUMNS_STORAGE_KEY;
    const raw = localStorage.getItem(key);
    if (!raw) return DEFAULT_ORDER_COLUMNS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_ORDER_COLUMNS;
    const valid = parsed.filter((key): key is OrderColumnKey => ALL_ORDER_COLUMN_KEYS.has(key));
    if (valid.length === 0) return DEFAULT_ORDER_COLUMNS;
    // Trả về đúng thứ cột user đã chọn, chỉ inject các cột migration bắt buộc 1 lần.
    return applyColumnMigrations(mergeLegacyRecallColumns(valid), key);
  } catch {
    return DEFAULT_ORDER_COLUMNS;
  }
}

export function getStoredLockedOrderColumns(landing = false): OrderColumnKey[] {
  try {
    const key = landing ? LANDING_LOCKED_COLUMNS_STORAGE_KEY : ORDER_LOCKED_COLUMNS_STORAGE_KEY;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return mergeLegacyRecallColumns(
      parsed.filter((key): key is OrderColumnKey => ALL_ORDER_COLUMN_KEYS.has(key)),
    );
  } catch {
    return [];
  }
}

export type StoredOrderFilters = {
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
  /** Kho xuất (id Warehouse dạng chuỗi; "none" = chưa gán kho). */
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
};

/**
 * Bộ lọc mặc định (chưa lưu gì / vừa xoá lọc): tháng này, mọi trục còn lại tắt.
 * Một nguồn duy nhất — trước đây object này được chép 3 lần trong file này và
 * thêm một lần nữa trong `clearFilters`, nên mỗi filter mới lại thiếu ở một bản.
 */
export function createDefaultStoredFilters(): StoredOrderFilters {
  const defaultRange = getDateRange("this_month");
  return {
    dateFilter: { option: "this_month" as const, from: defaultRange.from, to: defaultRange.to },
    returnDateFilter: { option: "custom" as const, from: "", to: "" },
    kiotvietPurchaseDateFilter: { option: "custom" as const, from: "", to: "" },
    status: [],
    channel: [],
    product: [],
    staff: [],
    deliveryBusinessStatus: [],
    salesStatus: [],
    kiotvietChannel: [],
    branchId: [],
    fulfillmentWarehouse: [],
    invoiceStatus: [],
    vat: [],
    orderType: [],
    shippingType: [],
    channelType: [],
    kocOrderType: [],
    hasShippingCode: "",
    hasInvoiceCode: "",
    isDeliveryInvoicePrinted: "",
    customerReturn: "",
    hasInternalNote: "",
    hasAddress: "",
    hasReturnSlip: "",
    hasRecallCode: "",
    hasCallRecording: "",
  };
}

export type FilterScope =
  | "orders"
  | "orders-delivered"
  | "orders-cancelled"
  | "landing-sale"
  | "landing-summary"
  | "landing-sheet1"
  | "landing-sheet2"
  | "landing-sheet3"
  | "landing-delivered"
  | "landing-cancelled"
  | "koc"
  | "koc-delivered"
  | "koc-cancelled";

export const DEFAULT_FILTER_SCOPE: FilterScope = "orders";

export function getFilterStorageKey(scope: FilterScope): string {
  return `${ORDER_FILTERS_STORAGE_KEY}:${scope}`;
}

export function normalizeStoredFilterArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(value.map((item) => String(item).trim()).filter((item) => !!item && item !== "all")),
    );
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "all") return [];
    return [trimmed];
  }
  return [];
}

/**
 * Danh mục trục lọc theo kiểu dữ liệu, dùng cho vòng lặp đọc localStorage bên dưới.
 *
 * `satisfies Record<...>` là chốt chặn biên dịch: thêm một filter mới vào
 * StoredOrderFilters mà quên khai ở đây thì tsc báo lỗi ngay. Trước đây phần parse
 * liệt kê tay từng trường nên filter mới có thể được GHI vào localStorage nhưng
 * không được ĐỌC lại — im lặng mất bộ lọc sau mỗi lần F5.
 */
type StoredFilterKeyOf<T> = {
  [K in keyof StoredOrderFilters]: StoredOrderFilters[K] extends T ? K : never;
}[keyof StoredOrderFilters];

type ArrayFilterKey = StoredFilterKeyOf<string[]>;
type StringFilterKey = StoredFilterKeyOf<string>;

const ARRAY_FILTER_KEYS = Object.keys({
  status: true,
  channel: true,
  product: true,
  staff: true,
  deliveryBusinessStatus: true,
  salesStatus: true,
  kiotvietChannel: true,
  branchId: true,
  fulfillmentWarehouse: true,
  invoiceStatus: true,
  vat: true,
  orderType: true,
  shippingType: true,
  channelType: true,
  kocOrderType: true,
} satisfies Record<ArrayFilterKey, true>) as ArrayFilterKey[];

const STRING_FILTER_KEYS = Object.keys({
  hasShippingCode: true,
  hasInvoiceCode: true,
  isDeliveryInvoicePrinted: true,
  customerReturn: true,
  hasInternalNote: true,
  hasAddress: true,
  hasReturnSlip: true,
  hasRecallCode: true,
  hasCallRecording: true,
} satisfies Record<StringFilterKey, true>) as StringFilterKey[];

export function getStoredOrderFilters(
  scope: FilterScope = DEFAULT_FILTER_SCOPE,
): StoredOrderFilters {
  try {
    // Mỗi scope có key độc lập — KHÔNG fallback sang key cũ (gây share filter
    // giữa các scope vì cả hai cùng đọc từ "desi_order_filters" khi mới mở).
    const scopedKey = getFilterStorageKey(scope);
    const raw = localStorage.getItem(scopedKey);
    if (!raw) {
      return createDefaultStoredFilters();
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result = createDefaultStoredFilters();
    for (const key of ARRAY_FILTER_KEYS) {
      result[key] = normalizeStoredFilterArray(parsed?.[key]);
    }
    for (const key of STRING_FILTER_KEYS) {
      result[key] = String(parsed?.[key] ?? "").trim();
    }
    const dateFilter = parsed?.dateFilter as DateFilterValue | undefined;
    if (dateFilter && dateFilter.option !== "custom") {
      // Preset (Tháng này, 7 ngày qua…) phải tính lại khoảng ngày theo HÔM NAY,
      // không dùng from/to đã lưu — mở lại sang tháng sau mà vẫn trỏ tháng cũ thì
      // panel hiện "Tháng này" nhưng list ra đơn tháng trước.
      const range = getDateRange(dateFilter.option);
      result.dateFilter = { option: dateFilter.option, from: range.from, to: range.to };
    } else {
      // Payload cũ không có dateFilter → giữ nguyên hành vi trước đây: KHÔNG áp
      // biên ngày (from/to rỗng), khác với mặc định "tháng này" của scope chưa lưu.
      result.dateFilter = dateFilter ?? { option: "this_month" as const, from: "", to: "" };
    }
    result.returnDateFilter =
      (parsed?.returnDateFilter as DateFilterValue | undefined) ?? result.returnDateFilter;
    result.kiotvietPurchaseDateFilter =
      (parsed?.kiotvietPurchaseDateFilter as DateFilterValue | undefined) ??
      result.kiotvietPurchaseDateFilter;
    return result;
  } catch {
    return createDefaultStoredFilters();
  }
}
