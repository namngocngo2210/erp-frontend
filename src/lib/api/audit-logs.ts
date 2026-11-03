// eslint-disable-next-line no-restricted-imports -- nợ typed client (audit 2026-09-23 P1-2): còn 1 call fetchJson, migrate dần sang @/api/typed
import { fetchJson } from "@/services/http";
import type { components } from "@/api/typed";

const API_BASE = "/api/audit-logs";

/**
 * Derive từ schema `AuditLogList` (id/timestamp). Phần lớn field còn lại
 * override vì spec hiện mô tả lệch mức FE dùng: enum quá hẹp so với dữ liệu
 * lịch sử (action_type/entity_type/source), nullable thiếu (user/curl_command),
 * và `ip_address`/`response_data`/`metadata` CHƯA có trong schema list.
 */
export type AuditLog = Omit<
  components["schemas"]["AuditLogList"],
  | "user"
  | "action_type"
  | "entity_type"
  | "entity_id"
  | "method"
  | "duration_ms"
  | "source"
  | "curl_command"
> & {
  user: string | null;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  method: string | null;
  ip_address: string | null;
  response_data: unknown;
  duration_ms: number | null;
  metadata: unknown;
  source: string;
  curl_command: string | null;
};

/** Shape phân trang chuẩn repo: {items,total,limit,offset}. */
export interface AuditLogsResponse {
  items: AuditLog[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Luật bounded-scan của BE (audit_views_impl): `search` bắt buộc đi kèm
 * `timestamp__gte` và cửa sổ [gte, lte-hoặc-now] tối đa 31 ngày — bảng
 * audit_logs ~2.19M dòng, ILIKE không chặn cửa sổ từng timeout.
 */
export const SEARCH_MAX_WINDOW_DAYS = 31;

export type SearchWindowViolation = "missing-from" | "too-wide";

/**
 * Mirror validation của BE để chặn từ client (BE vẫn là chốt cuối, trả 400).
 * `dateFrom`/`dateTo` là giá trị input type=date (`YYYY-MM-DD` hoặc rỗng).
 * Trả null khi hợp lệ (kể cả khi không có search — luật chỉ áp cho search).
 */
export function validateSearchWindow(
  search: string,
  dateFrom: string,
  dateTo: string,
  now: Date = new Date(),
): SearchWindowViolation | null {
  if (!search.trim()) return null;
  if (!dateFrom) return "missing-from";
  // Mốc local, khớp giá trị gửi BE ("YYYY-MM-DDT23:59:59" không offset = giờ máy).
  // Không dựng qua chuỗi có Z/offset rồi so getter local (bẫy tz-bomb).
  const from = new Date(`${dateFrom}T00:00:00`);
  const to = dateTo ? new Date(`${dateTo}T23:59:59`) : now;
  if (to.getTime() - from.getTime() > SEARCH_MAX_WINDOW_DAYS * 86_400_000) {
    return "too-wide";
  }
  return null;
}

export interface AuditLogsParams {
  actionType?: string;
  entityType?: string;
  source?: string;
  search?: string;
  timestampGte?: string;
  timestampLte?: string;
  limit?: number;
  offset?: number;
}

export function normalizeAuditLogs(payload: unknown): AuditLogsResponse {
  if (payload && typeof payload === "object") {
    const maybeObject = payload as Partial<AuditLogsResponse>;
    if (Array.isArray(maybeObject.items)) {
      return {
        items: maybeObject.items,
        total: typeof maybeObject.total === "number" ? maybeObject.total : maybeObject.items.length,
        limit: typeof maybeObject.limit === "number" ? maybeObject.limit : maybeObject.items.length,
        offset: typeof maybeObject.offset === "number" ? maybeObject.offset : 0,
      };
    }
  }
  return { items: [], total: 0, limit: 0, offset: 0 };
}

function buildAuditLogsParams(params: AuditLogsParams): URLSearchParams {
  const qs = new URLSearchParams();
  if (params.actionType) qs.append("action_type", params.actionType);
  if (params.entityType) qs.append("entity_type", params.entityType);
  if (params.source) qs.append("source", params.source);
  if (params.search?.trim()) qs.append("search", params.search.trim());
  if (params.timestampGte) qs.append("timestamp__gte", params.timestampGte);
  if (params.timestampLte) qs.append("timestamp__lte", params.timestampLte);
  if (params.limit !== undefined) qs.append("limit", String(params.limit));
  if (params.offset !== undefined) qs.append("offset", String(params.offset));
  return qs;
}

export async function getAuditLogs(params: AuditLogsParams): Promise<AuditLogsResponse> {
  const qs = buildAuditLogsParams(params);
  const result = await fetchJson(`${API_BASE}/?${qs.toString()}`);
  return normalizeAuditLogs(result);
}
