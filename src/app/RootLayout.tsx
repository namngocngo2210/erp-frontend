import { Suspense, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Skeleton, SkeletonTable } from "@/components/ui/skeleton";
import { ShellMobileNav, ShellProfileDialog, ShellSidebar, ShellTopNav } from "@/app/ShellChrome";
import {
  kocOrderDetailPath,
  landingOrderDetailPath,
  orderDetailPath,
  parseOrdersView,
  pathFromSection,
  isFullHeightSection,
  requiredPermissionFor,
  sectionFromPath,
  type AppSection,
} from "@/lib/routes";
import { can } from "@/lib/permissions";
import { type LandingTabKey } from "@/pages/OrdersPage";
import { getOrderTabFallbackDefaults, getOrderTabScope, parseLandingTab } from "@/app/orders-tab";
import { filtersToLoadOverrides } from "@/features/orders/use-orders-filters";
import { useAppShell } from "@/app/AppShellContext";
import { useLockWindowScroll } from "@/app/use-lock-window-scroll";
import { LAST_MODULE_STORAGE_KEY, SECTION_TO_MODULE } from "@/app/modules";
import { WebphoneProvider } from "@/features/callcenter/WebphoneProvider";
import { swallowError } from "@/lib/errors";

/**
 * Shell xác thực: Sidebar / TopNav / ProfileDialog + <Outlet/>.
 *
 * `section` / `ordersView` / `landingTab` được suy ra từ router (useLocation)
 * rồi đồng bộ ngược vào state của App qua context setters, để các effect cũ của
 * App (loadSectionData theo `section`, guard allowed_sections, document.title)
 * tiếp tục hoạt động y như trước khi cutover.
 */
export default function RootLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const shell = useAppShell();
  const {
    user,
    allowedSections,
    section,
    setSection,
    setOrdersView,
    setLandingTab,
    orders,
    logout,
  } = shell;

  // Đồng bộ section/ordersView/landingTab từ URL → state App.
  // Thay thế cặp popstate listener + handlePopState cũ trong App.tsx.
  useEffect(() => {
    setSection(sectionFromPath(location.pathname));
    setOrdersView(parseOrdersView(location.pathname));
    setLandingTab(parseLandingTab(location.search));
  }, [location.pathname, location.search, setSection, setOrdersView, setLandingTab]);

  // Vùng cuộn của shell là `<main>`, cửa sổ KHÔNG bao giờ được cuộn — xem
  // docstring của hook để biết vì sao phải khoá tường minh (sự cố màn trắng
  // trên prod 2026-08-25).
  useLockWindowScroll();

  // Remember the active module so "/" returns here next time (spec A1).
  useEffect(() => {
    try {
      window.localStorage.setItem(LAST_MODULE_STORAGE_KEY, SECTION_TO_MODULE[section].key);
    } catch (err) {
      /* localStorage may be blocked — ignore */
      swallowError(err, "storage.lastModule");
    }
  }, [section]);

  // ── Navigation handlers (dùng react-router thay history.pushState) ─────────

  const navigateToSection = (nextSection: AppSection) => {
    // Đổi module về quyền thật của section (users:view / kiotviet:view) thay vì
    // is_superuser; trang KiotViet vẫn còn GuardSuperuser phía sau (audit P2-6).
    if (
      (nextSection === "users" || nextSection === "kiotviet") &&
      !can(user, requiredPermissionFor(nextSection))
    ) {
      nextSection = "orders";
    }
    const nextPath = pathFromSection(nextSection);
    if (location.pathname !== nextPath) {
      navigate(nextPath);
    }
    // section/ordersView/landingTab sẽ được effect đồng bộ lại từ URL mới.
    if (
      nextSection === "orders" ||
      nextSection === "landing-orders" ||
      nextSection === "koc-orders"
    ) {
      setOrdersView({ type: "list" });
      setLandingTab("orders");
    }
  };

  const handleLandingTabChange = (next: LandingTabKey) => {
    setLandingTab(next);
    const params = new URLSearchParams(location.search);
    if (next === "orders") {
      params.delete("tab");
    } else {
      params.set("tab", next);
    }
    const search = params.toString();
    navigate({ pathname: location.pathname, search: search ? `?${search}` : "" });
    if (next === "blocklist") return;
    const orderSection: "orders" | "landing-orders" | "koc-orders" =
      section === "landing-orders"
        ? "landing-orders"
        : section === "koc-orders"
          ? "koc-orders"
          : "orders";
    const showOrdersValue = orderSection === "landing-orders" ? "" : "true";
    orders.setShowOrders(showOrdersValue);
    const loaded = orders.switchFilterScope(
      getOrderTabScope(orderSection, next),
      getOrderTabFallbackDefaults(next),
    );
    // Override phải đủ MỌI trục (kể cả returnDateFilter, trước đây bị thiếu): tab
    // mới đã hiển thị bộ lọc của nó, nhưng loadOrders vẫn đọc state của tab cũ nếu
    // không được override. Xem filtersToLoadOverrides.
    void orders.goToOrdersPage(0, {
      overrides: {
        ...filtersToLoadOverrides(loaded),
        showOrders: showOrdersValue,
      },
    });
  };

  const navigateToOrderDetail = (orderId: number) => {
    // Trên trang landing, mở chi tiết dưới dạng drawer (giữ list phía sau) qua
    // route con /landing-orders/:id. Trang KOC mở full-page giữ section để back
    // quay về list KOC. Các section khác mở full-page /orders/:id.
    navigate(
      section === "landing-orders"
        ? landingOrderDetailPath(orderId)
        : section === "koc-orders"
          ? kocOrderDetailPath(orderId)
          : orderDetailPath(orderId),
    );
    setOrdersView({ type: "detail", orderId });
  };

  const navigateBackToOrderList = () => {
    const path = pathFromSection(
      section === "landing-orders"
        ? "landing-orders"
        : section === "koc-orders"
          ? "koc-orders"
          : "orders",
    );
    navigate(path);
    setOrdersView({ type: "list" });
  };

  // Trang tự quản lý chiều cao (h-full + cuộn nội bộ) phải được khung
  // `overflow-hidden flex flex-col`, nếu không `h-full` của chúng rơi về `auto`.
  // Danh sách nằm ở `lib/routes.ts` kèm giải thích cái bẫy.
  const isFullHeight = isFullHeightSection(section);

  const outletContext = {
    navigateToSection,
    handleLandingTabChange,
    navigateToOrderDetail,
    navigateBackToOrderList,
  } satisfies RootOutletContext;

  return (
    // WebphoneProvider ở tầng shell: iframe Zenify giữ mounted xuyên điều hướng
    // SPA để cuộc gọi không rớt khi sale đổi trang.
    <WebphoneProvider>
      <div className="flex min-h-dvh h-dvh min-w-0 overflow-hidden bg-background">
        <ShellSidebar
          section={section}
          allowedSections={allowedSections}
          onNavigateSection={navigateToSection}
        />
        <ShellMobileNav
          section={section}
          allowedSections={allowedSections}
          onNavigateSection={navigateToSection}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <ShellTopNav user={user} section={section} logout={logout} />
          <main
            className={`min-h-0 min-w-0 flex-1 ${
              isFullHeight
                ? "overflow-hidden flex flex-col p-1.5 sm:p-2"
                : "overflow-y-auto p-3 sm:p-4 space-y-4"
            }`}
          >
            <ErrorBoundary>
              <Suspense
                fallback={
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-9 w-32" />
                    </div>
                    <SkeletonTable
                      rows={8}
                      columns={6}
                      className="rounded-xl border border-border bg-card"
                    />
                  </div>
                }
              >
                {isFullHeight ? (
                  // Nhánh orders giữ nguyên: layout flex chiều-cao tới hạn (AG Grid)
                  // + pattern drawer chi tiết đè lên list → KHÔNG bọc/keyed để tránh
                  // remount làm mất trạng thái list.
                  <Outlet context={outletContext} />
                ) : (
                  // Các trang thường (dashboard, báo cáo, danh sách...) remount khi
                  // đổi module → fade nhẹ nội dung cho chuyển trang bớt "khô".
                  // `key={section}` để hiệu ứng phát lại mỗi lần đổi trang, nhưng
                  // KHÔNG phát lại khi chỉ đổi filter trong cùng trang.
                  <div key={section} className="animate-in fade-in-0 duration-300 ease-out">
                    <Outlet context={outletContext} />
                  </div>
                )}
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>
      </div>
      <ShellProfileDialog user={user} />
    </WebphoneProvider>
  );
}

/** Handlers điều hướng được RootLayout truyền xuống page qua Outlet context. */
export type RootOutletContext = {
  navigateToSection: (section: AppSection) => void;
  handleLandingTabChange: (tab: LandingTabKey) => void;
  navigateToOrderDetail: (orderId: number) => void;
  navigateBackToOrderList: () => void;
};
