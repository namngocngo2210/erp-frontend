import { useEffect, useMemo, useRef, useState } from "react";
import { RouterProvider } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { LoginView } from "@/app/login-view";
import { ExportDock } from "@/features/exports/ExportDock";
import { ExportJobsProvider } from "@/features/exports/ExportJobsProvider";
import { Toaster } from "@/components/ui/sonner";
import { useI18n } from "@/i18n";
import { sectionFromPath, parseOrdersView, type AppSection, type OrdersView } from "@/lib/routes";
import { type LandingTabKey } from "@/pages/OrdersPage";
import { parseLandingTab } from "@/app/orders-tab";
import {
  AppShellContext,
  AppUIContext,
  type AppShellContextValue,
  type AppUIContextValue,
} from "@/app/AppShellContext";
import { router } from "@/app/routes";
import { LAST_MODULE_STORAGE_KEY } from "@/app/modules";
import { useAppChannels } from "@/app/use-app-channels";
import { useAppLogin } from "@/app/use-app-login";
import { useAppOrders } from "@/app/use-app-orders";
import { useAppProfile } from "@/app/use-app-profile";
import { useAppSummary } from "@/app/use-app-summary";
import { useAppUsers } from "@/app/use-app-users";
import { usePageTitle } from "@/app/use-page-title";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useCrmWebSocket } from "@/hooks/use-crm-websocket";
import { useOrderNotifications } from "@/hooks/use-order-notifications";
import { useAuthBootstrap } from "@/hooks/use-auth-bootstrap";
import { useStableHandlers } from "@/hooks/use-stable-handlers";
import { COMPACT_VIEWPORT_QUERY, isCompactViewport } from "@/lib/constants/layout";

import { clearAuthTokens, fetchJson } from "@/services/http";
import { disconnectCRM } from "@/services/websocket";
import { channelKeys } from "@/features/channels/queries";
import { kiotvietKeys } from "@/features/kiotviet/queries";
import { userKeys } from "@/features/users/queries";
import { swallowError } from "@/lib/errors";

const SIDEBAR_COLLAPSED_STORAGE_KEY = "desi_sidebar_collapsed";

function getStoredSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function App() {
  const { t } = useI18n();
  const [section, setSection] = useState<AppSection>(() =>
    sectionFromPath(window.location.pathname),
  );
  const { user, setUser, authChecking } = useAuthBootstrap();
  const queryClient = useQueryClient();
  const {
    username,
    setUsername,
    password,
    setPassword,
    loading,
    loginFormRef,
    login,
    handleLoginInputKeyDown,
  } = useAppLogin({ setUser });

  const {
    notifications,
    setNotifications,
    unreadCount,
    markAllNotificationsRead,
    markNotificationRead,
    clearNotifications,
  } = useOrderNotifications();
  // Trên màn < 1536px (laptop ~14") tự thu gọn sidebar để nhường chỗ cho khu
  // vực chính; trên màn lớn dùng lại preference đã lưu của user.
  const isCompactViewportNow = useMediaQuery(COMPACT_VIEWPORT_QUERY);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
    () => isCompactViewport() || getStoredSidebarCollapsed(),
  );
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);
  /** Sub-view trong section orders: list hoặc detail */
  const [ordersView, setOrdersView] = useState<OrdersView>(() =>
    parseOrdersView(window.location.pathname),
  );
  const [landingTab, setLandingTab] = useState<LandingTabKey>(() =>
    parseLandingTab(window.location.search),
  );

  // ── Shell data theo domain (chỉ DI CHUYỂN từ App — logic giữ nguyên trong
  // từng hook: src/app/use-app-*.ts) ─────────────────────────────────────────
  const {
    summary,
    setSummary,
    summaryLoading,
    summaryFilters,
    summaryCacheRef,
    invalidateSummaryCache,
    loadSummary,
  } = useAppSummary();
  const {
    orders,
    standaloneOrder,
    setStandaloneOrder,
    standaloneOrderLoading,
    suppressOrdersReloadUntilRef,
    locallyCreatedOrderIdsRef,
    ordersRealtimeHandlers,
    loadOrdersSection,
    patchOrder,
    handleCreateOrder,
    bulkDeleteOrders,
    runKiotVietOrderAction,
    runKiotVietOrderPrecheck,
  } = useAppOrders({ ordersView, setLandingTab, invalidateSummaryCache });
  const {
    channels,
    allChannels,
    kiotVietChannels,
    createChannel,
    updateChannel,
    bulkDeleteChannels,
    loadAssignments,
    addAssignment,
    removeAssignment,
    createKiotVietChannel,
    updateKiotVietChannel,
    deleteKiotVietChannel,
    bulkDeleteKiotVietChannels,
  } = useAppChannels({ user, section });
  const {
    staffUsers,
    departments,
    createAdminUser,
    updateAdminUser,
    deleteAdminUser,
    createDepartment,
    updateDepartment,
    deleteDepartment,
  } = useAppUsers({ user, section });
  const {
    openProfile,
    setOpenProfile,
    openProfileModal,
    profileDisplayName,
    profileAvatarDataUrl,
    profileSaving,
    currentPassword,
    newPassword,
    confirmPassword,
    passwordSaving,
    setProfileDisplayName,
    setCurrentPassword,
    setNewPassword,
    setConfirmPassword,
    onAvatarPicked,
    removeAvatar,
    saveProfile,
    savePassword,
  } = useAppProfile({ user, setUser });

  const latestKiotVietErrorToastRef = useRef<Map<number, string>>(new Map());
  const translateRef = useRef(t);

  const loadSectionData = async (targetSection: AppSection) => {
    if (
      targetSection === "orders" ||
      targetSection === "landing-orders" ||
      targetSection === "koc-orders"
    ) {
      await loadOrdersSection(targetSection);
      return;
    }
    // Dashboard summary is still loaded imperatively here (manual cache, dynamic
    // date filters, WS-driven force-reload — see loadSummary). Channels, staff,
    // KiotViet channels, admin users and departments for the channels / users /
    // departments / kiotviet / ads-report sections are fetched reactively by
    // react-query via the `enabled` gating in the domain hooks, so they no
    // longer need to be triggered here.
    if (targetSection === "dashboard") {
      await loadSummary();
      return;
    }
  };

  // Auth bootstrap (validate phiên khi mount) + persist user vào localStorage
  // giờ nằm trong useAuthBootstrap (xem src/hooks/use-auth-bootstrap.ts). logout
  // vẫn ở App vì còn phụ thuộc nhiều ref cache.

  // popstate / back-forward, "/" → /orders, và guard allowed_sections giờ do
  // react-router lo: RootLayout đồng bộ section từ URL, route index redirect "/"
  // sang "/orders", và RequireAuth chặn section không có quyền (xem src/app/*).

  useEffect(() => {
    if (authChecking) return;
    if (!user) return;
    loadSectionData(section).catch(() => null);
    // loadSectionData now only orchestrates orders + dashboard summary; shell
    // lists are fetched reactively by react-query (enabled gating). Keep deps as
    // before so the orders/summary orchestration re-runs on user/section change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecking, user, section]);

  useEffect(() => {
    translateRef.current = t;
  }, [t]);

  usePageTitle(section, user);

  // Khi vượt qua ngưỡng compact: vào màn nhỏ → thu gọn; ra màn lớn → khôi phục
  // preference đã lưu. Người dùng vẫn có thể tự bấm toggle giữa hai lần vượt
  // ngưỡng (toggle thủ công ở màn nhỏ chỉ tồn tại trong phiên, không ghi đè
  // preference vì effect lưu bên dưới đã bỏ qua khi đang compact).
  useEffect(() => {
    setSidebarCollapsed(() => (isCompactViewportNow ? true : getStoredSidebarCollapsed()));
  }, [isCompactViewportNow]);

  useEffect(() => {
    if (isCompactViewportNow) return;
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, sidebarCollapsed ? "1" : "0");
    } catch (err) {
      // ignore storage error
      swallowError(err, "storage.sidebarCollapsed");
    }
  }, [sidebarCollapsed, isCompactViewportNow]);

  // Realtime CRM: đăng ký listener WS + xử lý order.created/order.updated/
  // restore.completed/tín hiệu KiotViet. Logic giữ nguyên, chỉ tách ra hook để
  // App.tsx gọn hơn. Hook tự quản ref nội bộ để tránh stale closure.
  useCrmWebSocket({
    user,
    section,
    ordersHandlers: ordersRealtimeHandlers,
    loadSummary,
    summaryCacheRef,
    suppressOrdersReloadUntilRef,
    locallyCreatedOrderIdsRef,
    latestKiotVietErrorToastRef,
    setNotifications,
    setStandaloneOrder,
  });

  const logout = async () => {
    try {
      await fetchJson("/api/users/logout", { method: "POST" });
    } catch (err) {
      // ignore
      swallowError(err, "auth.logout");
    }
    disconnectCRM();
    clearAuthTokens();
    setUser(null);
    orders.resetOrdersData();
    setSummary(null);
    clearNotifications();
    latestKiotVietErrorToastRef.current.clear();
    summaryCacheRef.current = null;
    // Module dùng gần nhất là của tài khoản vừa thoát — giữ lại thì tài khoản
    // đăng nhập sau bị đẩy vào module không thuộc quyền của mình.
    try {
      window.localStorage.removeItem(LAST_MODULE_STORAGE_KEY);
    } catch (err) {
      /* localStorage may be blocked — ignore */
      swallowError(err, "storage.lastModule.clear");
    }
    // Drop cached shell lists so a re-login refetches fresh data instead of
    // briefly showing the previous user's channels/staff/users.
    queryClient.removeQueries({ queryKey: channelKeys.list });
    queryClient.removeQueries({ queryKey: channelKeys.listForKiotViet });
    queryClient.removeQueries({ queryKey: channelKeys.staff });
    queryClient.removeQueries({ queryKey: kiotvietKeys.channels });
    queryClient.removeQueries({ queryKey: userKeys.adminUsers });
    queryClient.removeQueries({ queryKey: userKeys.departments });
    toast.success(t("auth.toast.logoutSuccess"));
  };

  // navigateToSection / handleLandingTabChange / navigateToOrderDetail /
  // navigateBackToOrderList đã chuyển vào RootLayout (dùng useNavigate). Xem
  // src/app/RootLayout.tsx và src/app/orders-tab.ts.

  // ── Stable handler identities cho data context ────────────────────────────
  // Các handler là closure tạo mới mỗi render; useStableHandlers giữ closure
  // mới nhất trong ref (ghi qua useEffect — không ghi trong thân render kẻo
  // React Compiler bail out) và expose wrapper identity ổn định, để data
  // context chỉ đổi khi DATA đổi. Xem src/hooks/use-stable-handlers.ts.
  const stableDataHandlers = useStableHandlers({
    logout,
    patchOrder,
    handleCreateOrder,
    bulkDeleteOrders,
    runKiotVietOrderAction,
    runKiotVietOrderPrecheck,
    loadSummary,
    createChannel,
    updateChannel,
    bulkDeleteChannels,
    loadAssignments,
    addAssignment,
    removeAssignment,
    createKiotVietChannel,
    updateKiotVietChannel,
    deleteKiotVietChannel,
    bulkDeleteKiotVietChannels,
    createAdminUser,
    updateAdminUser,
    deleteAdminUser,
    createDepartment,
    updateDepartment,
    deleteDepartment,
  });

  const allowedSections = useMemo(
    () => user?.allowed_sections ?? ["orders", "landing-orders", "koc-orders", "customers"],
    [user?.allowed_sections],
  );

  // ── Data context: chỉ đổi identity khi DATA đổi (không đổi khi UI volatile
  // đổi), nhờ handler ổn định ở trên + setters useState vốn ổn định. ─────────
  const shellValue = useMemo<AppShellContextValue>(
    () => ({
      // Provider chỉ render khi user != null (sau guard ở dưới); memo vẫn chạy
      // unconditionally nên cast để thoả type khi user tạm null lúc chưa login.
      user: user as NonNullable<typeof user>,
      allowedSections,
      section,
      setSection,
      ordersView,
      setOrdersView,
      landingTab,
      setLandingTab,
      orders,
      channels,
      allChannels,
      kiotVietChannels,
      staffUsers,
      departments,
      summary,
      summaryLoading,
      summaryFilters,
      standaloneOrder,
      standaloneOrderLoading,
      ...stableDataHandlers,
    }),
    [
      user,
      allowedSections,
      section,
      ordersView,
      landingTab,
      orders,
      channels,
      allChannels,
      kiotVietChannels,
      staffUsers,
      departments,
      summary,
      summaryLoading,
      summaryFilters,
      standaloneOrder,
      standaloneOrderLoading,
      stableDataHandlers,
    ],
  );

  // ── UI context: state biến động cao, chỉ shell chrome consume. Đổi identity
  // khi các state này đổi là MONG MUỐN (chỉ chrome re-render). ────────────────
  const uiValue = useMemo<AppUIContextValue>(
    () => ({
      notifications,
      unreadCount,
      markAllNotificationsRead,
      markNotificationRead,
      sidebarCollapsed,
      setSidebarCollapsed,
      mobileNavOpen,
      setMobileNavOpen,
      openProfile,
      setOpenProfile,
      openProfileModal,
      profileDisplayName,
      profileAvatarDataUrl,
      profileSaving,
      currentPassword,
      newPassword,
      confirmPassword,
      passwordSaving,
      setProfileDisplayName,
      setCurrentPassword,
      setNewPassword,
      setConfirmPassword,
      onAvatarPicked,
      removeAvatar,
      saveProfile,
      savePassword,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      notifications,
      unreadCount,
      sidebarCollapsed,
      mobileNavOpen,
      openProfile,
      profileDisplayName,
      profileAvatarDataUrl,
      profileSaving,
      currentPassword,
      newPassword,
      confirmPassword,
      passwordSaving,
    ],
  );

  if (authChecking && !user) return null;

  if (!user) {
    return (
      <>
        <LoginView
          username={username}
          password={password}
          loading={loading}
          loginFormRef={loginFormRef}
          t={t}
          onSubmit={login}
          onInputKeyDown={handleLoginInputKeyDown}
          onUsernameChange={setUsername}
          onPasswordChange={setPassword}
        />
        <Toaster />
      </>
    );
  }

  return (
    // ExportJobsProvider chỉ mount khi đã đăng nhập (nhánh này chạy sau guard
    // `if (!user) return ...` ở trên): job xuất file gắn với user, và provider tự
    // poll /api/exports — mount lúc chưa auth sẽ gọi API thừa/lỗi 401. Đặt ở đây
    // (trong QueryClientProvider từ main.tsx, cạnh Toaster) thay vì bọc quanh cả
    // App để không phải đổi bất kỳ provider/context nào khác đang có sẵn.
    <ExportJobsProvider>
      <AppShellContext.Provider value={shellValue}>
        <AppUIContext.Provider value={uiValue}>
          <RouterProvider router={router} />
        </AppUIContext.Provider>
      </AppShellContext.Provider>
      <Toaster />
      <ExportDock />
    </ExportJobsProvider>
  );
}

export default App;
