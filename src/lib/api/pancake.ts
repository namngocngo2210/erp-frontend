// Spec OpenAPI của /api/pancake/* chưa khai response schema (`content?: never`)
// nên chỉ kiểm được PATH qua client typed; kiểu trả về vẫn viết tay + cast
// (audit 2026-09-23 P1-2). Khi BE bổ sung serializer thì bỏ cast.
import { apiGet, apiPatch, apiPost, apiPut } from "@/api/typed";

/**
 * Tích hợp Pancake: token tài khoản, page ↔ kênh bán, lead (sđt khách cho trong
 * hội thoại) + trạng thái đẩy Foxia. Chỉ gọi mạng; điều phối ở call site.
 */

export type PancakeConnection = {
  has_token: boolean;
  auth_status: "unknown" | "ok" | "error";
  auth_error: string;
  last_pages_synced_at: string | null;
  name: string;
};

export type PancakePage = {
  id: number;
  pancake_page_id: string;
  name: string;
  platform: string;
  is_activated: boolean;
  has_active_subscription: boolean;
  role_in_page: string;
  channel_id: number | null;
  channel_name: string;
  /** Cột nguồn Foxia suy từ platform; null = nền tảng không hỗ trợ, không gán được. */
  foxia_kind: "messenger" | "zalo" | null;
  is_enabled: boolean;
  has_token: boolean;
  token_error: string;
  polled_until: string | null;
  last_polled_at: string | null;
  last_error: string;
};

/**
 * `order_created`/`order_failed`/`order_exists` là trạng thái từ 17/09 (lead mới
 * tạo đơn thay vì đẩy thẳng Foxia); `ok`/`skipped_no_mapping` chỉ còn cho lead cũ.
 */
export type PancakePushStatus =
  | "pending"
  | "ok"
  | "failed"
  | "skipped_no_mapping"
  | "order_created"
  | "order_failed"
  | "order_exists";

export type PancakeLead = {
  id: number;
  page_id: number;
  pancake_page_id: string;
  page_name: string;
  channel_id: number;
  channel_name: string;
  conversation_id: string;
  conversation_inserted_at: string | null;
  customer_name: string;
  phone: string;
  tags: string[];
  phone_given_at: string | null;
  assignee_name: string;
  created_at: string;
  foxia_kind: string;
  foxia_source_id: number | null;
  push_status: PancakePushStatus;
  http_status: number | null;
  error: string;
  pushed_at: string | null;
  cohoi_id: number | null;
  /** Đơn đã tạo cho lead này (order_source=messenger); null nếu chưa/không tạo được. */
  order_id: number | null;
};

/** Ánh xạ tên nhân viên Pancake (như poll thấy) → user nội bộ để gán sale khi tạo đơn. */
export type PancakeStaffMap = {
  id: number;
  pancake_name: string;
  user_id: number | null;
  user_username: string;
  user_display_name: string;
  last_seen_at: string | null;
};

/** Shape phân trang chuẩn repo: {items,total,limit,offset}. */
export type PancakeLeadsResponse = {
  items: PancakeLead[];
  total: number;
  limit: number;
  offset: number;
};

export type PancakeLeadsParams = {
  page?: number | "";
  channel?: number | "";
  push_status?: PancakePushStatus | "";
  q?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
};

export async function getConnection(): Promise<PancakeConnection> {
  return (await apiGet("/api/pancake/connection")) as PancakeConnection;
}

export async function saveConnection(accessToken: string): Promise<PancakeConnection> {
  return (await apiPut("/api/pancake/connection", {
    access_token: accessToken,
  })) as PancakeConnection;
}

export type SyncPagesResult = {
  fetched: number;
  created: number;
  updated: number;
  deactivated: number;
  pages: PancakePage[];
};

export async function syncPages(): Promise<SyncPagesResult> {
  return (await apiPost("/api/pancake/pages/sync", undefined as never)) as SyncPagesResult;
}

export async function listPages(): Promise<PancakePage[]> {
  const data = (await apiGet("/api/pancake/pages")) as { pages: PancakePage[] };
  return data.pages ?? [];
}

export async function updatePage(
  id: number,
  patch: { channel_id?: number | null; is_enabled?: boolean },
): Promise<PancakePage> {
  return (await apiPatch(
    `/api/pancake/pages/${id}` as "/api/pancake/pages/{id}",
    patch,
  )) as PancakePage;
}

export async function listLeads(params: PancakeLeadsParams = {}): Promise<PancakeLeadsResponse> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "" || value === null) continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return (await apiGet(
    `/api/pancake/leads${qs ? `?${qs}` : ""}` as "/api/pancake/leads",
  )) as PancakeLeadsResponse;
}

export async function retryLeadOrder(id: number): Promise<{ status: string }> {
  return (await apiPost(
    `/api/pancake/leads/${id}/retry-order` as "/api/pancake/leads/{id}/retry-order",
    undefined as never,
  )) as { status: string };
}

export async function listStaffMaps(): Promise<PancakeStaffMap[]> {
  const data = (await apiGet("/api/pancake/staff-maps")) as { items: PancakeStaffMap[] };
  return data.items ?? [];
}

export async function saveStaffMaps(
  items: { id: number; user_id: number | null }[],
): Promise<PancakeStaffMap[]> {
  const data = (await apiPut("/api/pancake/staff-maps", { items })) as { items: PancakeStaffMap[] };
  return data.items ?? [];
}
