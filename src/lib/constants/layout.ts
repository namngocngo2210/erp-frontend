/**
 * Ngưỡng phân tách "màn lớn" (desktop 24–27") và "màn nhỏ" (laptop ~14").
 *
 * Khớp với breakpoint `2xl` (1536px) của Tailwind: dưới ngưỡng này coi là
 * compact → tự thu gọn sidebar (App.tsx), bảng AG Grid dày hơn
 * và tăng mật độ hiển thị toàn app qua media query trong styles.css.
 */
export const COMPACT_VIEWPORT_MAX_WIDTH = 1535.98;

/** Media query dùng cho useMediaQuery / matchMedia. */
export const COMPACT_VIEWPORT_QUERY = `(max-width: ${COMPACT_VIEWPORT_MAX_WIDTH}px)`;

/** Đọc trạng thái compact ngay lập tức (ngoài React) — dùng cho giá trị khởi tạo. */
export function isCompactViewport(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(COMPACT_VIEWPORT_QUERY).matches;
}

/*
 * Breakpoint của app — MỘT nguồn sự thật, bám thang Tailwind:
 *   - MOBILE  (<768, dưới `md`):  điện thoại — camera quét kho, bottom-nav ESS.
 *   - TABLE   (≥1024, từ `lg`):  đủ rộng để hiện bảng; dưới ngưỡng ResponsiveList
 *                               đổi sang thẻ (tablet/cửa sổ nửa màn không phải cuộn ngang).
 *   - COMPACT (<1536, dưới `2xl`): laptop — thu gọn sidebar + root 15px (ở trên).
 * Layout nhiều cột trong JSX dùng `md:`/`lg:`; `sm:` chỉ để tinh chỉnh nhỏ.
 */

/** Mép trên vùng điện thoại: ngay dưới breakpoint `md` (768px). */
export const MOBILE_MAX_WIDTH = 767.98;

/** Media query "là điện thoại" (<768px) — camera quét kho, bottom-nav ESS. */
export const MOBILE_VIEWPORT_QUERY = `(max-width: ${MOBILE_MAX_WIDTH}px)`;

/** Breakpoint `lg` (1024px): từ đây trở lên hiện bảng thay vì danh sách thẻ. */
export const TABLE_MIN_WIDTH = 1024;

/** Media query "đủ rộng để hiện bảng" — ResponsiveList và các tab tự chọn bảng/thẻ. */
export const TABLE_VIEWPORT_QUERY = `(min-width: ${TABLE_MIN_WIDTH}px)`;
