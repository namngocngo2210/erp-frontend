/**
 * Bảng màu thương hiệu Delax dùng riêng cho warranty-portal (mặt tiền khách hàng
 * cuối quét QR trên tem sản phẩm). Tách khỏi token `--primary` xanh dương của
 * app quản trị nội bộ — đây là giao diện khách nhìn thấy trực tiếp, phải theo
 * đúng màu logo (teal → xanh lá).
 *
 * Định nghĩa MỘT nơi duy nhất, áp bằng inline `style` (Tailwind JIT không thể
 * tĩnh hoá class arbitrary value dựng từ biến JS runtime, vd `bg-[${hex}]` sẽ
 * không được scan ra CSS) — tránh rải hex khắp các component.
 */
export const PORTAL_COLOR = {
  /** Teal sâu — chủ đạo, nền thẻ bảo hành, chữ tiêu đề */
  tealDeep: "#12615C",
  /** Xanh lá thương hiệu — điểm nhấn, đầu gradient */
  green: "#3FA95B",
  /** Mint nền trang */
  mint: "#EEF7F2",
  /** Trắng bề mặt thẻ */
  white: "#FFFFFF",
  /** Xám chữ phụ */
  grayText: "#5F7671",
  /** Đỏ cảnh báo — hết hạn / lỗi */
  redAlert: "#C2453D",
} as const;

/** Gradient chính của thương hiệu — thẻ bảo hành còn hạn, CTA kích hoạt. */
export const PORTAL_GRADIENT = `linear-gradient(135deg, ${PORTAL_COLOR.tealDeep} 0%, ${PORTAL_COLOR.green} 100%)`;

/** Thẻ bảo hành hết hạn: xám-đỏ trầm, tách biệt rõ với thẻ còn hạn. */
export const PORTAL_GRADIENT_EXPIRED = "linear-gradient(135deg, #52525b 0%, #7a2e28 100%)";
