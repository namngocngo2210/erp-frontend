import { DEPARTMENT_ID } from "@/lib/constants/departments";

export type AppSection =
  | "orders"
  | "landing-orders"
  | "koc-orders"
  | "contacts"
  | "floating-pool"
  | "customers"
  | "customer-explorer"
  | "loyal-customers"
  | "resale-tracking"
  | "warranty"
  | "warranty-codes"
  | "address-lookup"
  | "dashboard"
  | "ads-report"
  | "overview-report"
  | "foxia-report"
  | "call-quality"
  | "channels"
  | "kiotviet"
  | "foxia-link"
  | "pancake"
  | "pancake-leads"
  | "pancake-pos"
  | "system-settings"
  | "facebook-ads"
  | "google-ads"
  | "users"
  | "lead-assignment"
  | "roles"
  | "departments"
  | "products"
  | "product-categories"
  | "warehouses"
  | "shipments"
  | "stock"
  | "dispatch-history"
  | "stock-documents"
  | "returns"
  | "audit"
  | "employees"
  | "leave"
  | "attendance-locations"
  | "attendance-history"
  | "compensation"
  | "contact_flow"
  | "media-explore"
  | "media-contents"
  | "media-proposals"
  | "media-reports"
  | "media-taxonomy"
  | "media-settings";

/** Sub-view trong section orders */
export type OrdersView = { type: "list" } | { type: "detail"; orderId: number };

const SECTION_TO_PATH: Record<AppSection, string> = {
  orders: "/sales/orders",
  "landing-orders": "/sales/landing-orders",
  "koc-orders": "/sales/koc-orders",
  contacts: "/sales/contacts",
  "floating-pool": "/sales/floating-pool",
  customers: "/crm/customers",
  "loyal-customers": "/crm/loyal-customers",
  "resale-tracking": "/sales/resale-tracking",
  warranty: "/aftersales/warranty",
  "warranty-codes": "/aftersales/warranty-codes",
  "address-lookup": "/utilities/address-lookup",
  "customer-explorer": "/reports/customer-explorer",
  products: "/catalog/products",
  "product-categories": "/catalog/product-categories",
  warehouses: "/inventory/warehouses",
  shipments: "/inventory/shipments",
  stock: "/inventory/stock",
  "dispatch-history": "/inventory/dispatch-history",
  "stock-documents": "/inventory/stock-documents",
  returns: "/inventory/returns",
  kiotviet: "/settings/kiotviet",
  "foxia-link": "/settings/foxia-link",
  pancake: "/settings/pancake",
  "pancake-leads": "/sales/pancake-leads",
  "pancake-pos": "/settings/pancake-pos",
  "system-settings": "/settings/system-settings",
  "facebook-ads": "/marketing/facebook-ads",
  "google-ads": "/marketing/google-ads",
  channels: "/settings/channels",
  "ads-report": "/reports/ads-report",
  "overview-report": "/reports/overview-report",
  "foxia-report": "/reports/foxia",
  "call-quality": "/reports/call-quality",
  dashboard: "/reports/dashboard",
  users: "/settings/users",
  "lead-assignment": "/settings/lead-assignment",
  roles: "/settings/roles",
  departments: "/hr/departments",
  audit: "/settings/audit",
  employees: "/hr/employees",
  leave: "/hr/leave",
  "attendance-locations": "/settings/attendance-locations",
  "attendance-history": "/hr/attendance-history",
  compensation: "/hr/compensation",
  contact_flow: "/settings/contact-flow",
  "media-explore": "/media/explore",
  "media-contents": "/media/contents",
  "media-proposals": "/media/proposals",
  "media-reports": "/media/reports",
  "media-taxonomy": "/media/taxonomy",
  "media-settings": "/settings/media",
};

export function pathFromSection(section: AppSection): string {
  return SECTION_TO_PATH[section];
}

/**
 * /sales/orders/123 → { type: "detail", orderId: 123 }
 * Cũng nhận /sales/landing-orders/:id và /sales/koc-orders/:id để giữ chế độ detail (drawer
 * trên trang landing) và kích hoạt fetch standaloneOrder theo `ordersView`.
 */
export function parseOrdersView(pathname: string): OrdersView {
  const match = pathname.match(/^\/sales\/(?:orders|landing-orders|koc-orders)\/(\d+)\/?$/i);
  if (match) {
    const orderId = parseInt(match[1], 10);
    if (Number.isFinite(orderId) && orderId > 0) {
      return { type: "detail", orderId };
    }
  }
  return { type: "list" };
}

/** Path URL cho trang chi tiết đơn hàng (full-page, section orders/koc) */
export function orderDetailPath(orderId: number): string {
  return `/sales/orders/${orderId}`;
}

/** Path URL chi tiết đơn trên trang landing (drawer, giữ list landing phía sau) */
export function landingOrderDetailPath(orderId: number): string {
  return `/sales/landing-orders/${orderId}`;
}

/** Path URL chi tiết đơn KOC/KOL (full-page, giữ section koc để back về /sales/koc-orders) */
export function kocOrderDetailPath(orderId: number): string {
  return `/sales/koc-orders/${orderId}`;
}

export function sectionFromPath(pathname: string): AppSection {
  const normalized = pathname.toLowerCase().replace(/\/+$/, "") || "/";
  // Xử lý nested detail paths: /sales/landing-orders trước /sales/orders để không bị match nhầm
  if (/^\/sales\/landing-orders(\/|$)/.test(normalized)) return "landing-orders";
  if (/^\/sales\/koc-orders(\/|$)/.test(normalized)) return "koc-orders";
  if (/^\/sales\/orders(\/|$)/.test(normalized)) return "orders";
  // `/catalog/products/:id/content` là route CON của trang Sản phẩm. Không có
  // dòng này thì nó rơi xuống fallback "orders" ở cuối hàm, kéo theo hai hậu quả:
  // sidebar tô sáng nhầm module Đơn hàng, và `RootLayout` coi đây là route
  // "orders-like" nên `<main>` dùng khung AG Grid (`overflow-hidden`) — nội dung
  // trang cao 8000px+ bị cắt ở chiều cao viewport và KHÔNG cuộn được.
  //
  // Cố ý chỉ thêm cho `/catalog/products`, không đổi fallback thành so khớp
  // tiền tố chung: các route con khác (`/hr/employees/:id`,
  // `/sales/warranty/:claimId`, `/aftersales/warranty/:claimId`) đang dựa vào
  // đúng khung "orders-like" đó cộng với `h-full` của chính chúng để cuộn nội
  // bộ. Đổi phân loại hàng loạt sẽ làm hỏng những trang đang chạy tốt.
  if (/^\/catalog\/products(\/|$)/.test(normalized)) return "products";
  // Chi tiết nội dung Media `/media/contents/:id` là route con của Thư viện nội dung.
  if (/^\/media\/contents(\/|$)/.test(normalized)) return "media-contents";
  const match = Object.entries(SECTION_TO_PATH).find(([, path]) => path === normalized);
  if (match) return match[0] as AppSection;
  return "orders";
}

/**
 * Section có trang tự quản lý chiều cao (`flex h-full min-h-0 flex-col` + cuộn nội bộ).
 *
 * `RootLayout` cho các section này khung `overflow-hidden flex flex-col`; phần còn
 * lại đi luồng thường (`overflow-y-auto` + bọc một `<div>` cao `auto`).
 *
 * BẮT BUỘC khai ở đây mọi trang mở đầu bằng `h-full`: `height: 100%` nằm trong cha
 * cao `auto` KHÔNG phân giải được, nó rơi về `auto`, kéo theo mọi `flex-1` /
 * `min-h-0` / `overflow-y-auto` bên dưới mất tác dụng — panel thôi tự cuộn mà nở
 * theo nội dung, để lại vùng trống lớn dưới thẻ. Lỗi câm, không có cảnh báo nào.
 *
 * Nhiều trang `h-full` khác (chi tiết bảo hành `/aftersales/warranty/:claimId`,
 * blocklist là tab trong orders) vô tình đúng vì rơi vào fallback "orders" ở
 * `sectionFromPath`. Trang Phân quyền thì không: `/settings/roles` khớp CHÍNH XÁC
 * trong `SECTION_TO_PATH` nên trả về "roles" — đó là lý do phải khai tường minh.
 */
const FULL_HEIGHT_SECTIONS = new Set<AppSection>([
  "orders",
  "landing-orders",
  "koc-orders",
  "roles",
  "customer-explorer",
]);

export function isFullHeightSection(section: AppSection): boolean {
  return FULL_HEIGHT_SECTIONS.has(section);
}

/** Path phẳng cũ → path nested mới (redirect tương thích bookmark / deep-link). */
export const LEGACY_PATH_REDIRECTS: Array<{ from: string; to: string }> = [
  { from: "/orders", to: "/sales/orders" },
  { from: "/landing-orders", to: "/sales/landing-orders" },
  { from: "/koc-orders", to: "/sales/koc-orders" },
  { from: "/customers", to: "/crm/customers" },
  { from: "/loyal-customers", to: "/crm/loyal-customers" },
  { from: "/resale-tracking", to: "/sales/resale-tracking" },
  { from: "/products", to: "/catalog/products" },
  { from: "/product-categories", to: "/catalog/product-categories" },
  { from: "/warehouses", to: "/inventory/warehouses" },
  { from: "/kiotviet", to: "/settings/kiotviet" },
  { from: "/facebook-ads", to: "/marketing/facebook-ads" },
  { from: "/google-ads", to: "/marketing/google-ads" },
  { from: "/channels", to: "/settings/channels" },
  { from: "/ads-report", to: "/reports/ads-report" },
  { from: "/dashboard", to: "/reports/dashboard" },
  { from: "/users", to: "/settings/users" },
  { from: "/departments", to: "/hr/departments" },
  // Phòng ban đã chuyển từ Quản trị sang Nhân sự — giữ redirect cho bookmark cũ.
  { from: "/settings/departments", to: "/hr/departments" },
  { from: "/audit-logs", to: "/settings/audit" },
];

/**
 * Section mặc định khi vào app (route index "/" và fallback "*").
 * Nhân viên phòng Booking làm việc trên đơn KOC/KOL nên mặc định vào /koc-orders;
 * các phòng còn lại giữ /orders như cũ.
 *
 * Trả `undefined` khi user KHÔNG có quyền vào cả hai — mọi đích redirect đều
 * phải là trang user thực sự vào được, nếu không guard sẽ đá ngược lại "/" và
 * sinh vòng lặp điều hướng (xem `landingSectionFor` trong app/route-guards).
 */
export function defaultSectionForUser(user: {
  department?: { id: number } | null;
  allowed_sections?: string[];
}): AppSection | undefined {
  const allowed = user.allowed_sections;
  const can = (section: AppSection) => !allowed || allowed.includes(section);
  if (user.department?.id === DEPARTMENT_ID.BOOKING && can("koc-orders")) {
    return "koc-orders";
  }
  return can("orders") ? "orders" : undefined;
}

/**
 * Một số section dùng chung quyền của section khác. Giá trị là KEY quyền trong
 * `allowed_sections` — không nhất thiết là một AppSection có route (vd `salaries`
 * là section RBAC thuần, không có trang riêng).
 */
const SECTION_PERMISSION: Partial<Record<AppSection, string>> = {
  // Trang Lịch sử xuất kho dùng chung quyền với section Tồn kho (stock).
  "dispatch-history": "stock",
  // Trang quản lý phòng ban dùng chung quyền với trang Người dùng (admin).
  departments: "users",
  // Trang quản trị vai trò & quyền dùng chung quyền với trang Người dùng (admin).
  roles: "users",
  // Trang Nghỉ phép dùng chung quyền với section employees (không có RBAC section riêng).
  leave: "employees",
  // Trang Vị trí chấm công dùng chung quyền với section employees (không có RBAC section riêng).
  "attendance-locations": "employees",
  // Trang Lịch sử chấm công dùng chung quyền với section employees (không có RBAC section riêng).
  "attendance-history": "employees",
  // Trang Cơ chế lương hiển thị + sửa LƯƠNG → gate bằng section `salaries` (nhạy cảm,
  // chỉ admin/kế toán), KHÔNG dùng `employees` vốn cấp rộng cho HCNS (audit 2026-07-14).
  compensation: "salaries",
  // Trang Kết nối Media dùng chung quyền admin `users`.
  "media-settings": "users",
};

/** Section key cần kiểm tra trong allowed_sections cho một section. */
export function requiredPermissionFor(section: AppSection): string {
  return SECTION_PERMISSION[section] ?? section;
}
