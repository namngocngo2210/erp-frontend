// Logic hiển thị thuần (không JSX) cho dòng mã chờ khớp trên trang Lịch sử
// nhập xuất — tách khỏi component để test được.

export type PendingBadgeStyle = { text: string; cls: string };

const PENDING_BADGE: Record<string, PendingBadgeStyle> = {
  failed: { text: "Lỗi khớp", cls: "bg-action-danger/10 text-action-danger" },
  invalid: { text: "Mã không đúng", cls: "bg-gray-200 text-gray-600" },
  matched: { text: "Đã khớp", cls: "bg-action-success/10 text-action-success" },
};

const DEFAULT_BADGE: PendingBadgeStyle = {
  text: "Chờ khớp",
  cls: "bg-action-warning/10 text-action-warning",
};

export function pendingBadge(status: string): PendingBadgeStyle {
  return PENDING_BADGE[status] ?? DEFAULT_BADGE;
}

export type PendingTimeSource = { iso: string; kind: "matched" | "scanned" };

/**
 * Mốc thời gian hiển thị cho 1 dòng chờ khớp:
 * - đã khớp (status=matched) và có matched_at → THỜI ĐIỂM KHỚP.
 * - còn lại (hoặc matched thiếu matched_at) → lúc quét (created_at).
 */
export function pendingRowTimestamp(item: {
  status: string;
  created_at: string;
  matched_at: string | null;
}): PendingTimeSource {
  if (item.status === "matched" && item.matched_at) {
    return { iso: item.matched_at, kind: "matched" };
  }
  return { iso: item.created_at, kind: "scanned" };
}
