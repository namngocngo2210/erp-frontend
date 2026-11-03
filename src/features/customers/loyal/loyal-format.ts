// Helper thuần của trang Khách hàng thân thiết (test trực tiếp).
import { formatCurrency as formatCurrencyShared, formatDateVi } from "@/lib/format";
import type {
  LoyalCustomer,
  LoyalCustomerListParams,
  LoyalCustomerNotePayload,
  LoyalCustomerProduct,
  StaffUserOption,
} from "@/lib/api/customers";

export type DateRange = { from: string; to: string } | null;
export type PresetKey = "all" | "this_month" | "this_quarter" | "this_year" | "custom";
export const ALL_SEGMENTS = "__all__";
export const ALL_CATEGORIES = "__all__";

const LOYAL_MAX_PAGE_SIZE = 100;

export function clampPageSize(value: number): number {
  return Number.isFinite(value) && value > 0
    ? Math.max(1, Math.min(LOYAL_MAX_PAGE_SIZE, Math.trunc(value)))
    : LOYAL_MAX_PAGE_SIZE;
}

export function formatCurrency(value: string): string {
  return formatCurrencyShared(value, { fallback: "0", onInvalid: "fallback" });
}

export function formatDate(value: string | null): string {
  return formatDateVi(value, { fallback: "-" });
}

export function toDateInputValue(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}

export function formatDaysSince(value: number | null): string {
  if (value === null || value === undefined) return "-";
  return `${value} ngày`;
}

export function daysSinceClassName(value: number | null): string {
  if (value === null || value === undefined) return "bg-muted text-muted-foreground";
  if (value > 180) return "bg-red-100 text-red-700";
  if (value > 90) return "bg-orange-100 text-orange-700";
  if (value > 30) return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

export function formatChannels(channels: string[] = []): string {
  return channels.length > 0 ? channels.join(" / ") : "-";
}

/** SKU kem so luong ro don vi. */
export function formatProductLabel(product: LoyalCustomerProduct): string {
  return `${product.sku} (SL: ${product.quantity})`;
}

export function segmentLabel(row: LoyalCustomer): string {
  if (!row.segment_code) return "";
  return row.segment_name ? `${row.segment_code} - ${row.segment_name}` : row.segment_code;
}

export function staffLabel(staff: StaffUserOption): string {
  return staff.display_name || staff.username;
}

export function buildLoyalListParams(args: {
  currentPage: number;
  pageSize: number;
  range: DateRange;
  segment: string;
  category: string;
}): LoyalCustomerListParams {
  const safePageSize = clampPageSize(args.pageSize);
  return {
    limit: safePageSize,
    offset: Math.max(0, (args.currentPage - 1) * safePageSize),
    dateFrom: args.range?.from || undefined,
    dateTo: args.range?.to || undefined,
    segment: args.segment === ALL_SEGMENTS ? undefined : args.segment,
    category: args.category === ALL_CATEGORIES ? undefined : args.category,
  };
}

export type LoyalNoteForm = {
  sale_action: string;
  special_note: string;
  sale_staff_id: string;
  last_care_call_at: string;
};

export const EMPTY_NOTE_FORM: LoyalNoteForm = {
  sale_action: "",
  special_note: "",
  sale_staff_id: "",
  last_care_call_at: "",
};

export function noteFormFromRow(row: LoyalCustomer): LoyalNoteForm {
  return {
    sale_action: row.sale_action || "",
    special_note: row.special_note || "",
    sale_staff_id: row.sale_staff_id ? String(row.sale_staff_id) : "",
    last_care_call_at: toDateInputValue(row.last_care_call_at),
  };
}

/**
 * Không có quyền sale-assignment:edit thì KHÔNG gửi sale_staff_id — khớp với
 * control bị disable trên UI, tránh gửi field mà request có thể bị BE từ chối
 * (defense in depth, gate thật vẫn nằm ở BE).
 */
export function buildNotePayload(
  form: LoyalNoteForm,
  canAssignSale: boolean,
): LoyalCustomerNotePayload {
  const payload: LoyalCustomerNotePayload = {
    sale_action: form.sale_action,
    special_note: form.special_note,
    last_care_call_at: form.last_care_call_at || null,
  };
  if (canAssignSale) {
    payload.sale_staff_id = form.sale_staff_id ? Number(form.sale_staff_id) : null;
  }
  return payload;
}
