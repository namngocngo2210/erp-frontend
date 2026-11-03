import type { DispatchResult, LookupOrder } from "./scan-types";

export type DispatchScanCheck = "ok" | "duplicate" | "already-dispatched";

/**
 * Đánh giá 1 mã vừa quét trước khi thêm vào danh sách xuất kho.
 * - "duplicate": đơn đã có trong phiên quét hiện tại (ưu tiên cao nhất).
 * - "already-dispatched": đơn đã xuất kho từ trước (backend đánh dấu qua lookup).
 * - "ok": có thể thêm.
 */
export function checkDispatchScan(scanned: LookupOrder[], order: LookupOrder): DispatchScanCheck {
  if (scanned.some((s) => s.order_id === order.order_id)) return "duplicate";
  if (order.already_dispatched) return "already-dispatched";
  return "ok";
}

export type DispatchBadge = { text: string; tone: "ok" | "warn" | "error" };

/**
 * Mã lỗi máy từ `POST /api/orders/dispatch-batch` → câu tiếng Việt cho nhân viên kho.
 * Mã lạ (chưa map) trả nguyên văn để không nuốt thông tin lỗi.
 */
export function dispatchErrorMessage(error: string | undefined): string {
  if (error === "order_cancelled") return "Đơn đã hủy — không thể xuất kho";
  if (error === "verify_unavailable") {
    return "Chưa xác minh được với KiotViet — chưa cho xuất kho, thử lại";
  }
  return error ?? "lỗi";
}

/**
 * Nhãn trạng thái xuất kho cho 1 dòng kết quả, có surface cảnh báo already_dispatched.
 * Icon (✓ / ⚠ / ✗) do `ScanResultLabel` vẽ theo `tone`.
 */
export function dispatchResultBadge(r: DispatchResult): DispatchBadge {
  if (!r.ok) return { text: dispatchErrorMessage(r.error), tone: "error" };
  if (r.warnings?.includes("already_dispatched")) {
    return { text: "Đã xuất kho trước đó", tone: "warn" };
  }
  return { text: "Đã xuất", tone: "ok" };
}

export type ScanDispatchRow =
  | { kind: "matched"; code: string; order: LookupOrder }
  | { kind: "unmatched"; code: string };

export type DispatchRowAddResult = "added" | "duplicate" | "already-dispatched";

/**
 * Thêm mã vừa quét vào đầu danh sách xuất kho (matched hoặc unmatched).
 * - "duplicate": trùng `code` đã có trong danh sách, hoặc (khi có `order`) trùng `order_id`
 *   của 1 dòng matched đã quét — ưu tiên cao nhất.
 * - "already-dispatched": đơn đã xuất kho từ trước (backend đánh dấu qua lookup) — không thêm.
 * - "added": đã prepend dòng mới (matched nếu có `order`, unmatched nếu `order` null).
 */
export function addDispatchScanRow(
  rows: ScanDispatchRow[],
  code: string,
  order: LookupOrder | null,
): { rows: ScanDispatchRow[]; result: DispatchRowAddResult } {
  const duplicate = rows.some(
    (r) =>
      r.code === code ||
      (order !== null && r.kind === "matched" && r.order.order_id === order.order_id),
  );
  if (duplicate) return { rows, result: "duplicate" };
  if (order?.already_dispatched) return { rows, result: "already-dispatched" };
  const row: ScanDispatchRow = order
    ? { kind: "matched", code, order }
    : { kind: "unmatched", code };
  return { rows: [row, ...rows], result: "added" };
}
