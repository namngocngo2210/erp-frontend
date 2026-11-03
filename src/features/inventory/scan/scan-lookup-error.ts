/**
 * Map lỗi của `GET /api/orders/lookup-by-shipping-code?mode=dispatch` sang câu
 * tiếng Việt cho nhân viên kho.
 *
 * Backend trả MÃ NGHIỆP VỤ trong `detail` ("order_cancelled" / "verify_unavailable"),
 * nên KHÔNG được suy ra nguyên nhân chỉ từ HTTP status: nginx/gateway cũng trả 503
 * khi backend chết, và proxy có thể trả 409 vì lý do khác. Chỉ khi `detail` khớp mã
 * nghiệp vụ mới hiện câu chuyên biệt; còn lại trả `null` để caller hiện lỗi chung.
 */

export const LOOKUP_ERROR_ORDER_CANCELLED = "order_cancelled";
export const LOOKUP_ERROR_VERIFY_UNAVAILABLE = "verify_unavailable";
export const LOOKUP_ERROR_RETURN_ALREADY_SCANNED = "return_already_scanned";

export type LookupErrorBody = {
  detail?: unknown;
  order_code?: unknown;
  note_code?: unknown;
} | null;

/** Câu tiếng Việt cho lỗi nghiệp vụ, hoặc `null` nếu không phải lỗi nghiệp vụ đã biết. */
export function dispatchLookupErrorMessage(
  status: number | undefined,
  body: LookupErrorBody | undefined,
  code: string,
): string | null {
  const detail = typeof body?.detail === "string" ? body.detail : "";
  if (status === 409 && detail === LOOKUP_ERROR_ORDER_CANCELLED) {
    const orderCode =
      typeof body?.order_code === "string" && body.order_code ? body.order_code : code;
    return `Đơn ${orderCode} đã hủy — không thể xuất kho.`;
  }
  if (status === 503 && detail === LOOKUP_ERROR_VERIFY_UNAVAILABLE) {
    return `Chưa xác minh được đơn của mã ${code} với KiotViet — chưa cho xuất kho. Thử quét lại.`;
  }
  return null;
}

/**
 * Câu tiếng Việt cho lỗi "mã đã bắn nhập hoàn rồi" (`mode=return_scan`), hoặc
 * `null` nếu không phải lỗi đó.
 *
 * Câu chữ phải NÓI RÕ đường thoát — nhân viên kho cần biết muốn bắn lại thì làm
 * gì, chứ không chỉ biết là bị chặn. `note_code` rỗng nghĩa là mã mới bắn, chưa
 * ra phiếu (đang chờ khớp đơn).
 */
export function returnScanLookupErrorMessage(
  status: number | undefined,
  body: LookupErrorBody | undefined,
  code: string,
): string | null {
  const detail = typeof body?.detail === "string" ? body.detail : "";
  if (status !== 409 || detail !== LOOKUP_ERROR_RETURN_ALREADY_SCANNED) return null;
  const noteCode = typeof body?.note_code === "string" ? body.note_code : "";
  const where = noteCode ? `ở phiếu ${noteCode}` : "(đang chờ khớp đơn)";
  return `Mã ${code} đã nhập hoàn ${where} — huỷ lần bắn trước nếu muốn bắn lại.`;
}
