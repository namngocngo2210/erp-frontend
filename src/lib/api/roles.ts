// eslint-disable-next-line no-restricted-imports -- nợ typed client (audit 2026-09-23 P1-2): còn 1 call fetchJson, migrate dần sang @/api/typed
import { fetchJson } from "@/services/http";
import { apiDelete, apiGet, apiPatch, apiPost, type components } from "@/api/typed";

/**
 * Type derive từ hợp đồng OpenAPI (D9).
 *
 * Spec đã regen đúng `section_scopes`/`field_rules`/`field_grants` (trước đây
 * mô tả generic/thiếu nên phải override tay — đã bỏ). Chỉ còn nắn required
 * các field schema khai optional (có default) nhưng BE luôn trả đủ.
 */
export type PermissionRow = Omit<components["schemas"]["Permission"], "label"> & {
  label: string;
};

export type Role = Omit<
  components["schemas"]["Role"],
  "description" | "scope_default" | "is_active"
> & {
  description: string;
  scope_default: components["schemas"]["ScopeDefaultEnum"];
  is_active: boolean;
};

/**
 * Payload ghi role. `scope_default` nới thành `string` vì state của page là
 * chuỗi tự do (Select) — BE validate enum; khi gọi client typed phải ép về
 * `RoleWrite`/`PatchedRoleWrite` của spec.
 */
export type RoleWrite = Omit<components["schemas"]["RoleWrite"], "scope_default"> & {
  scope_default?: string;
};

/** Một nhóm nghiệp vụ trong catalog field đơn hàng (BE Task 4). */
export type OrderFieldCatalogGroup = {
  code: string;
  label: string;
  fields: { name: string; label: string }[];
};

export type OrderFieldCatalog = {
  groups: OrderFieldCatalogGroup[];
};

export function listPermissions(): Promise<PermissionRow[]> {
  return apiGet("/api/users/permissions") as Promise<PermissionRow[]>;
}
export function listRoles(): Promise<Role[]> {
  return apiGet("/api/users/roles") as Promise<Role[]>;
}
/**
 * GET /api/users/order-field-catalog — nhóm field đơn dùng để cấu hình quyền
 * sửa field (admin-only). Spec khai response 200 KHÔNG có content (drift —
 * `@extend_schema` phía BE thiếu response serializer) nên giữ `fetchJson`
 * với type tay cho tới khi BE bổ sung.
 */
export function fetchOrderFieldCatalog(): Promise<OrderFieldCatalog> {
  return fetchJson("/api/users/order-field-catalog");
}
export function createRole(body: RoleWrite): Promise<Role> {
  return apiPost("/api/users/roles", body as components["schemas"]["RoleWrite"]) as Promise<Role>;
}
export function updateRole(id: number, body: RoleWrite): Promise<Role> {
  return apiPatch(
    `/api/users/roles/${id}` as "/api/users/roles/{role_id}",
    body as components["schemas"]["PatchedRoleWrite"],
  ) as Promise<Role>;
}
export function deleteRole(id: number): Promise<null> {
  return apiDelete(`/api/users/roles/${id}` as "/api/users/roles/{role_id}") as Promise<null>;
}
