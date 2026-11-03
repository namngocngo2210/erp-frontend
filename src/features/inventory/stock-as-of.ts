/**
 * Helper ngày cho chế độ "xem tồn đến ngày".
 *
 * Cố ý KHÔNG dùng `toISOString()`: hàm đó quy về UTC, và VN là UTC+7 nên nó
 * TRỪ 7 giờ khỏi giờ địa phương trước khi cắt chuỗi ngày. Ngày chỉ lệch ở
 * RẠNG SÁNG: 00:30 giờ VN ngày 05 → 17:30 UTC ngày 04, `toISOString().slice(0,
 * 10)` ra "2026-08-04" — lùi một ngày. (23:30 ngày 05 → 16:30 UTC CÙNG ngày
 * 05, không lệch — bẫy chỉ nằm ở nửa đêm về sáng, không phải buổi tối.) Đọc
 * bằng getter địa phương là cách duy nhất khớp với `timezone.localdate()` ở
 * backend.
 */
export function toIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Mốc đã chọn có nằm TRƯỚC hôm nay không. Chuỗi `YYYY-MM-DD` so sánh được trực tiếp. */
export function isPastDate(iso: string, todayIso: string): boolean {
  return iso !== "" && iso < todayIso;
}
