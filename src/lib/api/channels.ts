// eslint-disable-next-line no-restricted-imports -- nợ typed client (audit 2026-09-23 P1-2): còn 13 call fetchJson, migrate dần sang @/api/typed
import { fetchJson } from "@/services/http";
import { type ChannelRow, type StaffUser } from "@/features/channels/components/ChannelManagement";
import type { components } from "@/api/typed";

/**
 * Typed wrappers around the channel JSON endpoints (channels + staff
 * assignments). These functions only perform the network call; orchestration
 * such as cache invalidation, list reload and toasts stays at the call site.
 *
 * Payload types SINH TỪ HỢP ĐỒNG OpenAPI (D9): đổi serializer ở BE → `tsc` đỏ ở FE.
 * Riêng `kiotviet_mappings` schema chỉ mô tả `object[]` nên giữ shape cụ thể
 * (hẹp hơn schema, vẫn assignable) để call site không mất type safety.
 */

type KiotVietMappingInput = Array<{
  kiotviet_channel_id: number;
  external_sale_channel_id: string;
}>;

export type CreateChannelPayload = Omit<
  components["schemas"]["ChannelCreate"],
  "kiotviet_mappings"
> & { kiotviet_mappings?: KiotVietMappingInput };

// `price_book_id` (gán/gỡ bảng giá cho kênh, nullable) đi qua schema-derived
// `PatchedChannelUpdate` không cần khai tay — BE chỉ nhận field này ở PATCH,
// không có ở POST (`ChannelCreate`) nên tạo kênh mới luôn dùng bảng mặc định.
export type UpdateChannelPayload = Omit<
  components["schemas"]["PatchedChannelUpdate"],
  "kiotviet_mappings"
> & { kiotviet_mappings?: KiotVietMappingInput };

/** Loại kênh bán (Shopee/TikTok/Facebook/Web) — danh mục dùng cho dropdown. */
export type ChannelType = components["schemas"]["ChannelType"];

/** BE trả `{deleted_count}` (schema `ChannelBulkDeleteResponse`); null khi body rỗng. */
export type BulkDeleteResult = Partial<components["schemas"]["ChannelBulkDeleteResponse"]> | null;

/** GET /api/channels — list channels. */
export async function listChannels(): Promise<ChannelRow[]> {
  const data = await fetchJson("/api/channels");
  return Array.isArray(data) ? data : [];
}

/** GET /api/channels/list-for-kiotviet — lightweight channel list for KiotViet mapping. */
export async function listChannelsForKiotViet(): Promise<
  Array<components["schemas"]["ChannelForKiotvietResponse"]>
> {
  const data = await fetchJson("/api/channels/list-for-kiotviet?limit=100&offset=0");
  return Array.isArray(data) ? data : [];
}

/**
 * GET /api/channels/types — danh mục loại kênh đang bật.
 * BE đã sắp theo `sort_order` rồi `id`; client giữ nguyên thứ tự đó.
 */
export async function listChannelTypes(includeInactive = false): Promise<ChannelType[]> {
  // include_inactive chỉ dành cho màn quản lý danh mục; BE tự bỏ qua cờ này với
  // người chỉ có quyền trang đơn nên client không cần tự gác thêm.
  const query = includeInactive ? "?include_inactive=true" : "";
  const data = await fetchJson(`/api/channels/types${query}`);
  return Array.isArray(data) ? data : [];
}

/** Payload tạo loại kênh. `code` chỉ đặt được lúc tạo (BE không cho sửa). */
export type ChannelTypeCreateInput = {
  code: string;
  name: string;
  sort_order?: number;
  is_active?: boolean;
};

/** Payload sửa loại kênh — CỐ Ý không có `code` (xem ChannelTypeUpdateSerializer). */
export type ChannelTypeUpdateInput = Partial<Omit<ChannelTypeCreateInput, "code">>;

/** POST /api/channels/types — tạo loại kênh mới. */
export async function createChannelType(payload: ChannelTypeCreateInput): Promise<ChannelType> {
  return fetchJson("/api/channels/types", { method: "POST", body: JSON.stringify(payload) });
}

/** PATCH /api/channels/types/:id — sửa tên/thứ tự/trạng thái. */
export async function updateChannelType(
  id: number,
  payload: ChannelTypeUpdateInput,
): Promise<ChannelType> {
  return fetchJson(`/api/channels/types/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/** DELETE /api/channels/types/:id — BE trả 400 kèm lý do nếu còn kênh đang dùng. */
export async function deleteChannelType(id: number): Promise<void> {
  await fetchJson(`/api/channels/types/${id}`, { method: "DELETE" });
}

/**
 * GET /api/channels/staff — list staff users assignable to channels.
 * `department` (id phòng ban) để BE scope danh sách theo trang (Sales/Booking/Ads),
 * độc lập với phòng ban người xem; bỏ trống -> BE dùng scope mặc định theo người xem.
 */
export async function listChannelStaff(department?: number): Promise<StaffUser[]> {
  const query = department != null ? `?department=${department}` : "";
  const data = await fetchJson(`/api/channels/staff${query}`);
  return Array.isArray(data) ? data : [];
}

/** POST /api/channels — create a channel. */
export async function createChannel(payload: CreateChannelPayload): Promise<unknown> {
  return fetchJson("/api/channels", { method: "POST", body: JSON.stringify(payload) });
}

/** PATCH /api/channels/:id — partially update a channel. */
export async function updateChannel(id: number, payload: UpdateChannelPayload): Promise<unknown> {
  return fetchJson(`/api/channels/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

/** POST /api/channels/bulk-delete — delete one or more channels. */
export async function bulkDeleteChannels(ids: number[]): Promise<BulkDeleteResult> {
  return fetchJson("/api/channels/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

/** GET /api/channels/:id/assignments — list staff assigned to a channel. */
export async function listAssignments(channelId: number): Promise<StaffUser[]> {
  const data = await fetchJson(`/api/channels/${channelId}/assignments`);
  return Array.isArray(data) ? data : [];
}

/** POST /api/channels/:id/assignments — assign a user to a channel; returns updated list. */
export async function addAssignment(channelId: number, userId: number): Promise<StaffUser[]> {
  const data = await fetchJson(`/api/channels/${channelId}/assignments`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
  return Array.isArray(data) ? data : [];
}

/** DELETE /api/channels/:id/assignments/:userId — unassign a user from a channel. */
export async function removeAssignment(channelId: number, userId: number): Promise<void> {
  await fetchJson(`/api/channels/${channelId}/assignments/${userId}`, { method: "DELETE" });
}
