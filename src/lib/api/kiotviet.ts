// eslint-disable-next-line no-restricted-imports -- nợ typed client (audit 2026-09-23 P1-2): còn 5 call fetchJson, migrate dần sang @/api/typed
import { fetchJson } from "@/services/http";
import { type KiotVietChannelRow } from "@/features/kiotviet/components/KiotVietManagement";
import { type BulkDeleteResult } from "@/lib/api/channels";
import type { components } from "@/api/typed";

/**
 * Typed wrappers around the KiotViet channel JSON endpoints. These functions
 * only perform the network call; orchestration (cache invalidation, list
 * reload, toasts, confirm dialogs) stays at the call site.
 *
 * Payload types derive từ OpenAPI (`KiotVietChannelCreate`/`PatchedKiotVietChannelUpdate`).
 * Các field BE khai báo `@default` (old_sync_branch_id, username, password) được nới
 * thành optional ở FE vì call site không bắt buộc gửi.
 */

export type CreateKiotVietChannelPayload = Omit<
  components["schemas"]["KiotVietChannelCreate"],
  "old_sync_branch_id" | "username" | "password"
> & {
  old_sync_branch_id?: string;
  username?: string;
  password?: string;
};

export type UpdateKiotVietChannelPayload = components["schemas"]["PatchedKiotVietChannelUpdate"];

/** GET /api/channels/kiotviet — list KiotViet channels. */
export async function listKiotVietChannels(): Promise<KiotVietChannelRow[]> {
  const data = await fetchJson("/api/channels/kiotviet");
  return Array.isArray(data) ? data : [];
}

/** POST /api/channels/kiotviet — create a KiotViet channel. */
export async function createKiotVietChannel(
  payload: CreateKiotVietChannelPayload,
): Promise<unknown> {
  return fetchJson("/api/channels/kiotviet", { method: "POST", body: JSON.stringify(payload) });
}

/** PATCH /api/channels/kiotviet/:id — partially update a KiotViet channel. */
export async function updateKiotVietChannel(
  id: number,
  payload: UpdateKiotVietChannelPayload,
): Promise<unknown> {
  return fetchJson(`/api/channels/kiotviet/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/** DELETE /api/channels/kiotviet/:id — delete a single KiotViet channel. */
export async function deleteKiotVietChannel(id: number): Promise<unknown> {
  return fetchJson(`/api/channels/kiotviet/${id}`, { method: "DELETE" });
}

/** POST /api/channels/kiotviet/bulk-delete — delete one or more KiotViet channels. */
export async function bulkDeleteKiotVietChannels(ids: number[]): Promise<BulkDeleteResult> {
  return fetchJson("/api/channels/kiotviet/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}
