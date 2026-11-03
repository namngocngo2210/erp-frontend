export type ScanRowResult = {
  ok: boolean;
  /** Mã PHIẾU NGÀY mà đơn hoàn được thêm vào (nhóm đơn không còn mã riêng). */
  noteCode?: string;
  posted?: boolean;
  error?: string;
};

/** Đánh dấu dòng đã ghi nhận chờ khớp (chưa vào phiếu ngày nào). */
export const PENDING_NOTE_CODE = "chờ khớp";

/**
 * Nhãn kết quả cho 1 dòng quét (đã ghi sổ vào phiếu ngày / chờ khớp / lỗi).
 * Chỉ là câu chữ — dấu ✓/✗ do `ScanResultLabel` vẽ bằng icon theo `res.ok`.
 */
export function scanRowResultLabel(res: ScanRowResult): string {
  if (!res.ok) return res.error ?? "lỗi";
  if (res.noteCode === PENDING_NOTE_CODE) return "Đã ghi nhận — chờ khớp";
  if (res.posted) return `Đã ghi sổ vào phiếu ${res.noteCode}`;
  return `Đã thêm vào phiếu ${res.noteCode}`;
}

/** Câu toast tóm tắt sau khi Xác nhận cả đợt — nêu mã phiếu ngày nhận các đơn hoàn. */
export function scanConfirmSummary(
  createdCount: number,
  pendingCount: number,
  failedCount: number,
  noteCode?: string,
): string {
  const target = noteCode ? ` vào phiếu ${noteCode}` : "";
  const failSuffix = failedCount > 0 ? ` — ${failedCount} lỗi` : "";
  return `Đã ghi sổ ${createdCount} đơn hoàn${target} — ${pendingCount} mã chờ khớp${failSuffix}`;
}

/**
 * Mức độ toast cho câu tóm tắt — có dòng lỗi thì KHÔNG được hiện xanh (thành công)
 * như trước: mọi dòng lỗi → "error"; có dòng lỗi lẫn dòng thành công → "warning".
 */
export function scanConfirmToastLevel(
  createdCount: number,
  pendingCount: number,
  failedCount: number,
): "success" | "warning" | "error" {
  if (failedCount === 0) return "success";
  return createdCount + pendingCount === 0 ? "error" : "warning";
}
