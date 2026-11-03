/**
 * Bảng route react-router cho phần app đã xác thực.
 *
 * App.tsx là cổng auth: chỉ render <RouterProvider router={router}/> khi đã đăng
 * nhập (và bọc trong <AppShellContext.Provider/>). Vì vậy bên trong router luôn
 * có user — RequireAuth ở đây chủ yếu để guard theo allowed_sections.
 *
 * Paths sử dụng cấu trúc module lồng nhau (Odoo-style):
 *   - /sales/orders, /sales/landing-orders, /sales/koc-orders
 *   - /crm/customers, /crm/loyal-customers, ...
 *   - /inventory/products, /marketing/facebook-ads, ...
 *   - /aftersales/warranty, /aftersales/warranty-codes
 *   - /utilities/address-lookup
 *   - /reports/dashboard, /reports/ads-report, /reports/customer-explorer,
 *     /settings/users, ...
 *   - /apps  → DefaultRedirect (launcher đã bỏ; điều hướng nằm trong sidebar)
 *   - /      → DefaultRedirect (nhớ module cuối dùng qua localStorage)
 * Legacy flat paths (vd /orders, /audit-logs) tự động redirect sang đường dẫn mới.
 * blocklist là TAB trong orders/koc, không có route riêng (đọc qua ?tab=).
 * /warranty là trang public, vẫn xử lý ở main.tsx.
 */

import { createBrowserRouter } from "react-router-dom";

import RootLayout from "@/app/RootLayout";
import {
  DefaultRedirect,
  Guard,
  GuardSuperuser,
  LegacyDetailRedirect,
  LoginOnly,
  RedirectTo,
} from "@/app/route-guards";
import { LEGACY_PATH_REDIRECTS } from "@/lib/routes";
import {
  AdsReportRoute,
  AttendanceCheckInRoute,
  AttendanceHistoryRoute,
  CompensationRoute,
  AttendanceLocationsRoute,
  AuditLogsRoute,
  ChannelsRoute,
  ContactFlowRoute,
  ContactsRoute,
  CustomerProfileRoute,
  CallQualityRoute,
  CustomersRoute,
  DashboardRoute,
  DepartmentsRoute,
  FoxiaLinkRoute,
  FoxiaReportRoute,
  OverviewReportRoute,
  EmployeesRoute,
  EmployeeDetailRoute,
  FacebookAdsRoute,
  FloatingPoolRoute,
  GoogleAdsRoute,
  KiotVietRoute,
  KocOrdersRoute,
  LandingOrderDetailRoute,
  LeadAssignmentRoute,
  LeaveRequestsRoute,
  LandingOrdersRoute,
  LoyalCustomersRoute,
  MediaContentsRoute,
  MediaExploreRoute,
  MediaProposalsRoute,
  MediaReportsRoute,
  MediaSettingsRoute,
  MediaTaxonomyRoute,
  OrderDetailRoute,
  OrdersRoute,
  PancakeLeadsRoute,
  PancakeSettingsRoute,
  PancakePosSettingsRoute,
  SystemSettingsRoute,
  ProductCategoriesRoute,
  ProductContentRoute,
  ProductsRoute,
  RolesRoute,
  WarehousesRoute,
  ResaleTrackingRoute,
  WarrantyClaimsRoute,
  WarrantyClaimDetailRoute,
  WarrantyCodesRoute,
  AddressLookupRoute,
  ShipmentsRoute,
  StockDocumentsRoute,
  StockRoute,
  DispatchHistoryRoute,
  UsersRoute,
} from "@/app/routed-pages";

export const router = createBrowserRouter([
  // Launcher đã ngừng dùng — điều hướng đầy đủ nằm trong sidebar. Giữ /apps để
  // link cũ không gãy: redirect về module cuối dùng / section mặc định.
  { path: "/apps", element: <DefaultRedirect /> },
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <DefaultRedirect /> },

      // /sales/orders là fallback luôn truy cập được (không guard) — mirror App.tsx,
      // nơi mọi redirect quyền đều đổ về /orders. Guard ở đây sẽ gây vòng lặp
      // Navigate cho user (giả định) không có quyền orders.
      { path: "sales/orders", element: <OrdersRoute /> },
      { path: "sales/orders/:orderId", element: <OrderDetailRoute /> },
      {
        path: "sales/landing-orders",
        element: (
          <Guard section="landing-orders">
            <LandingOrdersRoute />
          </Guard>
        ),
        // /sales/landing-orders/:orderId render drawer chi tiết đè lên list (list giữ
        // mounted nhờ Outlet) — mirror lại panel trượt phải của trang landing cũ.
        children: [{ path: ":orderId", element: <LandingOrderDetailRoute /> }],
      },
      {
        path: "sales/koc-orders",
        element: (
          <Guard section="koc-orders">
            <KocOrdersRoute />
          </Guard>
        ),
      },
      // /sales/koc-orders/:orderId mở chi tiết full-page (như /sales/orders/:id) nhưng giữ
      // section koc-orders để back quay về list KOC thay vì /sales/orders.
      {
        path: "sales/koc-orders/:orderId",
        element: (
          <Guard section="koc-orders">
            <OrderDetailRoute />
          </Guard>
        ),
      },
      {
        path: "crm/customers",
        element: (
          <Guard section="customers">
            <CustomersRoute />
          </Guard>
        ),
      },
      {
        path: "sales/contacts",
        element: (
          <Guard section="contacts">
            <ContactsRoute />
          </Guard>
        ),
      },
      {
        path: "sales/floating-pool",
        element: (
          <Guard section="floating-pool">
            <FloatingPoolRoute />
          </Guard>
        ),
      },
      {
        path: "reports/customer-explorer",
        element: (
          <Guard section="customer-explorer">
            <CustomerProfileRoute />
          </Guard>
        ),
      },
      {
        path: "crm/loyal-customers",
        element: (
          <Guard section="loyal-customers">
            <LoyalCustomersRoute />
          </Guard>
        ),
      },
      {
        path: "sales/resale-tracking",
        element: (
          <Guard section="resale-tracking">
            <ResaleTrackingRoute />
          </Guard>
        ),
      },
      {
        path: "sales/pancake-leads",
        element: (
          <Guard section="pancake-leads">
            <PancakeLeadsRoute />
          </Guard>
        ),
      },
      {
        path: "aftersales/warranty",
        element: (
          <Guard section="warranty">
            <WarrantyClaimsRoute />
          </Guard>
        ),
      },
      {
        path: "aftersales/warranty/:claimId",
        element: (
          <Guard section="warranty">
            <WarrantyClaimDetailRoute />
          </Guard>
        ),
      },
      {
        path: "aftersales/warranty-codes",
        element: (
          <Guard section="warranty-codes">
            <WarrantyCodesRoute />
          </Guard>
        ),
      },
      {
        path: "utilities/address-lookup",
        element: (
          <Guard section="address-lookup">
            <AddressLookupRoute />
          </Guard>
        ),
      },
      // Redirect path cũ (resale-tracking chuyển từ module CRM sang Sale) → vị trí mới.
      { path: "crm/resale-tracking", element: <RedirectTo to="/sales/resale-tracking" /> },
      // Redirect path cũ (warranty chuyển từ module Sale sang module Bảo hành) → vị trí mới.
      { path: "sales/warranty", element: <RedirectTo to="/aftersales/warranty" /> },
      {
        path: "sales/warranty/:claimId",
        element: <LegacyDetailRedirect base="/aftersales/warranty" param="claimId" />,
      },

      {
        path: "catalog/products",
        element: (
          <Guard section="products">
            <ProductsRoute />
          </Guard>
        ),
      },
      {
        path: "catalog/products/:id/content",
        element: (
          <Guard section="products">
            <ProductContentRoute />
          </Guard>
        ),
      },
      {
        path: "catalog/product-categories",
        element: (
          <Guard section="product-categories">
            <ProductCategoriesRoute />
          </Guard>
        ),
      },
      // Redirect path nested cũ (trước khi tách module Sản phẩm) → vị trí mới.
      { path: "inventory/products", element: <RedirectTo to="/catalog/products" /> },
      {
        path: "inventory/product-categories",
        element: <RedirectTo to="/catalog/product-categories" />,
      },
      {
        path: "inventory/warehouses",
        element: (
          <Guard section="warehouses">
            <WarehousesRoute />
          </Guard>
        ),
      },
      {
        path: "inventory/shipments",
        element: (
          <Guard section="shipments">
            <ShipmentsRoute />
          </Guard>
        ),
      },
      {
        path: "inventory/stock",
        element: (
          <Guard section="stock">
            <StockRoute />
          </Guard>
        ),
      },
      {
        path: "inventory/dispatch-history",
        element: (
          <Guard section="dispatch-history">
            <DispatchHistoryRoute />
          </Guard>
        ),
      },
      {
        // Chỉ `stock-documents`: sau khi tab Trả hàng bị gỡ, dữ liệu của trang thuần là
        // phiếu kho và endpoint /ledger-documents cũng chỉ nhận section này. Để `returns`
        // lọt vào guard thì user kho-chỉ-làm-hàng-hoàn vào được trang rồi ăn 403 ở query
        // chính — trang trống (audit 2026-07-14 vòng 3). Nút "Quét trả hàng" trong trang
        // vẫn gate riêng theo `returns:edit`.
        path: "inventory/stock-documents",
        element: (
          <Guard section="stock-documents">
            <StockDocumentsRoute />
          </Guard>
        ),
      },
      {
        path: "inventory/returns",
        element: <RedirectTo to="/inventory/stock-documents" />,
      },

      {
        path: "marketing/facebook-ads",
        element: (
          <Guard section="facebook-ads">
            <FacebookAdsRoute />
          </Guard>
        ),
      },
      {
        path: "marketing/google-ads",
        element: (
          <Guard section="google-ads">
            <GoogleAdsRoute />
          </Guard>
        ),
      },
      {
        path: "reports/ads-report",
        element: (
          <Guard section="ads-report">
            <AdsReportRoute />
          </Guard>
        ),
      },
      {
        path: "reports/overview-report",
        element: (
          <Guard section="overview-report">
            <OverviewReportRoute />
          </Guard>
        ),
      },
      {
        path: "reports/foxia",
        element: (
          <Guard section="foxia-report">
            <FoxiaReportRoute />
          </Guard>
        ),
      },
      {
        path: "reports/call-quality",
        element: (
          <Guard section="call-quality">
            <CallQualityRoute />
          </Guard>
        ),
      },
      // Redirect các path nested cũ (trước khi gom vào nhóm Báo cáo) → vị trí mới.
      { path: "marketing/ads-report", element: <RedirectTo to="/reports/ads-report" /> },

      {
        path: "reports/dashboard",
        element: (
          <Guard section="dashboard">
            <DashboardRoute />
          </Guard>
        ),
      },

      // Module Media: menu ẩn/hiện theo provisioning từng user (allowed_sections do
      // backend cấp), không qua role RBAC — xem app/modules.ts.
      {
        path: "media/explore",
        element: (
          <Guard section="media-explore">
            <MediaExploreRoute />
          </Guard>
        ),
      },
      {
        path: "media/contents",
        element: (
          <Guard section="media-contents">
            <MediaContentsRoute />
          </Guard>
        ),
      },
      {
        path: "media/contents/:contentId",
        element: (
          <Guard section="media-contents">
            <MediaContentsRoute />
          </Guard>
        ),
      },
      {
        path: "media/proposals",
        element: (
          <Guard section="media-proposals">
            <MediaProposalsRoute />
          </Guard>
        ),
      },
      {
        path: "media/reports",
        element: (
          <Guard section="media-reports">
            <MediaReportsRoute />
          </Guard>
        ),
      },
      {
        path: "media/taxonomy",
        element: (
          <Guard section="media-taxonomy">
            <MediaTaxonomyRoute />
          </Guard>
        ),
      },
      {
        // Trang Kết nối Media dùng chung quyền admin `users` (SECTION_PERMISSION).
        path: "settings/media",
        element: (
          <Guard section="media-settings">
            <MediaSettingsRoute />
          </Guard>
        ),
      },

      {
        path: "settings/users",
        element: (
          <Guard section="users">
            <UsersRoute />
          </Guard>
        ),
      },
      {
        path: "settings/lead-assignment",
        element: (
          <Guard section="lead-assignment">
            <LeadAssignmentRoute />
          </Guard>
        ),
      },
      {
        path: "settings/roles",
        element: (
          <Guard section="roles">
            <RolesRoute />
          </Guard>
        ),
      },
      {
        path: "hr/departments",
        element: (
          <Guard section="departments">
            <DepartmentsRoute />
          </Guard>
        ),
      },
      {
        path: "settings/audit",
        element: (
          <Guard section="audit">
            <AuditLogsRoute />
          </Guard>
        ),
      },
      {
        path: "settings/channels",
        element: (
          <Guard section="channels">
            <ChannelsRoute />
          </Guard>
        ),
      },
      {
        // BE chặn mọi thao tác kênh KiotViet bằng can_manage (superuser-only) và FE shell
        // cũng chỉ fire query khi superuser — gate theo section "kiotviet" chỉ mở ra một
        // trang trống + 403 cho người được cấp quyền đó (audit 2026-07-14 vòng 4).
        // Lưu ý: quyền kiotviet:edit vẫn được dùng thật ở dialog quản lý địa chỉ gửi KShip.
        path: "settings/kiotviet",
        element: (
          <GuardSuperuser>
            <KiotVietRoute />
          </GuardSuperuser>
        ),
      },
      {
        // Bảng liên kết quyết định đơn chảy vào nguồn nào bên Foxia — cùng mức
        // rủi ro với cấu hình kênh KiotViet, nên cũng gate superuser.
        path: "settings/foxia-link",
        element: (
          <GuardSuperuser>
            <FoxiaLinkRoute />
          </GuardSuperuser>
        ),
      },
      {
        // Gán page ↔ kênh quyết định cơ hội chảy vào nguồn Foxia nào — gate superuser như foxia-link.
        path: "settings/pancake",
        element: (
          <GuardSuperuser>
            <PancakeSettingsRoute />
          </GuardSuperuser>
        ),
      },
      {
        // Đồng bộ sản phẩm → Pancake POS: xem = pancake-pos:view; nút ghi gate :edit
        // ở BE (và ẩn/khoá ở FE). API key vẫn nhập ở Cấu hình hệ thống (superuser).
        path: "settings/pancake-pos",
        element: (
          <Guard section="pancake-pos">
            <PancakePosSettingsRoute />
          </Guard>
        ),
      },
      {
        // Cầm API key/secret đối tác + token API vào — superuser như pancake/foxia-link.
        path: "settings/system-settings",
        element: (
          <GuardSuperuser>
            <SystemSettingsRoute />
          </GuardSuperuser>
        ),
      },
      {
        path: "settings/contact-flow",
        element: (
          <Guard section="contact_flow">
            <ContactFlowRoute />
          </Guard>
        ),
      },
      // Redirect path nested cũ (channels/kiotviet trước khi chuyển vào Cài đặt) → vị trí mới.
      { path: "marketing/channels", element: <RedirectTo to="/settings/channels" /> },
      { path: "inventory/kiotviet", element: <RedirectTo to="/settings/kiotviet" /> },

      {
        path: "hr/employees",
        element: (
          <Guard section="employees">
            <EmployeesRoute />
          </Guard>
        ),
      },
      {
        path: "hr/employees/:id",
        element: (
          <Guard section="employees">
            <EmployeeDetailRoute />
          </Guard>
        ),
      },
      {
        path: "hr/leave",
        element: (
          <Guard section="leave">
            <LeaveRequestsRoute />
          </Guard>
        ),
      },
      {
        path: "hr/attendance-history",
        element: (
          <Guard section="attendance-history">
            <AttendanceHistoryRoute />
          </Guard>
        ),
      },
      {
        path: "hr/compensation",
        element: (
          <Guard section="compensation">
            <CompensationRoute />
          </Guard>
        ),
      },
      {
        path: "settings/attendance-locations",
        element: (
          <Guard section="attendance-locations">
            <AttendanceLocationsRoute />
          </Guard>
        ),
      },
      // Redirect path cũ (attendance-locations trước khi chuyển vào Cài đặt) → vị trí mới.
      {
        path: "hr/attendance-locations",
        element: <RedirectTo to="/settings/attendance-locations" />,
      },
      // Chấm công: mọi user đã đăng nhập đều vào được (không gate theo section).
      {
        path: "hr/check-in",
        element: (
          <LoginOnly>
            <AttendanceCheckInRoute />
          </LoginOnly>
        ),
      },

      // Backward-compat: old order-detail deep links (keep notification/websocket links working).
      { path: "orders/:orderId", element: <LegacyDetailRedirect base="/sales/orders" /> },
      {
        path: "landing-orders/:orderId",
        element: <LegacyDetailRedirect base="/sales/landing-orders" />,
      },
      { path: "koc-orders/:orderId", element: <LegacyDetailRedirect base="/sales/koc-orders" /> },

      // Backward-compat: old flat paths → nested.
      ...LEGACY_PATH_REDIRECTS.map((r) => ({
        path: r.from.replace(/^\//, ""),
        element: <RedirectTo to={r.to} />,
      })),

      // Fallback: path lạ → module cuối dùng hoặc section mặc định theo phòng ban.
      { path: "*", element: <DefaultRedirect /> },
    ],
  },
]);
