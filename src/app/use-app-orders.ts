import { useEffect, useMemo, useRef, useState } from "react";

import { type OrderRow } from "@/features/orders/order-types";
import { mergeOrderRowPatch } from "@/features/orders/order-realtime-merge";
import { useOrdersData } from "@/features/orders/use-orders-data";
import { filtersToLoadOverrides } from "@/features/orders/use-orders-filters";
import { type OrdersView } from "@/lib/routes";
import { type LandingTabKey } from "@/pages/OrdersPage";
import { getOrderTabFallbackDefaults, getOrderTabScope, parseLandingTab } from "@/app/orders-tab";
import { swallowError } from "@/lib/errors";
import { fetchJson } from "@/services/http";

export type OrdersSection = "orders" | "landing-orders" | "koc-orders";

type UseAppOrdersParams = {
  /** Sub-view trong section orders (App giữ; RootLayout đồng bộ từ router). */
  ordersView: OrdersView;
  /** Setter tab landing — App giữ state vì shell context expose cho pages. */
  setLandingTab: (tab: LandingTabKey) => void;
  /** Xoá cache dashboard summary — mutation đơn phải invalidate (từ useAppSummary). */
  invalidateSummaryCache: () => void;
};

/**
 * Toàn bộ data-layer domain "đơn hàng" của App shell: bundle useOrdersData,
 * standalone order cho route detail, các action mutate đơn (patch/create/bulk
 * delete/KiotViet) và bộ handler realtime cho WS. Chỉ DI CHUYỂN từ App.tsx —
 * logic + deps giữ nguyên.
 */
export function useAppOrders({
  ordersView,
  setLandingTab,
  invalidateSummaryCache,
}: UseAppOrdersParams) {
  const orders = useOrdersData(fetchJson);

  // Fetch single order when navigating directly to detail (e.g. from customer history modal)
  const [standaloneOrder, setStandaloneOrder] = useState<OrderRow | null>(null);
  const [standaloneOrderLoading, setStandaloneOrderLoading] = useState(false);

  useEffect(() => {
    if (ordersView.type !== "detail") {
      setStandaloneOrder(null);
      return;
    }
    // LUÔN fetch bản đầy đủ — row của list giờ là bản GỌN (OrderListSerializer,
    // thiếu các field chỉ trang chi tiết đọc: địa chỉ tách phần, financials,
    // shipping_fee...). Row list (nếu có) chỉ là placeholder render tức thì trong
    // lúc chờ; OrderDetailInner ưu tiên standaloneOrder khi đã về.
    setStandaloneOrderLoading(true);
    fetchJson(`/api/orders/${ordersView.orderId}`)
      .then((res) => {
        let order: OrderRow | null = null;
        if (res && typeof res === "object") {
          if ("id" in res && typeof res.id === "number") {
            order = res as OrderRow;
          } else if (
            "data" in res &&
            res.data &&
            typeof res.data === "object" &&
            "id" in res.data &&
            typeof (res.data as { id?: unknown }).id === "number"
          ) {
            order = res.data as OrderRow;
          }
        }
        setStandaloneOrder(order);
      })
      .catch((err: unknown) => {
        // Cố ý không toast: OrderDetailInner đã có UI "không tải được đơn";
        // swallowError giữ lại dấu vết lỗi mạng/5xx trên Sentry.
        swallowError(err, "app.orders.loadStandaloneOrder");
        setStandaloneOrder(null);
      })
      .finally(() => setStandaloneOrderLoading(false));
    // Chỉ phụ thuộc ordersView: trước đây còn orders.rows để dò "đơn có trong list
    // thì khỏi fetch" — giờ luôn fetch, mà giữ orders.rows trong deps thì mỗi patch
    // realtime của list là một lần refetch detail thừa.
  }, [ordersView]);

  const suppressOrdersReloadUntilRef = useRef(0);
  const locallyCreatedOrderIdsRef = useRef<Set<number>>(new Set());

  // Bộ handler dữ liệu đơn cho realtime — chỉ đổi identity khi một trong các
  // handler đổi, để hook WS không re-bind ref thừa mỗi render của App.
  const ordersRealtimeHandlers = useMemo(
    () => ({
      clearOrdersCache: orders.clearOrdersCache,
      loadOrders: orders.loadOrders,
      patchOrderFromRealtime: orders.patchOrderFromRealtime,
      upsertOrderFromRealtime: orders.upsertOrderFromRealtime,
      upsertOrderFromBroadcast: orders.upsertOrderFromBroadcast,
      removeOrderFromRealtime: orders.removeOrderFromRealtime,
    }),
    [
      orders.clearOrdersCache,
      orders.loadOrders,
      orders.patchOrderFromRealtime,
      orders.upsertOrderFromRealtime,
      orders.upsertOrderFromBroadcast,
      orders.removeOrderFromRealtime,
    ],
  );

  const { persistVisibleColumns, persistLockedColumns } = orders;
  useEffect(() => {
    persistVisibleColumns();
  }, [orders.visibleOrderColumns, persistVisibleColumns]);

  useEffect(() => {
    persistLockedColumns();
  }, [orders.lockedOrderColumns, persistLockedColumns]);

  const loadOrdersSection = async (targetSection: OrdersSection) => {
    if (targetSection === "orders") {
      const initialTab = parseLandingTab(window.location.search);
      setLandingTab(initialTab);
      orders.setLandingMode(false);
      orders.setKocMode(false);
      // Mỗi page có bộ filter riêng — switch sang scope "orders" sẽ flush state
      // hiện tại sang key của scope cũ rồi load lại key của scope này.
      const loaded = orders.switchFilterScope(
        getOrderTabScope("orders", initialTab),
        getOrderTabFallbackDefaults(initialTab),
      );
      orders.setKiotvietChannelNull("");
      orders.setShowOrders("true");
      await Promise.all([
        orders.loadOrders(
          {
            ...filtersToLoadOverrides(loaded),
            kiotvietChannelNull: "",
            showOrders: "true",
          },
          { force: true },
        ),
        orders.loadProducts(),
        orders.loadKiotVietOptions(),
      ]);
      // Address catalog payload is large; load in background to keep first paint responsive.
      orders
        .loadAddressCatalog()
        .catch((err: unknown) => swallowError(err, "app.orders.loadAddressCatalog"));
      return;
    }
    if (targetSection === "landing-orders") {
      orders.setLandingMode(true);
      orders.setKocMode(false);
      orders.setKiotvietChannelNull("");
      orders.setShowOrders("");
      const initialTab = parseLandingTab(window.location.search);
      setLandingTab(initialTab);
      const loaded = orders.switchFilterScope(
        getOrderTabScope("landing-orders", initialTab),
        getOrderTabFallbackDefaults(initialTab),
      );
      await Promise.all([
        orders.loadOrders(
          {
            ...filtersToLoadOverrides(loaded),
            kiotvietChannelNull: "",
            showOrders: "",
          },
          { force: true },
        ),
        orders.loadProducts(),
        orders.loadKiotVietOptions(),
      ]);
      orders
        .loadAddressCatalog()
        .catch((err: unknown) => swallowError(err, "app.orders.loadAddressCatalog"));
      return;
    }
    // koc-orders
    const initialTab = parseLandingTab(window.location.search);
    setLandingTab(initialTab);
    orders.setLandingMode(false);
    orders.setKocMode(true);
    const loaded = orders.switchFilterScope(
      getOrderTabScope("koc-orders", initialTab),
      getOrderTabFallbackDefaults(initialTab),
    );
    orders.setKiotvietChannelNull("");
    orders.setShowOrders("true");
    await Promise.all([
      orders.loadOrders(
        {
          ...filtersToLoadOverrides(loaded),
          kiotvietChannelNull: "",
          showOrders: "true",
        },
        { force: true },
      ),
      orders.loadProducts(),
      orders.loadKiotVietOptions(),
    ]);
    orders
      .loadAddressCatalog()
      .catch((err: unknown) => swallowError(err, "app.orders.loadAddressCatalog"));
  };

  const patchOrder = async (id: number, payload: Partial<OrderRow>, silent = false) => {
    invalidateSummaryCache();
    suppressOrdersReloadUntilRef.current = Date.now() + 1500;
    const applied = await orders.patchOrder(id, payload, silent);
    // Trang chi tiết render từ standaloneOrder (bản đầy đủ, ưu tiên hơn list row) —
    // patch xong phải merge vào đó, không thì edit trên detail không hiện ra
    // (orders.patchOrder chỉ cập nhật list row; WS echo thì bị suppress 1.5s).
    if (applied) {
      setStandaloneOrder((prev) =>
        prev && prev.id === id ? mergeOrderRowPatch(prev, applied) : prev,
      );
    }
  };

  const handleCreateOrder = async (payload: Parameters<typeof orders.createOrder>[0]) => {
    const createdOrder = await orders.createOrder(payload);
    const createdOrderId = Number(createdOrder?.id);
    if (!Number.isFinite(createdOrderId)) return;
    locallyCreatedOrderIdsRef.current.add(createdOrderId);
    window.setTimeout(() => {
      locallyCreatedOrderIdsRef.current.delete(createdOrderId);
    }, 30_000);
  };

  const bulkDeleteOrders = async (ids: number[]) => {
    invalidateSummaryCache();
    await orders.bulkDeleteOrders(ids);
  };

  const runKiotVietOrderAction = async (
    action: Parameters<typeof orders.runKiotVietOrderAction>[0],
    ids: number[],
  ) => {
    invalidateSummaryCache();
    await orders.runKiotVietOrderAction(action, ids);
  };

  const runKiotVietOrderPrecheck = async (
    action: Parameters<typeof orders.runKiotVietOrderPrecheck>[0],
    ids: number[],
  ) => orders.runKiotVietOrderPrecheck(action, ids);

  return {
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
  };
}
