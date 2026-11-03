// eslint-disable-next-line no-restricted-imports -- nợ typed client (audit 2026-09-23 P1-2): còn 3 call fetchJson, migrate dần sang @/api/typed
import { fetchJson } from "@/services/http";
import type { paths } from "@/api/typed";

const API_BASE = "/api/sale/contacts";

/**
 * Type SINH TỪ HỢP ĐỒNG OpenAPI (D9) — regen bằng `npm run gen:api` khi BE đổi
 * shape. Đổi field ở BE → `tsc` bắt lệch ngay ở đây.
 */
export type ContactListResponse =
  paths["/api/sale/contacts"]["get"]["responses"]["200"]["content"]["application/json"];
export type ContactItem = ContactListResponse["items"][number];
/** Block state tác nghiệp CSKH (module contact_flow) — {stage_name, stage_color, allow_edit_due, due_at, bucket}. */
export type ContactOperation = ContactItem["operation"];
/** 1 dòng hàng của đơn mới nhất — {sku, product_name, quantity}. */
export type ContactOrderItem = ContactItem["latest_order"]["items"][number];

export type ContactActivityListResponse =
  paths["/api/sale/contacts/{customer_id}/activities"]["get"]["responses"]["200"]["content"]["application/json"];
/** 1 item timeline — derive thẳng từ response 201 của POST (hợp đồng OpenAPI
 * đã tách schema theo method; GET items[number] cùng shape). */
export type ContactActivityItem =
  paths["/api/sale/contacts/{customer_id}/activities"]["post"]["responses"]["201"]["content"]["application/json"];

export type ContactListParams = {
  date_from?: string;
  date_to?: string;
  q?: string;
  channel?: number[];
  order_source?: string[];
  staff?: number[];
  action_needed?: string[];
  interaction?: string;
  customer_type?: string;
  /** Lọc theo bucket state tác nghiệp: 'overdue' | 'today' | 'upcoming' | 'ended' | 'none'. */
  operation_bucket?: string;
  /** Lọc theo product_id — khách có đơn chứa sản phẩm này. */
  product?: number[];
  limit: number;
  offset: number;
};

export type ContactActivityCreatePayload = {
  kind: "note" | "call";
  note?: string;
  order_id?: number;
  call_meta?: Record<string, unknown>;
};

/** GET /api/sale/contacts — danh sách contact cần chăm sóc (phân trang/lọc). */
export async function getContacts(
  params: ContactListParams,
  init?: { signal?: AbortSignal },
): Promise<ContactListResponse> {
  const query = new URLSearchParams({
    limit: String(params.limit),
    offset: String(params.offset),
  });
  if (params.date_from) query.set("date_from", params.date_from);
  if (params.date_to) query.set("date_to", params.date_to);
  const q = params.q?.trim() || "";
  if (q) query.set("q", q);
  if (params.interaction) query.set("interaction", params.interaction);
  if (params.customer_type) query.set("customer_type", params.customer_type);
  if (params.operation_bucket) query.set("operation_bucket", params.operation_bucket);
  params.channel?.forEach((id) => query.append("channel", String(id)));
  params.order_source?.forEach((source) => query.append("order_source", source));
  params.staff?.forEach((id) => query.append("staff", String(id)));
  params.action_needed?.forEach((action) => query.append("action_needed", action));
  params.product?.forEach((id) => query.append("product", String(id)));
  return fetchJson(`${API_BASE}?${query.toString()}`, { signal: init?.signal });
}

/** GET /api/sale/contacts/:customerId/activities — timeline liên hệ + trạng thái của 1 KH. */
export async function getContactActivities(
  customerId: number,
  params: { limit: number; offset: number },
): Promise<ContactActivityListResponse> {
  const query = new URLSearchParams({
    limit: String(params.limit),
    offset: String(params.offset),
  });
  return fetchJson(`${API_BASE}/${customerId}/activities?${query.toString()}`);
}

/** POST /api/sale/contacts/:customerId/activities — ghi 1 activity (note/call) thủ công. */
export async function createContactActivity(
  customerId: number,
  payload: ContactActivityCreatePayload,
): Promise<ContactActivityItem> {
  return fetchJson(`${API_BASE}/${customerId}/activities`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
