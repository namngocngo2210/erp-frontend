/**
 * Bộ tuỳ chọn số dòng/trang dùng chung (audit 2026-09-23 P2-2: 8 khai báo /
 * 6 bộ giá trị rải khắp feature → 3 preset đặt tên). Trang đơn hàng giữ bộ riêng
 * `ORDERS_PAGE_SIZE_OPTIONS` (25/50/100/200) vì đó là quyết định UX có chủ đích.
 */
export const PAGE_SIZE_OPTIONS_COMPACT = [10, 20, 50] as const;
export const PAGE_SIZE_OPTIONS_STANDARD = [10, 20, 50, 100] as const;
export const PAGE_SIZE_OPTIONS_WIDE = [20, 50, 100, 200] as const;
