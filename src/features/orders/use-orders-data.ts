import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useI18n } from "@/i18n";
import { type FetchJson } from "@/services/http";
import { extractListPayload } from "@/lib/api/list-payload";
import {
  DEFAULT_FILTER_SCOPE,
  DEFAULT_ORDER_COLUMNS,
  type FilterScope,
  getStoredLockedOrderColumns,
  getStoredOrderColumns,
  getStoredOrderFilters,
  LANDING_COLUMNS_STORAGE_KEY,
  LANDING_LOCKED_COLUMNS_STORAGE_KEY,
  ORDER_COLUMNS_STORAGE_KEY,
  ORDER_LOCKED_COLUMNS_STORAGE_KEY,
  type StoredOrderFilters,
} from "@/features/orders/order-storage";
import { phoneDigits } from "@/lib/phone";
import {
  type CreateOrderPayload,
  sanitizeCreateOrderPayload,
  sanitizePatchOrderPayload,
} from "@/features/orders/order-payload";
import { getApiErrorMessage, handleApiError, swallowError } from "@/lib/errors";

export { DEFAULT_ORDER_COLUMNS };
export type { CreateOrderPayload };
export type { FilterScope, StoredOrderFilters };
import { type OrderColumnKey, type OrderRow } from "@/features/orders/order-types";
import {
  createDefaultStoredFilters,
  type FilterScopeAccess,
  filtersToLoadOverrides,
  useOrdersFilters,
  useOrdersFilterScope,
} from "@/features/orders/use-orders-filters";
import { useOrdersCatalogs } from "@/features/orders/use-orders-catalogs";
import { useOrdersBulkActions } from "@/features/orders/use-orders-bulk-actions";
import {
  clampOrdersPageSize,
  type OrdersModeAccess,
  useOrdersTable,
} from "@/features/orders/use-orders-table";

export type { OrdersSortValue } from "@/features/orders/use-orders-table";

export type {
  AddressCatalog,
  AddressCatalogDistrict,
  AddressCatalogProvince,
  AddressCatalogWard,
} from "@/features/orders/use-orders-catalogs";
export type {
  KiotVietJobLogRow,
  KiotVietOrderAction,
  KiotVietOrderPrecheckResult,
  KiotVietPrecheckInvalidOrder,
  KshipOptionsPayload,
  KshipProviderOption,
  KshipServiceExtraOption,
  KshipServiceOption,
  KshipShipperNoteOption,
} from "@/features/orders/use-orders-bulk-actions";

type CustomerRow = {
  id: number;
  code?: string;
  full_name?: string;
  phone_raw: string;
  phone_normalized: string;
  gender?: number | null;
};

export type { KiotVietOption, BranchSelectOption } from "@/features/orders/order-branch";
export { getBranchOptionsForChannel } from "@/features/orders/order-branch";

export type OrdersImportResult = {
  total_rows: number;
  success_count: number;
  failed_count: number;
  failures: Array<{
    row_number: number;
    error: string;
    phone?: string;
    name?: string;
  }>;
};

/**
 * 8 cột mặc định khi user chưa tuỳ chỉnh.
 * Thông tin chi tiết xem trong side panel — không cần hiển thị hết trên bảng.
 */

/**
 * Quyết định một realtime patch có được revalidate filter hay không.
 *
 * Update realtime của CHÍNH thao tác user (vd kship → đổi sale_status) phải GIỮ
 * row tại chỗ ngay cả khi field mới làm row hết khớp filter đang bật — chỉ
 * F5/refilter mới loại nó. Update đến từ người/khâu khác thì revalidate như cũ
 * (loại row nếu hết khớp) để tránh rò filter. Xem [[orders-list-realtime-race]].
 *
 * @returns true = revalidate (loại nếu hết khớp); false = giữ row tại chỗ.
 */
export function shouldRevalidateRealtimePatch(
  orderId: number,
  selfActionOrderIds: ReadonlySet<number>,
): boolean {
  return !selfActionOrderIds.has(orderId);
}

export function useOrdersData(fetchJson: FetchJson) {
  const { t } = useI18n();
  const landingModeRef = useRef<boolean>(false);
  // Id các đơn user vừa TỰ thao tác async (vd kship) — realtime patch của chúng
  // giữ row trong list đang lọc thay vì revalidate. Xóa khi loadOrders/F5.
  const selfActionOrderIdsRef = useRef<Set<number>>(new Set<number>());
  const [landingModeState, setLandingModeState] = useState<boolean>(false);
  const setLandingMode = useCallback((value: boolean) => {
    const next = !!value;
    landingModeRef.current = next;
    setLandingModeState(next);
  }, []);
  const kocModeRef = useRef<boolean>(false);
  const setKocMode = useCallback((value: boolean) => {
    kocModeRef.current = !!value;
  }, []);
  const filterScopeRef = useRef<FilterScope>(DEFAULT_FILTER_SCOPE);
  const storedFiltersRef = useRef<StoredOrderFilters | null>(null);
  // Lazy-init hợp lệ với React Compiler (ghi ref trong render CHỈ khi còn null,
  // đúng ngoại lệ của rule). ĐỪNG biến ref này thành mutable/ghi lại về sau —
  // ghi ref vô điều kiện trong render sẽ làm Compiler bail out cả hook.
  if (storedFiltersRef.current === null) {
    storedFiltersRef.current = getStoredOrderFilters(filterScopeRef.current);
  }
  const storedFilters = storedFiltersRef.current;
  // Cụm catalog tĩnh (sản phẩm / KiotViet options / địa chỉ) + cache TTL đã tách
  // sang useOrdersCatalogs. Alias lại về đúng tên cũ để phần còn lại giữ nguyên.
  const catalogs = useOrdersCatalogs(fetchJson);
  const {
    products,
    productsPriceBook,
    kiotvietOptions,
    addressCatalog,
    loadProducts,
    searchProducts,
    loadKiotVietOptions,
    loadAddressCatalog,
    loadDistrictsForProvince,
    loadWardsForDistrict,
    prefetchAddressCatalogForRows,
    clearProductsCache,
    clearKiotVietOptionsCache,
    clearAddressCatalogCache,
    getOrdersCacheStats,
    resetCatalogs,
  } = catalogs;
  // Cụm filter state đã tách sang useOrdersFilters (fe-04 Task 3). Alias lại các
  // biến/setters về đúng tên cũ để toàn bộ logic bên dưới (loadOrders, effects,
  // refs, clearFilters, switchFilterScope, return object) giữ nguyên không đổi.
  const filters = useOrdersFilters(storedFilters);
  const {
    q,
    dateFilter,
    returnDateFilter,
    kiotvietPurchaseDateFilter,
    status,
    channel,
    product,
    staff,
    deliveryBusinessStatus,
    salesStatus,
    kiotvietChannel,
    branchId,
    fulfillmentWarehouse,
    invoiceStatus,
    vat,
    orderType,
    shippingType,
    channelType,
    kocOrderType,
    kiotvietChannelNull,
    showOrders,
    hasShippingCode,
    hasInvoiceCode,
    isDeliveryInvoicePrinted,
    customerReturn,
    hasInternalNote,
    hasAddress,
    hasReturnSlip,
    hasRecallCode,
    hasCallRecording,
    setQ,
    setDateFilter,
    setReturnDateFilter,
    setKiotvietPurchaseDateFilter,
    setStatus,
    setChannel,
    setProduct,
    setStaff,
    setDeliveryBusinessStatus,
    setSalesStatus,
    setKiotvietChannel,
    setBranchId,
    setFulfillmentWarehouse,
    setInvoiceStatus,
    setVat,
    setOrderType,
    setShippingType,
    setChannelType,
    setKocOrderType,
    setKiotvietChannelNull,
    setShowOrders,
    setHasShippingCode,
    setHasInvoiceCode,
    setIsDeliveryInvoicePrinted,
    setCustomerReturn,
    setHasInternalNote,
    setHasAddress,
    setHasReturnSlip,
    setHasRecallCode,
    setHasCallRecording,
    reset: resetFilters,
  } = filters;
  const [visibleOrderColumns, setVisibleOrderColumns] = useState<OrderColumnKey[]>(() =>
    getStoredOrderColumns(false),
  );
  const [lockedOrderColumns, setLockedOrderColumns] = useState<OrderColumnKey[]>(() =>
    getStoredLockedOrderColumns(false),
  );
  const [openOrderHistory, setOpenOrderHistory] = useState(false);
  const [historyPhone, setHistoryPhone] = useState("");
  const [historyOrders, setHistoryOrders] = useState<OrderRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Scope + cờ chế độ: cả bảng (chọn endpoint) lẫn phần persist bộ lọc đều cần,
  // nên hook này giữ ref và chỉ đưa xuống cặp get/set ổn định identity.
  const filterScopeAccess = useMemo<FilterScopeAccess>(
    () => ({
      get: () => filterScopeRef.current,
      set: (next) => {
        filterScopeRef.current = next;
      },
    }),
    [],
  );
  const modeAccess = useMemo<OrdersModeAccess>(
    () => ({
      isLanding: () => landingModeRef.current,
      isKoc: () => kocModeRef.current,
    }),
    [],
  );
  const clearSelfActionOrders = useCallback(() => {
    selfActionOrderIdsRef.current.clear();
  }, []);

  // Bảng đơn (rows / phân trang / sort / các bộ đếm / loadOrders / cập nhật realtime
  // tại chỗ) đã tách sang useOrdersTable. Alias lại về đúng tên cũ.
  const {
    rows,
    ordersLoading,
    ordersFetching,
    ordersPage,
    ordersPageSize,
    ordersSort,
    ordersHasNextPage,
    ordersTotalCount,
    salesStatusCounts,
    statusCounts,
    temperatureCounts,
    sheetStats,
    setOrdersSort,
    setOrdersPage,
    loadOrders,
    applyOrderPatchInMemory,
    applyOrderUpsertInMemory,
    applyBroadcastRowsInMemory,
    removeOrderFromMemory,
    goToOrdersPage,
    changeOrdersPageSize,
    refreshOrders,
    clearOrdersCache,
    getOrdersExportFilters,
    resetTable,
  } = useOrdersTable({
    fetchJson,
    filters,
    scope: filterScopeAccess,
    modes: modeAccess,
    clearSelfActionOrders,
  });

  // Nhóm thao tác hàng loạt (xoá / KiotViet / Kship / transfer / import template)
  // đã tách sang useOrdersBulkActions. Chúng chỉ cần 4 phụ thuộc dưới đây, không
  // đọc filter state — nên tiêm vào thay vì để chúng nhìn thấy cả god hook.
  const reloadOrders = useCallback(() => loadOrders(undefined, { force: true }), [loadOrders]);
  const markSelfActionOrders = useCallback((ids: number[]) => {
    for (const id of ids) {
      selfActionOrderIdsRef.current.add(id);
    }
  }, []);
  const {
    bulkDeleteOrders,
    runKiotVietOrderAction,
    runKiotVietOrderPrecheck,
    fetchKiotVietLogs,
    fetchKshipOptions,
    createKshipDelivery,
    downloadOrdersImportTemplate,
    transferLandingOrders,
    cancelKiotvietOrders,
    restoreCancelledOrders,
  } = useOrdersBulkActions({
    fetchJson,
    clearOrdersCache,
    reloadOrders,
    markSelfActionOrders,
  });

  const patchOrder = useCallback(
    async (id: number, payload: Partial<OrderRow>, silent = false) => {
      try {
        const normalizedPayload = sanitizePatchOrderPayload(payload);
        const response = await fetchJson(`/api/orders/${id}`, {
          method: "PATCH",
          body: JSON.stringify(normalizedPayload),
        });
        // Use server response if available (contains auto-resolved fields), fallback to sent payload
        const serverData =
          response && typeof response === "object" && "id" in response
            ? (response as Partial<OrderRow>)
            : normalizedPayload;
        applyOrderPatchInMemory(id, serverData);
        // Hiển thị cảnh báo tồn âm nếu server trả về stock_warnings
        if (
          response &&
          typeof response === "object" &&
          "stock_warnings" in response &&
          Array.isArray((response as Record<string, unknown>).stock_warnings) &&
          ((response as Record<string, unknown>).stock_warnings as unknown[]).length > 0
        ) {
          const warnings = (response as Record<string, unknown>).stock_warnings as Array<{
            product_id?: number;
            balance_after?: number;
          }>;
          toast.warning(
            `Tồn âm sau khi xuất kho: ${warnings.length} sản phẩm (${warnings.map((w) => `#${w.product_id ?? "?"}: ${w.balance_after ?? "?"}`).join(", ")})`,
          );
        }
        if (!silent) {
          toast.success(t("orders.toast.updated"));
        }
        // Trả patch đã áp (ưu tiên server response — có field auto-resolve) để caller
        // merge vào các bản sao khác của row (App merge vào standaloneOrder cho
        // trang chi tiết, vì detail render từ bản đầy đủ chứ không phải list row).
        return serverData;
      } catch (err: unknown) {
        if (!silent) {
          toast.error(getApiErrorMessage(err, t("orders.toast.updateFailedGeneric")));
        }
        throw new Error("PATCH_FAILED");
      }
    },
    [applyOrderPatchInMemory, fetchJson, t],
  );

  const patchOrderFromRealtime = useCallback(
    (id: number, payload: Partial<OrderRow>) => {
      if (!Number.isFinite(id) || id <= 0) return;
      if (!payload || typeof payload !== "object") return;
      // Update từ xa (người/khâu khác) revalidate filter; nhưng nếu là kết quả
      // thao tác async của chính user (kship) thì GIỮ row, chỉ mất khi F5/refilter.
      const revalidate = shouldRevalidateRealtimePatch(id, selfActionOrderIdsRef.current);
      applyOrderPatchInMemory(id, payload, revalidate);
    },
    [applyOrderPatchInMemory],
  );

  const upsertOrderFromRealtime = useCallback(
    (payload: OrderRow) => {
      applyOrderUpsertInMemory(payload, true);
    },
    [applyOrderUpsertInMemory],
  );

  // Lô row đến thẳng từ payload WS order.created (bản list, không can_edit) —
  // upsert không tốn REST; can_edit được suy trong applyBroadcastRowsInMemory.
  const upsertOrderFromBroadcast = useCallback(
    (rows: OrderRow[]) => {
      applyBroadcastRowsInMemory(rows);
    },
    [applyBroadcastRowsInMemory],
  );

  const createOrder = useCallback(
    async (payload: CreateOrderPayload) => {
      try {
        const normalizedPayload = sanitizeCreateOrderPayload(payload);
        const response = await fetchJson("/api/orders/create", {
          method: "POST",
          body: JSON.stringify(normalizedPayload),
        });
        clearOrdersCache();
        await loadOrders(undefined, { force: true });
        toast.success(t("orders.toast.created"));
        let createdRow: OrderRow | null = null;
        if (response && typeof response === "object") {
          if ("id" in response) {
            createdRow = response as OrderRow;
          } else if (
            "data" in response &&
            response.data &&
            typeof response.data === "object" &&
            "id" in response.data
          ) {
            createdRow = response.data as OrderRow;
          }
        }
        // Bật "chia đơn tự động" mà đơn về vẫn trống sale = bộ chia không chạy được:
        // đơn không thuộc sheet nào (nguồn đơn không nằm trong luồng landing/tư vấn),
        // ngoài giờ làm việc, hoặc ca chưa cấu hình trọng số. Job nền sẽ vớt lại nên
        // đây là cảnh báo, không phải lỗi.
        if (normalizedPayload.auto_assign_staff && createdRow && createdRow.staff_id == null) {
          toast.warning(t("orders.toast.autoAssignPending"));
        }
        return createdRow;
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, t("orders.toast.createFailed")));
        throw new Error("CREATE_ORDER_FAILED");
      }
    },
    [clearOrdersCache, fetchJson, loadOrders, t],
  );

  const duplicateOrder = useCallback(
    async (id: number) => {
      try {
        await fetchJson(`/api/orders/${id}/duplicate`, {
          method: "POST",
        });
        clearOrdersCache();
        await loadOrders(undefined, { force: true });
      } catch (err: unknown) {
        handleApiError(err, {
          toast: t("orders.toast.duplicateFailed", "Không thể nhân bản đơn hàng."),
          context: "orders.duplicate",
        });
        throw new Error("DUPLICATE_ORDER_FAILED");
      }
    },
    [clearOrdersCache, fetchJson, loadOrders, t],
  );

  const openHistoryByPhone = useCallback(
    async (phone: string) => {
      const phoneNormalized = phoneDigits(phone);
      if (!phoneNormalized) {
        toast.error(t("orders.toast.invalidPhone"));
        return;
      }

      setOpenOrderHistory(true);
      setHistoryLoading(true);
      setHistoryPhone(phone);
      setHistoryOrders([]);

      try {
        const customerQuery = new URLSearchParams({
          q: phoneNormalized,
          limit: "50",
          offset: "0",
        });
        const customers = (await fetchJson(
          `/api/customers?${customerQuery.toString()}`,
        )) as CustomerRow[];
        const target =
          customers.find((customer) => phoneDigits(customer.phone_raw) === phoneNormalized) ??
          customers.find((customer) => customer.phone_normalized === phoneNormalized) ??
          customers[0];

        if (!target) {
          setHistoryOrders([]);
          return;
        }

        const orders = (await fetchJson(`/api/customers/${target.id}/orders`)) as OrderRow[];
        setHistoryOrders(Array.isArray(orders) ? orders : []);
      } catch (err: unknown) {
        handleApiError(err, {
          toast: t("orders.toast.fetchHistoryFailed"),
          context: "orders.historyByPhone",
        });
        setHistoryOrders([]);
      } finally {
        setHistoryLoading(false);
      }
    },
    [fetchJson, t],
  );

  const fetchOrderHistoryByPhone = useCallback(
    async (phone: string, options?: { signal?: AbortSignal }) => {
      const phoneNormalized = phoneDigits(phone);
      if (!phoneNormalized) return [] as OrderRow[];
      const query = new URLSearchParams({ phone: phoneNormalized });
      const data = await fetchJson(`/api/orders/history?${query.toString()}`, {
        signal: options?.signal,
      });
      return extractListPayload<OrderRow>(data);
    },
    [fetchJson],
  );

  const fetchCustomerByPhone = useCallback(
    async (phone: string, options?: { signal?: AbortSignal }) => {
      const phoneNormalized = phoneDigits(phone);
      if (!phoneNormalized) return null as CustomerRow | null;
      const customerQuery = new URLSearchParams({
        q: phoneNormalized,
        limit: "50",
        offset: "0",
      });
      const customers = (await fetchJson(`/api/customers?${customerQuery.toString()}`, {
        signal: options?.signal,
      })) as CustomerRow[];
      if (!Array.isArray(customers) || customers.length === 0) return null;
      return (
        customers.find((customer) => phoneDigits(customer.phone_raw) === phoneNormalized) ??
        customers.find((customer) => customer.phone_normalized === phoneNormalized) ??
        customers[0] ??
        null
      );
    },
    [fetchJson],
  );

  const toggleOrderColumn = useCallback((key: OrderColumnKey) => {
    setVisibleOrderColumns((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev;
        setLockedOrderColumns((lockedPrev) => lockedPrev.filter((column) => column !== key));
        return prev.filter((column) => column !== key);
      }
      return [...prev, key];
    });
  }, []);

  const toggleLockOrderColumn = useCallback((key: OrderColumnKey) => {
    setLockedOrderColumns((prev) => {
      if (prev.includes(key)) {
        return prev.filter((column) => column !== key);
      }
      return [...prev, key];
    });
  }, []);

  /**
   * Ghi đè cả danh sách cột (kéo đổi thứ tự, bật/tắt cả nhóm, áp preset).
   *
   * Phải dọn `lockedOrderColumns` theo: cột đã bị ẩn mà vẫn nằm trong danh sách
   * ghim thì lần bật lại sau đó nó tự dính sticky, còn offset cột ghim thì tính
   * theo một cột không còn render.
   */
  const setOrderColumns = useCallback((next: OrderColumnKey[]) => {
    if (next.length === 0) return;
    setVisibleOrderColumns(next);
    setLockedOrderColumns((prev) => {
      const kept = prev.filter((column) => next.includes(column));
      return kept.length === prev.length ? prev : kept;
    });
  }, []);

  const resetOrderColumns = useCallback(() => {
    setVisibleOrderColumns(DEFAULT_ORDER_COLUMNS);
    setLockedOrderColumns([]);
  }, []);

  // Sheet 3: ghi liên hệ (append-only) rồi tải lại trang hiện tại.
  const logContact = useCallback(
    async (
      orderId: number,
      payload: {
        outcome?: string;
        transcript?: string;
        sales_status?: string;
        not_closed_reason?: string;
      },
    ) => {
      try {
        await fetchJson(`/api/orders/${orderId}/contact-log`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success(t("orders.toast.updated"));
        await goToOrdersPage(ordersPage, { force: true });
      } catch (err: unknown) {
        handleApiError(err, {
          toast: t("orders.toast.updateFailedGeneric"),
          context: "orders.contactLog",
        });
        throw new Error("CONTACT_LOG_FAILED");
      }
    },
    [fetchJson, goToOrdersPage, ordersPage, t],
  );

  // Sheet 3: đóng case (archive) rồi tải lại trang hiện tại.
  const closeCase = useCallback(
    async (orderId: number, reason?: string) => {
      try {
        await fetchJson(`/api/orders/${orderId}/close-case`, {
          method: "POST",
          body: JSON.stringify({ reason }),
        });
        toast.success(t("orders.toast.updated"));
        await goToOrdersPage(ordersPage, { force: true });
      } catch (err: unknown) {
        handleApiError(err, {
          toast: t("orders.toast.updateFailedGeneric"),
          context: "orders.closeCase",
        });
        throw new Error("CLOSE_CASE_FAILED");
      }
    },
    [fetchJson, goToOrdersPage, ordersPage, t],
  );

  const clearFilters = useCallback(async () => {
    const safePageSize = clampOrdersPageSize(Number(ordersPageSize));
    resetFilters();
    setOrdersPage(0);
    // Override phải phủ ĐỦ mọi trục lọc: loadOrders vẫn đọc state của render trước
    // (resetFilters mới chỉ xếp hàng setState). Bản chép tay cũ thiếu vat /
    // order_type nên "Xoá lọc" xong list vẫn bị lọc theo 2 trục đó.
    await loadOrders({
      ...filtersToLoadOverrides(createDefaultStoredFilters()),
      q: "",
      limit: safePageSize,
      offset: 0,
    });
  }, [loadOrders, ordersPageSize, resetFilters, setOrdersPage]);

  const persistVisibleColumns = useCallback(() => {
    try {
      const key = landingModeState ? LANDING_COLUMNS_STORAGE_KEY : ORDER_COLUMNS_STORAGE_KEY;
      localStorage.setItem(key, JSON.stringify(visibleOrderColumns));
    } catch (err) {
      // ignore storage error
      swallowError(err, "orders.columns.storage");
    }
  }, [visibleOrderColumns, landingModeState]);

  const persistLockedColumns = useCallback(() => {
    try {
      const key = landingModeState
        ? LANDING_LOCKED_COLUMNS_STORAGE_KEY
        : ORDER_LOCKED_COLUMNS_STORAGE_KEY;
      localStorage.setItem(key, JSON.stringify(lockedOrderColumns));
    } catch (err) {
      // ignore storage error
      swallowError(err, "orders.lockedColumns.storage");
    }
  }, [lockedOrderColumns, landingModeState]);

  // Khi user chuyển giữa Orders <-> Landing, load lại visibleColumns/lockedColumns
  // tương ứng từ localStorage để mỗi trang có cấu hình cột riêng.
  const initialModeAppliedRef = useRef(false);
  useEffect(() => {
    // Bỏ qua lần render đầu — state đã init từ orders mode rồi.
    if (!initialModeAppliedRef.current) {
      initialModeAppliedRef.current = true;
      return;
    }
    setVisibleOrderColumns(getStoredOrderColumns(landingModeState));
    setLockedOrderColumns(getStoredLockedOrderColumns(landingModeState));
  }, [landingModeState]);

  // Scope bộ lọc (mỗi tab một key localStorage) + effect persist đã tách sang
  // useOrdersFilterScope. Gọi ĐÚNG vị trí cũ để thứ tự chạy effect không đổi.
  const { switchFilterScope } = useOrdersFilterScope({ filters, scope: filterScopeAccess });

  const resetOrdersData = useCallback(() => {
    setOpenOrderHistory(false);
    setHistoryPhone("");
    setHistoryOrders([]);
    setHistoryLoading(false);
    // Dọn rows/phân trang/sort/bộ đếm của bảng…
    resetTable();
    // …và state + cache của 3 catalog (products / kiotviet options / address).
    resetCatalogs();
  }, [resetCatalogs, resetTable]);

  return {
    rows,
    getOrdersExportFilters,
    ordersLoading,
    ordersFetching,
    ordersPage,
    ordersPageSize,
    ordersSort,
    ordersHasNextPage,
    ordersTotalCount,
    salesStatusCounts,
    statusCounts,
    temperatureCounts,
    sheetStats,
    logContact,
    closeCase,
    products,
    productsPriceBook,
    q,
    dateFilter,
    returnDateFilter,
    kiotvietPurchaseDateFilter,
    status,
    channel,
    product,
    staff,
    deliveryBusinessStatus,
    salesStatus,
    kiotvietChannel,
    branchId,
    fulfillmentWarehouse,
    invoiceStatus,
    vat,
    orderType,
    shippingType,
    channelType,
    kocOrderType,
    kiotvietChannelNull,
    showOrders,
    hasShippingCode,
    hasInvoiceCode,
    isDeliveryInvoicePrinted,
    customerReturn,
    hasInternalNote,
    hasAddress,
    hasReturnSlip,
    hasRecallCode,
    hasCallRecording,
    visibleOrderColumns,
    lockedOrderColumns,
    kiotvietOptions,
    addressCatalog,
    openOrderHistory,
    historyPhone,
    historyOrders,
    historyLoading,
    setQ,
    setDateFilter,
    setReturnDateFilter,
    setKiotvietPurchaseDateFilter,
    setStatus,
    setChannel,
    setProduct,
    setStaff,
    setDeliveryBusinessStatus,
    setSalesStatus,
    setKiotvietChannel,
    setBranchId,
    setFulfillmentWarehouse,
    setInvoiceStatus,
    setVat,
    setOrderType,
    setShippingType,
    setChannelType,
    setKocOrderType,
    setKiotvietChannelNull,
    setShowOrders,
    setHasShippingCode,
    setHasInvoiceCode,
    setIsDeliveryInvoicePrinted,
    setCustomerReturn,
    setHasInternalNote,
    setHasAddress,
    setHasReturnSlip,
    setHasRecallCode,
    setHasCallRecording,
    setOrdersSort,
    setOpenOrderHistory,
    setLandingMode,
    setKocMode,
    switchFilterScope,
    loadOrders,
    loadProducts,
    searchProducts,
    patchOrder,
    patchOrderFromRealtime,
    upsertOrderFromRealtime,
    upsertOrderFromBroadcast,
    removeOrderFromRealtime: removeOrderFromMemory,
    createOrder,
    duplicateOrder,
    bulkDeleteOrders,
    runKiotVietOrderPrecheck,
    runKiotVietOrderAction,
    loadKiotVietOptions,
    loadAddressCatalog,
    loadDistrictsForProvince,
    loadWardsForDistrict,
    prefetchAddressCatalogForRows,
    openHistoryByPhone,
    fetchOrderHistoryByPhone,
    fetchCustomerByPhone,
    fetchKiotVietLogs,
    fetchKshipOptions,
    downloadOrdersImportTemplate,
    transferLandingOrders,
    cancelKiotvietOrders,
    restoreCancelledOrders,
    refreshOrders,
    getOrdersCacheStats,
    toggleOrderColumn,
    toggleLockOrderColumn,
    setOrderColumns,
    resetOrderColumns,
    goToOrdersPage,
    changeOrdersPageSize,
    clearFilters,
    clearOrdersCache,
    clearProductsCache,
    clearKiotVietOptionsCache,
    clearAddressCatalogCache,
    persistVisibleColumns,
    persistLockedColumns,
    resetOrdersData,
    createKshipDelivery,
  };
}
