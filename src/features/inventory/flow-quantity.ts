/**
 * Số lượng hiển thị ở màn Lịch sử nhập xuất — LUÔN dương, không bao giờ là 0.
 *
 * Sổ kho tính theo `net` (đã xuất − đã hoàn/chuyển sổ) và net là con số đúng để
 * đối chiếu tồn. Nhưng vận hành đọc bảng này để biết "đơn/phiếu này xuất bao
 * nhiêu cái": đơn bị huỷ đã chuyển sổ sang đơn xuất lại `<mã>.NN` có net = 0 —
 * hiện số 0 thì người nhìn tưởng không xuất gì, trong khi hàng đã rời kho thật.
 * Những dòng đó rơi về `gross` (SL đã từng rời kho, chưa trừ phần đảo).
 *
 * `Math.abs` là chốt chặn cuối cho dữ liệu lệch (đảo nhiều hơn xuất — không nên
 * xảy ra nhưng đã từng có trên prod): sai số vẫn hiện, chỉ là không hiện dấu âm.
 * `gross` optional để chịu được payload của backend cũ lúc rolling deploy.
 */
export function displayQty(net: number, gross?: number | null): number {
  return Math.abs(net) || Math.abs(gross ?? 0);
}

/**
 * Ô "Mã vận đơn" của dòng đơn đã xuất: mã trên đơn + mã kho THỰC QUÉT (nếu
 * khác — kiện bảo hành gửi lại bằng vận đơn mới rồi khớp tay, ca prod
 * 84859795173645). Cùng cách ghép `"; "` với file Excel để hai bên tra được
 * cùng một mã. `scan_codes` optional để chịu payload backend cũ lúc rolling deploy.
 */
export function shippingCodeLabel(row: {
  shipping_code?: string | null;
  scan_codes?: string[] | null;
}): string {
  return [row.shipping_code, ...(row.scan_codes ?? [])].filter(Boolean).join("; ") || "—";
}
