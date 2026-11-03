// eslint-disable-next-line no-restricted-imports -- nợ typed client (audit 2026-09-23 P1-2): còn 17 call fetchJson, migrate dần sang @/api/typed
import { fetchJson } from "@/services/http";
import type { OrderRow } from "@/features/orders/order-types";
import type { components } from "@/api/typed";

const API_BASE = "/api/customers";
const CUSTOMERS_MAX_LIMIT = 100;

/**
 * Type SINH TỪ HỢP ĐỒNG OpenAPI (D9) ở những endpoint đã được annotate đầy đủ.
 * Các block report (summary/reactivation/trends/channel-quality) và
 * customer-profiles vẫn viết tay vì schema hiện mô tả generic object /
 * chưa có endpoint trong spec.
 */

/**
 * Row khách hàng. Schema `Customer` để hầu hết field optional (serializer có
 * default) — giữ shape required như BE thực trả để page không phải null-check
 * thừa; field nào lệch schema thật thì `gen:api` + alias này sẽ báo đỏ.
 */
export type Customer = Required<
  Pick<
    components["schemas"]["Customer"],
    "id" | "code" | "full_name" | "phone_raw" | "phone_normalized" | "created_at" | "updated_at"
  >
> & { gender: number | null };

export type CustomerUpsertPayload = Partial<components["schemas"]["PatchedCustomerUpsert"]>;

export type CustomerBulkDeleteResult = components["schemas"]["CustomerBulkDeleteResponse"];

export interface CustomerListParams {
  query?: string;
  limit: number;
  offset: number;
}

export type CustomerOrderAggregate = components["schemas"]["CustomerOrderAggregate"];

export async function createCustomer(payload: CustomerUpsertPayload): Promise<Customer> {
  return fetchJson(API_BASE, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCustomer(
  customerId: number,
  payload: CustomerUpsertPayload,
): Promise<Customer> {
  return fetchJson(`${API_BASE}/${customerId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteCustomer(customerId: number): Promise<void> {
  return fetchJson(`${API_BASE}/${customerId}`, {
    method: "DELETE",
  });
}

export async function bulkDeleteCustomers(ids: number[]): Promise<CustomerBulkDeleteResult> {
  return fetchJson(`${API_BASE}/bulk-delete`, {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

export async function getCustomerOrders(customerId: number): Promise<OrderRow[]> {
  return fetchJson(`${API_BASE}/${customerId}/orders`);
}

export type LoyalCustomerProduct = components["schemas"]["LoyalCustomerProduct"];

export type LoyalCustomer = components["schemas"]["LoyalCustomer"];

export type LoyalCustomerListResult = components["schemas"]["LoyalCustomerListResponse"];

export interface LoyalCustomerListParams {
  limit: number;
  offset: number;
  dateFrom?: string;
  dateTo?: string;
  segment?: string;
  category?: string;
}

export async function getLoyalCustomers(
  params: LoyalCustomerListParams,
  options?: { signal?: AbortSignal },
): Promise<LoyalCustomerListResult> {
  const safeLimitRaw = Number(params.limit);
  const safeOffsetRaw = Number(params.offset);
  const safeLimit =
    Number.isFinite(safeLimitRaw) && safeLimitRaw > 0
      ? Math.max(1, Math.min(CUSTOMERS_MAX_LIMIT, Math.trunc(safeLimitRaw)))
      : CUSTOMERS_MAX_LIMIT;
  const safeOffset =
    Number.isFinite(safeOffsetRaw) && safeOffsetRaw >= 0 ? Math.trunc(safeOffsetRaw) : 0;

  const query = new URLSearchParams({
    limit: String(safeLimit),
    offset: String(safeOffset),
  });
  if (params.dateFrom) query.set("date_from", params.dateFrom);
  if (params.dateTo) query.set("date_to", params.dateTo);
  if (params.segment) query.set("segment", params.segment);
  if (params.category) query.set("category", params.category);
  return fetchJson(`${API_BASE}/loyal?${query.toString()}`, { signal: options?.signal });
}

export type SegmentCategory = components["schemas"]["SegmentCategoryListResponse"];

export async function getSegmentCategories(): Promise<SegmentCategory[]> {
  return fetchJson(`${API_BASE}/loyal/segments`);
}

export interface LoyalCustomerNotePayload {
  sale_action?: string;
  special_note?: string;
  sale_staff_id?: number | null;
  last_care_call_at?: string | null;
}

export async function updateLoyalCustomerNote(
  customerId: number,
  payload: LoyalCustomerNotePayload,
): Promise<
  // Spec `LoyalCustomerNoteUpdateResponse` đánh dấu nullable lệch với `LoyalCustomer`
  // (page merge response vào row). Derive từ `LoyalCustomer` để hai phía nhất quán.
  Pick<
    LoyalCustomer,
    "sale_action" | "special_note" | "sale_staff_id" | "sale_staff_name" | "last_care_call_at"
  >
> {
  return fetchJson(`${API_BASE}/loyal/${customerId}/note`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export interface StaffUserOption {
  id: number;
  username: string;
  display_name?: string;
  department_id?: number | null;
}

export async function getStaffUsers(): Promise<StaffUserOption[]> {
  return fetchJson("/api/channels/staff");
}

export interface CustomerProfile {
  identity: { id: number; code: string; full_name: string; phone: string };
  demographics: {
    gender: number | null;
    gender_label: string | null;
    province: string;
    address: string;
    age_text: string;
    age_group_label: string | null;
    occupation_code: string | null;
    occupation_label: string | null;
  };
  channel: { channel_id: number | null; channel_name: string };
  segment: { segment_code: string; segment_name: string };
  needs: {
    need_group_code: string;
    need_group_name: string;
    items: { group_code: string; group_name: string; type_code: string; type_name: string }[];
  };
  purchase: {
    first_purchase_at: string | null;
    last_purchase_at: string | null;
    total_orders: number;
    total_spent: string;
    distinct_skus: string[];
  };
  latest_order: {
    sku: string | null;
    product: string;
    last_order_amount: string | null;
    last_order_status: number | null;
    sales_status_code: string | null;
    sales_status_label: string | null;
    not_closed_reason_code: string | null;
    not_closed_reason_label: string | null;
  };
  persona: {
    customer_classification_code: string | null;
    customer_classification_label: string | null;
    pain_level_code: string | null;
    pain_level_label: string | null;
    pain_duration_code: string | null;
    pain_duration_label: string | null;
    lifestyle_habit_codes: string[];
    used_massage_before: boolean | null;
    relax_time_codes: string[];
    purchase_barrier_codes: string[];
    delax_source_codes: string[];
    comparing_brand_text: string;
    call_duration_code: string | null;
    call_duration_label: string | null;
    post_purchase_feedback_text: string;
    post_purchase_rating_code: string | null;
    post_purchase_rating_label: string | null;
  };
  resale: { last_resale_at: string | null; resale_status: string; resale_suggestion: string };
}

export interface CustomerProfileListResult {
  results: CustomerProfile[];
  total: number;
}

export interface CustomerProfileListParams {
  query?: string;
  limit: number;
  offset: number;
  segment?: string;
  channel?: string;
  salesStatus?: string;
}

export async function getCustomerProfiles(
  params: CustomerProfileListParams,
): Promise<CustomerProfileListResult> {
  const safeLimit = Math.max(
    1,
    Math.min(CUSTOMERS_MAX_LIMIT, Math.trunc(Number(params.limit) || CUSTOMERS_MAX_LIMIT)),
  );
  const safeOffset = Math.max(0, Math.trunc(Number(params.offset) || 0));
  const query = new URLSearchParams({ limit: String(safeLimit), offset: String(safeOffset) });
  const q = params.query?.trim() || "";
  if (q) query.set("q", q);
  if (params.segment) query.set("segment", params.segment);
  if (params.channel) query.set("channel", params.channel);
  if (params.salesStatus) query.set("sales_status", params.salesStatus);
  return fetchJson(`${API_BASE}/profiles?${query.toString()}`);
}

export interface CustomerResaleNotePayload {
  resale_status?: string;
  resale_suggestion?: string;
}

export async function updateCustomerResaleNote(
  customerId: number,
  payload: CustomerResaleNotePayload,
): Promise<components["schemas"]["CustomerResaleNoteUpdateResponse"]> {
  return fetchJson(`${API_BASE}/${customerId}/resale-note`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export type ResaleAssessment = components["schemas"]["ResaleAssessment"];

export type ResaleHistoryOrder = components["schemas"]["ResaleHistoryOrder"];

/**
 * Row resale-tracking derive từ schema; riêng `contact_logs` / `appointment` /
 * `resale_orders` schema chỉ mô tả `object` nên giữ shape viết tay (hẹp hơn,
 * vẫn tương thích) để page dùng được field cụ thể.
 */
export type ResaleTrackingRow = Omit<
  components["schemas"]["ResaleTrackingRow"],
  "contact_logs" | "appointment" | "resale_orders"
> & {
  contact_logs?: Array<{
    contact_no?: number;
    channel?: string;
    result?: string;
    customer_status?: string;
    created_at?: string;
  }>;
  appointment?: {
    appointment_at: string | null;
    channel: string;
    purpose: string;
    note: string;
  } | null;
  resale_orders?: Array<{
    product?: string;
    quantity?: number;
    order_value?: string;
    channel?: string;
    note?: string;
    created_at?: string;
  }>;
};

export type ResaleTrackingFacets = components["schemas"]["ResaleTrackingFacets"];

export type ResaleTrackingListResult = Omit<
  components["schemas"]["ResaleTrackingListResponse"],
  "results"
> & { results: ResaleTrackingRow[] };

export async function getResaleTracking(
  params: {
    query?: string;
    limit: number;
    offset: number;
    dateFrom?: string;
    dateTo?: string;
    sale?: number | null;
    contactStatus?: string;
    segment?: string;
    minDays?: number | null;
  },
  options?: { signal?: AbortSignal },
): Promise<ResaleTrackingListResult> {
  const safeLimit = Math.max(
    1,
    Math.min(CUSTOMERS_MAX_LIMIT, Math.trunc(Number(params.limit) || CUSTOMERS_MAX_LIMIT)),
  );
  const safeOffset = Math.max(0, Math.trunc(Number(params.offset) || 0));
  const query = new URLSearchParams({ limit: String(safeLimit), offset: String(safeOffset) });
  const q = params.query?.trim() || "";
  if (q) query.set("q", q);
  if (params.dateFrom) query.set("date_from", params.dateFrom);
  if (params.dateTo) query.set("date_to", params.dateTo);
  if (params.sale) query.set("sale", String(params.sale));
  if (params.contactStatus) query.set("contact_status", params.contactStatus);
  if (params.segment) query.set("segment", params.segment);
  if (params.minDays) query.set("min_days", String(params.minDays));
  return fetchJson(`${API_BASE}/resale?${query.toString()}`, { signal: options?.signal });
}

export async function updateResaleContact(
  orderId: number,
  payload: {
    contact_no: 1 | 2 | 3;
    checked: boolean;
    channel?: string;
    result?: string;
    customer_status?: string;
  },
): Promise<
  Omit<components["schemas"]["ResaleContactUpdateResponse"], "contact_logs"> & {
    contact_logs?: ResaleTrackingRow["contact_logs"];
  }
> {
  return fetchJson(`${API_BASE}/resale/${orderId}/contact`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function updateResaleAppointment(
  orderId: number,
  payload: { appointment_at: string; channel?: string; purpose?: string; note?: string },
): Promise<components["schemas"]["ResaleAppointmentUpdateResponse"]> {
  return fetchJson(`${API_BASE}/resale/${orderId}/appointment`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function createResaleOrderNote(
  orderId: number,
  payload: {
    product: string;
    quantity: number;
    order_value?: string;
    channel?: string;
    note?: string;
  },
): Promise<{ resale_orders: NonNullable<ResaleTrackingRow["resale_orders"]> }> {
  return fetchJson(`${API_BASE}/resale/${orderId}/order`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// Channel options (shared across customers filter & other pages)
// ---------------------------------------------------------------------------

export interface ChannelOption {
  id: number;
  code: string;
  name: string;
}

export async function getChannels(): Promise<ChannelOption[]> {
  const data = await fetchJson("/api/channels");
  return Array.isArray(data) ? (data as ChannelOption[]) : [];
}

// ---------------------------------------------------------------------------
// CRM catalogs (used for customer filter dropdowns)
// ---------------------------------------------------------------------------

export interface CrmCatalogOption {
  code: string;
  label: string;
}

export interface CrmCatalogsResponse {
  sales_status_options?: CrmCatalogOption[];
  delax_source_options?: CrmCatalogOption[];
  lifestyle_habit_options?: CrmCatalogOption[];
  relax_time_options?: CrmCatalogOption[];
  purchase_barrier_options?: CrmCatalogOption[];
  not_closed_reason_options?: CrmCatalogOption[];
  [key: string]: CrmCatalogOption[] | undefined;
}

export async function getCrmCatalogs(): Promise<CrmCatalogsResponse> {
  return fetchJson("/api/orders/crm-catalogs");
}
