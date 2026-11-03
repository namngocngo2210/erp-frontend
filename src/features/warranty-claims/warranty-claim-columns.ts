import type {
  WarrantyClaim,
  WarrantyClaimStatus,
} from "@/features/warranty-claims/warranty-claim-types";
import { formatCurrency, formatDateTimeVi, formatDateVi } from "@/lib/format";

export type WarrantyColumnKind = "readonly" | "status" | "date";

export type WarrantyColumnKey =
  | "customer"
  | "phone"
  | "address"
  | "product"
  | "sku"
  | "amount"
  | "shipping_code"
  | "invoice_code"
  | "status"
  | "journeys_count"
  | "customer_report_date"
  | "activation_date"
  | "expiry_date"
  | "warranty_days_left"
  | "created_by_name"
  | "created_at";

/** Nhóm cột dùng cho hộp thoại tuỳ chỉnh cột (không ảnh hưởng thứ tự bảng). */
export type WarrantyColumnGroupKey = "order" | "claim" | "warranty";

export const WARRANTY_COLUMN_GROUPS: Array<{ key: WarrantyColumnGroupKey; label: string }> = [
  { key: "order", label: "Đơn gốc & khách hàng" },
  { key: "claim", label: "Phiếu bảo hành" },
  { key: "warranty", label: "Hạn bảo hành" },
];

export const WARRANTY_COLUMN_OPTIONS: {
  key: WarrantyColumnKey;
  label: string;
  kind: WarrantyColumnKind;
  group: WarrantyColumnGroupKey;
}[] = [
  { key: "customer", label: "Khách hàng", kind: "readonly", group: "order" },
  { key: "phone", label: "SĐT", kind: "readonly", group: "order" },
  { key: "address", label: "Địa chỉ", kind: "readonly", group: "order" },
  { key: "product", label: "Sản phẩm", kind: "readonly", group: "order" },
  { key: "sku", label: "SKU", kind: "readonly", group: "order" },
  { key: "amount", label: "Số tiền", kind: "readonly", group: "order" },
  { key: "shipping_code", label: "Mã vận đơn", kind: "readonly", group: "order" },
  { key: "invoice_code", label: "Mã đơn gốc", kind: "readonly", group: "order" },
  { key: "status", label: "Trạng thái phiếu", kind: "status", group: "claim" },
  { key: "journeys_count", label: "Số hành trình", kind: "readonly", group: "claim" },
  { key: "customer_report_date", label: "Ngày khách báo lỗi", kind: "readonly", group: "claim" },
  { key: "activation_date", label: "Ngày kích hoạt", kind: "date", group: "warranty" },
  { key: "expiry_date", label: "Ngày hết hạn", kind: "readonly", group: "warranty" },
  { key: "warranty_days_left", label: "Số ngày bảo hành", kind: "readonly", group: "warranty" },
  { key: "created_by_name", label: "Người tạo", kind: "readonly", group: "claim" },
  { key: "created_at", label: "Ngày tạo", kind: "readonly", group: "claim" },
];

export const DEFAULT_WARRANTY_COLUMNS: WarrantyColumnKey[] = [
  "customer",
  "phone",
  "shipping_code",
  "status",
  "journeys_count",
  "activation_date",
  "expiry_date",
  "warranty_days_left",
  "created_at",
];

/** Badge màu theo nhóm: 1-3 chặng thu hồi (xanh dương), 4-5 xưởng (amber/cam),
 * 12 đang vận chuyển (violet), 6-8 chặng gửi lại (cyan/teal/tím), 9 xanh lá, 10 đỏ, 11 xám. */
export const STATUS_BADGE_CLASS: Record<WarrantyClaimStatus, string> = {
  1: "bg-sky-100 text-sky-700",
  2: "bg-blue-100 text-blue-700",
  3: "bg-indigo-100 text-indigo-700",
  12: "bg-violet-100 text-violet-700",
  4: "bg-amber-100 text-amber-700",
  5: "bg-orange-100 text-orange-700",
  6: "bg-cyan-100 text-cyan-700",
  7: "bg-teal-100 text-teal-700",
  8: "bg-purple-100 text-purple-700",
  9: "bg-green-100 text-green-700",
  10: "bg-red-100 text-red-700",
  11: "bg-gray-200 text-gray-600",
};

const ORDER_KEYS: WarrantyColumnKey[] = [
  "customer",
  "phone",
  "address",
  "product",
  "sku",
  "amount",
  "shipping_code",
  "invoice_code",
];

function fmtMoney(v: string): string {
  return formatCurrency(v, { style: "symbol", onInvalid: "raw" });
}

function fmtDate(v: string | null): string {
  return formatDateTimeVi(v, { onInvalid: "raw" });
}

function fmtDateOnly(v: string | null): string {
  return formatDateVi(v, { onInvalid: "raw" });
}

/** Số ngày bảo hành còn lại: chưa kích hoạt → "—", quá hạn → "Hết hạn", còn lại → "N ngày". */
export function formatDaysLeft(days: number | null | undefined): string {
  if (days == null) return "—";
  return days <= 0 ? "Hết hạn" : `${days} ngày`;
}

/** Read-display value for a cell (used by readonly cells). */
export function columnDisplayValue(row: WarrantyClaim, key: WarrantyColumnKey): string {
  if (key === "status") return row.status_label || "—";
  if (key === "journeys_count") return String(row.journeys?.length ?? 0);
  if (key === "customer_report_date") return fmtDateOnly(row.customer_report_date);
  if (key === "activation_date") return fmtDateOnly(row.activation_date);
  if (key === "expiry_date") return fmtDateOnly(row.expiry_date);
  if (key === "warranty_days_left") return formatDaysLeft(row.warranty_days_left);
  if (key === "created_at") return fmtDate(row.created_at);
  if (key === "created_by_name") return row.created_by_name || "—";
  if (key === "amount") return fmtMoney(row.order.total_after_discount);
  if (ORDER_KEYS.includes(key)) {
    const map: Record<string, string> = {
      customer: row.order.name,
      phone: row.order.phone,
      address: row.order.address,
      product: row.order.product,
      sku: row.order.sku,
      shipping_code: row.order.shipping_code,
      invoice_code: row.order.invoice_code,
    };
    return map[key] || "—";
  }
  return "—";
}
