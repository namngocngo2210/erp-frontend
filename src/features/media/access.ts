import type { MediaRole } from "@/lib/api/media";

export type { MediaRole };

/** Cùng chuỗi với backend `apps.media.domain.roles.Action`. */
export const MEDIA_ACTIONS = [
  "read",
  "content.create",
  "content.edit_upload",
  "content.edit_marketing",
  "content.delete",
  "video.cache_force",
  "evaluation.write",
  "taxonomy.write",
  "taxonomy.write_sources",
  "taxonomy.include_inactive",
  "proposal.create",
  "proposal.edit",
  "proposal.delete",
] as const;
export type MediaAction = (typeof MEDIA_ACTIONS)[number];

const VIEWER: readonly MediaAction[] = ["read", "proposal.create", "proposal.edit"];
const MATRIX: Record<MediaRole, ReadonlySet<MediaAction>> = {
  viewer: new Set(VIEWER),
  marketing: new Set([...VIEWER, "content.edit_marketing", "evaluation.write"]),
  uploader: new Set([
    ...VIEWER,
    "content.create",
    "content.edit_upload",
    "content.edit_marketing",
    "taxonomy.write_sources",
  ]),
  admin: new Set(MEDIA_ACTIONS),
};

/**
 * Ẩn/hiện nút theo role Media. Chỉ là UX: các action giới hạn "chủ sở hữu" (uploader
 * sửa nội dung, viewer/marketing sửa đề xuất) vẫn hiện nút — backend/ads-crm quyết
 * định và frontend hiện toast lỗi.
 */
export function mediaCan(role: MediaRole | null | undefined, action: MediaAction): boolean {
  if (!role) return false;
  return MATRIX[role]?.has(action) ?? false;
}
