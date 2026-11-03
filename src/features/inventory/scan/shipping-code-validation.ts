/**
 * Validate FORMAT mã vận đơn trước khi tra đơn / ghi nhận khi quét ở kho.
 *
 * Không whitelist theo DVVC: dữ liệu thật cho thấy hàng trăm prefix hợp lệ
 * (SPX/SPE Shopee Express, BES BEST, GHN + mã 8 ký tự G8x/GAx, JNT J&T, LMP,
 * VN*, số 12–15 chữ số…) và cột `shipping_provider` rỗng nên không thể phân
 * loại chắc chắn. Whitelist cứng sẽ loại nhầm mã của DVVC mới.
 *
 * Thay vào đó chỉ chặn những gì một lần QUÉT NHẦM thực sự tạo ra:
 *  - ký tự lạ (khoảng trắng, dấu câu, ký tự QR chứa URL/JSON)
 *  - độ dài bất thường (data thật: 6 → 25; ta nới biên 6–30)
 * Mã toàn số trùng EAN sản phẩm vẫn qua được — không phân biệt được bằng
 * format, và tra đơn sẽ 404 xử lý tiếp, không phải việc của validator.
 *
 * Riêng GHN: tem HOÀN in mã kèm "_" ở đằng sau — hậu tố "_PR", "_..." hay chỉ
 * "_" cụt cuối mã (vd "L8XYZ123_PR", "L8XYZ123_") → "_" hợp lệ trong thân mã
 * VÀ ở cuối mã, giữ NGUYÊN mã khi tra/ghi nhận (không cắt hậu tố).
 */

// 6–30 ký tự, chỉ chữ/số/gạch ngang/gạch dưới; đầu mã phải là chữ-số, cuối mã
// là chữ-số hoặc "_" (GHN); gạch ngang vẫn không được ở biên.
const SHIPPING_CODE_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{4,28}[A-Za-z0-9_]$/;

export type ShippingCodeValidation = { ok: true; code: string } | { ok: false; message: string };

/** Chuẩn hoá + kiểm tra format mã vận đơn. Trả về mã đã trim khi hợp lệ. */
export function validateShippingCode(raw: string): ShippingCodeValidation {
  const code = raw.trim();
  if (!code) return { ok: false, message: "Mã vận đơn trống." };
  if (!SHIPPING_CODE_RE.test(code)) {
    return {
      ok: false,
      message: `Mã "${code}" không hợp lệ — kiểm tra lại tem/thiết bị quét.`,
    };
  }
  return { ok: true, code };
}

/** Tiện dùng cho nơi chỉ cần boolean. */
export function isValidShippingCode(raw: string): boolean {
  return validateShippingCode(raw).ok;
}
