/**
 * Khóa tab + danh sách tab cho trang Orders/Landing/KOC.
 * Tách khỏi OrdersPage.tsx để file component chỉ export component
 * (React Fast Refresh) — consts dùng chung với src/app/orders-tab.ts.
 */

export type LandingTabKey =
  | "orders"
  | "summary"
  | "sheet1"
  | "sheet2"
  | "sheet3"
  | "delivered"
  | "cancelled"
  | "blocklist";

// Tab cho trang Orders thường + KOC (giữ nguyên).
export const LANDING_TABS: Array<{ key: LandingTabKey; label: string }> = [
  { key: "orders", label: "Đơn hàng sale" },
  { key: "delivered", label: "Giao thành công" },
  { key: "cancelled", label: "Đã hủy" },
  { key: "blocklist", label: "Danh sách blocklist" },
];

/** Nhãn 3 sheet của trang Landing — nguồn duy nhất, dùng chung với báo cáo sale
 * Nhóm 10 để hai chỗ không lệch chữ. */
export const SHEET_LABELS = {
  sheet1: "Landing xác nhận đơn",
  sheet2: "Messenger xác nhận đơn",
  sheet3: "Tư vấn",
} as const;

export type SheetKey = keyof typeof SHEET_LABELS;

// Tab riêng cho trang Landing: 3 sheet thay tab "Đơn hàng sale".
export const LANDING_SHEET_TABS: Array<{ key: LandingTabKey; label: string }> = [
  { key: "summary", label: "Tổng hợp" },
  { key: "sheet1", label: SHEET_LABELS.sheet1 },
  { key: "sheet2", label: SHEET_LABELS.sheet2 },
  { key: "sheet3", label: SHEET_LABELS.sheet3 },
  { key: "delivered", label: "Giao thành công" },
  { key: "cancelled", label: "Đã hủy" },
  { key: "blocklist", label: "Danh sách blocklist" },
];
