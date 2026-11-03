// eslint-disable-next-line no-restricted-imports -- nợ typed client (audit 2026-09-23 P1-2): còn 10 call fetchJson, migrate dần sang @/api/typed
import { fetchJson } from "@/services/http";
import { type AdminUserRow } from "@/features/users/components/UserManagement";
import { type Department } from "@/features/users/types";
import type { components } from "@/api/typed";

/**
 * Typed wrappers around the user / department / profile JSON endpoints. These
 * functions only perform the network call; orchestration (cache invalidation,
 * list reload, toasts) stays at the call site.
 *
 * Payload types derive từ hợp đồng OpenAPI (D9). Override:
 * - `kiotviet_mappings`: schema mô tả object[] generic → giữ shape cụ thể.
 * - `lark_open_id`, `zenify_email`, `foxia_id`, `media_role`, `media_api_key`: BE khai default
 *   nên spec đánh required → nới optional (media_role/media_api_key thêm ở users/0046).
 * - `role`: field legacy FE vẫn gửi, chưa có trong spec.
 *
 * Ghi chú: phòng ban KHÔNG còn `allowed_sections` (model drop ở users/0017,
 * phân quyền chuyển hẳn sang RBAC/Role). UI section theo phòng ban đã gỡ.
 */

type KiotVietUserMappingInput = Array<{
  kiotviet_channel_id: number;
  external_kiot_user_id: string;
}>;

type MediaRoleInput = "" | components["schemas"]["MediaRoleEnum"];

export type CreateAdminUserPayload = Omit<
  components["schemas"]["AdminUserCreate"],
  | "lark_open_id"
  | "zenify_email"
  | "foxia_id"
  | "kiotviet_mappings"
  | "media_role"
  | "media_api_key"
> & {
  role?: string;
  lark_open_id?: string;
  zenify_email?: string;
  foxia_id?: string;
  media_role?: MediaRoleInput;
  media_api_key?: string | null;
  kiotviet_mappings?: KiotVietUserMappingInput;
};

export type UpdateAdminUserPayload = Omit<
  components["schemas"]["PatchedAdminUserUpdate"],
  "kiotviet_mappings" | "media_role" | "media_api_key"
> & {
  role?: string;
  media_role?: MediaRoleInput;
  media_api_key?: string | null;
  kiotviet_mappings?: KiotVietUserMappingInput;
};

export type CreateDepartmentPayload = components["schemas"]["DepartmentCreateUpdate"];

// Partial<> vì spec đánh `is_active` required trong Patched* (artefact của default).
export type UpdateDepartmentPayload = Partial<
  components["schemas"]["PatchedDepartmentCreateUpdate"]
>;

export type UpdateProfilePayload = components["schemas"]["PatchedUserProfileUpdate"];

export type ChangePasswordPayload = components["schemas"]["ChangePassword"];

export type AdminUserListParams = { q?: string; limit: number; offset: number };

/**
 * Response GET /api/users/admin. `items` override sang AdminUserRow (superset
 * của schema User: giữ field legacy `role` FE đang dùng).
 */
export type AdminUserListResponse = Omit<
  components["schemas"]["AdminUserListResponse"],
  "items"
> & { items: AdminUserRow[] };

/** GET /api/users/admin — danh sách user phân trang + lọc q. */
export async function listAdminUsers(
  params: AdminUserListParams,
  signal?: AbortSignal,
): Promise<AdminUserListResponse> {
  const search = new URLSearchParams({
    limit: String(params.limit),
    offset: String(params.offset),
  });
  if (params.q) search.set("q", params.q);
  const data = (await fetchJson(`/api/users/admin?${search.toString()}`, {
    signal,
  })) as AdminUserListResponse;
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    total: typeof data?.total === "number" ? data.total : 0,
  };
}

/** POST /api/users/admin — create an admin-managed user. */
export async function createAdminUser(payload: CreateAdminUserPayload): Promise<unknown> {
  return fetchJson("/api/users/admin", { method: "POST", body: JSON.stringify(payload) });
}

/** PATCH /api/users/admin/:id — partially update an admin-managed user. */
export async function updateAdminUser(
  id: number,
  payload: UpdateAdminUserPayload,
): Promise<unknown> {
  return fetchJson(`/api/users/admin/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

/** DELETE /api/users/admin/:id — delete an admin-managed user. */
export async function deleteAdminUser(id: number): Promise<unknown> {
  return fetchJson(`/api/users/admin/${id}`, { method: "DELETE" });
}

/** GET /api/users/departments — list departments. */
export async function listDepartments(): Promise<Department[]> {
  const data = await fetchJson("/api/users/departments");
  return Array.isArray(data) ? data : [];
}

/** POST /api/users/departments — create a department. */
export async function createDepartment(payload: CreateDepartmentPayload): Promise<unknown> {
  return fetchJson("/api/users/departments", { method: "POST", body: JSON.stringify(payload) });
}

/** PATCH /api/users/departments/:id — partially update a department. */
export async function updateDepartment(
  id: number,
  payload: UpdateDepartmentPayload,
): Promise<unknown> {
  return fetchJson(`/api/users/departments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/** DELETE /api/users/departments/:id — delete a department. */
export async function deleteDepartment(id: number): Promise<unknown> {
  return fetchJson(`/api/users/departments/${id}`, { method: "DELETE" });
}

/** PATCH /api/users/profile — update the current user's profile; returns updated user. */
export async function updateProfile(payload: UpdateProfilePayload): Promise<unknown> {
  return fetchJson("/api/users/profile", { method: "PATCH", body: JSON.stringify(payload) });
}

/** POST /api/users/change-password — change the current user's password. */
export async function changePassword(payload: ChangePasswordPayload): Promise<unknown> {
  return fetchJson("/api/users/change-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
