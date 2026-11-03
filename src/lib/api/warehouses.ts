// eslint-disable-next-line no-restricted-imports -- nợ typed client (audit 2026-09-23 P1-2): còn 2 call fetchJson, migrate dần sang @/api/typed
import { fetchJson } from "@/services/http";
import { apiDelete, apiPatch, type components } from "@/api/typed";

const API_BASE = "/api/warehouses";

/** Type derive từ hợp đồng OpenAPI (D9); đổi serializer ở BE → `tsc` đỏ ở FE. */
export type Warehouse = Omit<components["schemas"]["Warehouse"], "is_active"> & {
  is_active: boolean;
};

export type WarehouseListResponse = Omit<
  components["schemas"]["WarehouseListResponse"],
  "items"
> & { items: Warehouse[] };

export type WarehouseUpsert = Omit<
  components["schemas"]["PatchedWarehouse"],
  "id" | "created_at" | "updated_at"
>;

/**
 * GET có query (search/is_active/limit/offset) mà spec khai `query?: never`
 * (BE parse tay, drift OpenAPI) — `apiGet` không nhận query string nên giữ
 * `fetchJson`; response vẫn type theo schema qua `WarehouseListResponse`.
 */
export async function getWarehouses(
  params: { search?: string; isActive?: boolean; limit?: number; offset?: number } = {},
): Promise<WarehouseListResponse> {
  const query = new URLSearchParams({
    limit: String(params.limit ?? 50),
    offset: String(params.offset ?? 0),
  });
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.isActive !== undefined) query.set("is_active", String(params.isActive));
  return fetchJson(`${API_BASE}?${query.toString()}`);
}

/**
 * POST — spec khai request body bằng serializer đọc (`Warehouse`) nên
 * `id`/`created_at`/`updated_at` (readOnly) bị coi là bắt buộc, FE không thể
 * gửi payload hợp lệ qua `apiPost` (drift readOnly-required). Giữ `fetchJson`.
 */
export async function createWarehouse(data: WarehouseUpsert): Promise<Warehouse> {
  return fetchJson(API_BASE, { method: "POST", body: JSON.stringify(data) });
}

export async function updateWarehouse(id: number, data: WarehouseUpsert): Promise<Warehouse> {
  return apiPatch(
    `${API_BASE}/${id}` as "/api/warehouses/{warehouse_id}",
    data,
  ) as Promise<Warehouse>;
}

export async function deleteWarehouse(id: number): Promise<void> {
  await apiDelete(`${API_BASE}/${id}` as "/api/warehouses/{warehouse_id}");
}
