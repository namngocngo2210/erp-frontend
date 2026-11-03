/**
 * Chuẩn hoá SĐT — MỘT nơi cho cả app (audit 2026-09-23 P2-2 gom 3 bản rải ở
 * warranty-portal/phone.ts, orders/order-normalizers.ts, order-form-helpers.ts).
 * Ba hàm vì ba mục đích khác nhau, KHÔNG gộp làm một:
 * - `normalizePhone`      — chuẩn hoá + validate số VN, trả "" nếu không hợp lệ
 *                           (mirror `apps.customers.phone_utils.normalize_phone`).
 * - `normalizePhoneLoose` — chỉ bỏ ký tự lạ + đổi "84…" → "0…", KHÔNG validate:
 *                           dùng khi tra cứu khách lúc đang gõ trong form đơn.
 * - `phoneDigits`         — chỉ giữ chữ số: khoá so khớp/lọc, không suy diễn gì.
 */

/** Chỉ giữ chữ số (khoá so khớp customer.phone_raw, lọc theo SĐT). */
export function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Chữ số + đổi tiền tố quốc gia "84" (≥ 11 số) thành "0"; không validate. */
export function normalizePhoneLoose(value: string): string {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("84") && digits.length >= 11) {
    return `0${digits.slice(2)}`;
  }
  return digits;
}

/**
 * Chuẩn hoá SĐT — mirror `apps.customers.phone_utils.normalize_phone` (backend).
 * Chỉ bỏ ký tự không phải số rồi validate là KHÔNG đủ: `+84901234567`
 * → `84901234567` trượt regex `^0\d{9,10}$` dù là số hợp lệ.
 *
 * Trả "" khi không phải số VN hợp lệ (10–11 số bắt đầu bằng 0).
 */
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D+/g, "");
  if (!digits) return "";

  if (digits.startsWith("0084")) {
    digits = digits.slice(4);
  } else if (digits.startsWith("84") && digits.length >= 11) {
    // Chỉ coi "84" đầu là mã quốc gia khi tổng độ dài khớp số quốc tế đầy đủ
    // ("84" + 9-10 số nội địa) — tránh cắt nhầm số nội địa "084..." gõ thiếu 0.
    digits = digits.slice(2);
  }

  let normalized: string;
  if (digits.startsWith("0")) {
    normalized = digits;
  } else if (digits.length === 9) {
    normalized = `0${digits}`;
  } else if (digits.length === 10 && digits.startsWith("2")) {
    normalized = `0${digits}`;
  } else {
    normalized = digits;
  }

  return /^0\d{9,10}$/.test(normalized) ? normalized : "";
}
