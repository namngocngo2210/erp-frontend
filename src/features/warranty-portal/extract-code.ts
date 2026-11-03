/**
 * Trích mã bảo hành 8 ký tự từ chuỗi camera quét được.
 *
 * Tem in QR chứa URL dạng `http://qcheck.vn/<CODE>` (xem
 * `apps.warranty_codes.application.services.export_service`). Backend KHÔNG
 * bóc URL — `activation_service.normalize_keyword` chỉ strip + upper — nên
 * gửi nguyên URL sẽ trả `not_found`. Việc tách mã phải làm ở client.
 *
 * Không nuốt lỗi im lặng: nếu kết quả không đúng độ dài mã, trả về nguyên
 * (rỗng hoặc chuỗi khác độ dài) để form tự validate và báo lỗi như hiện có.
 */
export function extractWarrantyCode(raw: string): string {
  const trimmed = raw.trim();
  let candidate = trimmed;

  try {
    const url = new URL(trimmed);
    if (url.protocol === "http:" || url.protocol === "https:") {
      const segments = url.pathname.split("/").filter(Boolean);
      candidate = segments.length > 0 ? segments[segments.length - 1] : "";
    }
  } catch {
    // Không phải URL hợp lệ → dùng nguyên chuỗi đã trim.
  }

  return candidate
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}
