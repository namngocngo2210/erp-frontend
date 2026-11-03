import { useCallback, useRef } from "react";

import { extractListPayload } from "@/lib/api/list-payload";
import { type OrderRow } from "@/features/orders/order-types";
import type {
  FilterScopeAccess,
  UseOrdersFiltersReturn,
} from "@/features/orders/use-orders-filters";

import {
  clampOrdersPageSize,
  type FetchJson,
  type LoadOrdersOverrides,
  type OrdersModeAccess,
  type OrdersSortValue,
} from "./shared";
import { type OrdersTableState } from "./use-table-state";
import { swallowError } from "@/lib/errors";

type UseLoadOrdersDeps = {
  fetchJson: FetchJson;
  filters: UseOrdersFiltersReturn;
  /** Chỉ đọc — dùng để chọn endpoint sheet 1/2/3 của trang Landing. */
  scope: FilterScopeAccess;
  modes: OrdersModeAccess;
  /**
   * Xoá dấu "đơn user vừa tự thao tác" khi có danh sách mới từ server (nguồn chân
   * lý). Set do `useOrdersData` sở hữu vì realtime handler cũng đọc nó.
   */
  clearSelfActionOrders: () => void;
  state: OrdersTableState;
};

/**
 * Toàn bộ luồng `loadOrders` (chống race bằng seq, chế độ counts-only debounced)
 * cùng điều hướng phân trang (`goToOrdersPage` / `changeOrdersPageSize` /
 * `refreshOrders`) và snapshot bộ lọc cho "Xuất Excel toàn bộ theo bộ lọc"
 * (`getOrdersExportFilters` — đọc ref trong handler, xem chú thích ở
 * useOrdersTableData.ts về bẫy React Compiler đóng băng ref đọc trong render).
 *
 * Tách từ use-orders-table.ts (composition); hành vi giữ NGUYÊN từng dòng.
 */
export function useLoadOrders({
  fetchJson,
  filters,
  scope,
  modes,
  clearSelfActionOrders,
  state,
}: UseLoadOrdersDeps) {
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
  } = filters;
  const {
    rowsCountRef,
    ordersPage,
    ordersPageSize,
    ordersSort,
    setRows,
    setOrdersLoading,
    setOrdersFetching,
    setOrdersPage,
    setOrdersPageSize,
    setOrdersHasNextPage,
    setOrdersTotalCount,
    setSalesStatusCounts,
    setStatusCounts,
    setTemperatureCounts,
    setSheetStats,
    clearOrdersCache,
  } = state;

  // Bộ lọc danh sách hiện tại (đã bỏ phân trang) để "Xuất Excel" có thể xuất TOÀN BỘ
  // đơn khớp bộ lọc thay vì chỉ trang đang xem. null = không khả dụng (Landing/KOC có
  // scope server-side riêng nên giữ luồng xuất theo lựa chọn).
  const ordersExportFiltersRef = useRef<Record<string, unknown> | null>(null);
  // Seq tăng dần cho mỗi lần loadOrders để bỏ response cũ (xem loadOrders).
  const loadOrdersSeqRef = useRef(0);

  const loadOrders = useCallback(
    async (
      overrides?: LoadOrdersOverrides,
      _options?: { force?: boolean; statusCountsOnly?: boolean },
    ) => {
      // statusCountsOnly: chỉ revalidate statusCounts (chip lọc trạng thái) với đúng
      // bộ filter hiện hành — KHÔNG đụng rows/pagination/loading state. Dùng cho
      // realtime event trỏ tới đơn ngoài trang (xem scheduleStatusCountsRefresh).
      const statusCountsOnly = _options?.statusCountsOnly === true;
      // Chống race: mỗi lần gọi nhận một seq tăng dần. Khi response về, nếu đã có
      // lần load mới hơn (ví dụ user đổi bộ lọc vat ngay sau một reload nền do
      // WebSocket/đổi ngày kích hoạt) thì BỎ kết quả cũ, không setRows — tránh
      // response cũ (chưa kèm filter) ghi đè danh sách đã lọc. Đây là gốc rễ lỗi
      // "request có filter mà list lúc lọc được lúc không".
      // Counts-only KHÔNG bump seq (không được làm full-load đang bay bị coi là cũ)
      // — chỉ chụp seq hiện tại để tự bỏ kết quả nếu một full-load mới hơn xuất hiện.
      const requestSeq = statusCountsOnly
        ? loadOrdersSeqRef.current
        : (loadOrdersSeqRef.current += 1);
      const qValue = overrides?.q ?? q;
      const dateFilterValue = overrides?.dateFilter ?? dateFilter;
      const dateFromValue = dateFilterValue.from || "";
      const dateToValue = dateFilterValue.to || "";
      const returnDateFrom = (overrides?.returnDateFilter ?? returnDateFilter)?.from || "";
      const returnDateTo = (overrides?.returnDateFilter ?? returnDateFilter)?.to || "";
      const kiotvietPurchaseDateFrom =
        (overrides?.kiotvietPurchaseDateFilter ?? kiotvietPurchaseDateFilter)?.from || "";
      const kiotvietPurchaseDateTo =
        (overrides?.kiotvietPurchaseDateFilter ?? kiotvietPurchaseDateFilter)?.to || "";
      const statusValue = Array.from(
        new Set((overrides?.status ?? status).map((item) => String(item).trim()).filter(Boolean)),
      ).sort();
      const channelValue = Array.from(
        new Set((overrides?.channel ?? channel).map((item) => String(item).trim()).filter(Boolean)),
      ).sort();
      const productValue = Array.from(
        new Set((overrides?.product ?? product).map((item) => String(item).trim()).filter(Boolean)),
      ).sort();
      const staffValue = Array.from(
        new Set((overrides?.staff ?? staff).map((item) => String(item).trim()).filter(Boolean)),
      ).sort();
      const deliveryBusinessStatusValue = Array.from(
        new Set(
          (overrides?.deliveryBusinessStatus ?? deliveryBusinessStatus)
            .map((item) => String(item).trim())
            .filter(Boolean),
        ),
      ).sort();
      const salesStatusValue = Array.from(
        new Set(
          (overrides?.salesStatus ?? salesStatus)
            .map((item) => String(item).trim())
            .filter(Boolean),
        ),
      ).sort();
      const kiotvietChannelValue = Array.from(
        new Set(
          (overrides?.kiotvietChannel ?? kiotvietChannel)
            .map((item) => String(item).trim())
            .filter(Boolean),
        ),
      ).sort();
      const branchIdValue = Array.from(
        new Set(
          (overrides?.branchId ?? branchId).map((item) => String(item).trim()).filter(Boolean),
        ),
      ).sort();
      const fulfillmentWarehouseValue = Array.from(
        new Set(
          (overrides?.fulfillmentWarehouse ?? fulfillmentWarehouse)
            .map((item) => String(item).trim())
            .filter(Boolean),
        ),
      ).sort();
      const invoiceStatusValue = Array.from(
        new Set(
          (overrides?.invoiceStatus ?? invoiceStatus)
            .map((item) => String(item).trim())
            .filter(Boolean),
        ),
      ).sort();
      const vatValue = Array.from(
        new Set((overrides?.vat ?? vat).map((item) => String(item).trim()).filter(Boolean)),
      ).sort();
      const orderTypeValue = Array.from(
        new Set(
          (overrides?.orderType ?? orderType).map((item) => String(item).trim()).filter(Boolean),
        ),
      ).sort();
      const shippingTypeValue = Array.from(
        new Set(
          (overrides?.shippingType ?? shippingType)
            .map((item) => String(item).trim())
            .filter(Boolean),
        ),
      ).sort();
      const channelTypeValue = Array.from(
        new Set(
          (overrides?.channelType ?? channelType)
            .map((item) => String(item).trim())
            .filter(Boolean),
        ),
      ).sort();
      const kocOrderTypeValue = Array.from(
        new Set(
          (overrides?.kocOrderType ?? kocOrderType)
            .map((item) => String(item).trim())
            .filter(Boolean),
        ),
      ).sort();
      const kiotvietChannelNullValue = (
        overrides?.kiotvietChannelNull ?? kiotvietChannelNull
      ).trim();
      const showOrdersValue = (overrides?.showOrders ?? showOrders).trim();
      const hasShippingCodeValue = (overrides?.hasShippingCode ?? hasShippingCode).trim();
      const hasInvoiceCodeValue = (overrides?.hasInvoiceCode ?? hasInvoiceCode).trim();
      const isDeliveryInvoicePrintedValue = (
        overrides?.isDeliveryInvoicePrinted ?? isDeliveryInvoicePrinted
      ).trim();
      const customerReturnValue = (overrides?.customerReturn ?? customerReturn).trim();
      const hasInternalNoteValue = (overrides?.hasInternalNote ?? hasInternalNote).trim();
      const hasAddressValue = (overrides?.hasAddress ?? hasAddress).trim();
      const hasReturnSlipValue = (overrides?.hasReturnSlip ?? hasReturnSlip).trim();
      const hasRecallCodeValue = (overrides?.hasRecallCode ?? hasRecallCode).trim();
      const hasCallRecordingValue = (overrides?.hasCallRecording ?? hasCallRecording).trim();
      const sortValue: OrdersSortValue = overrides?.sort ?? ordersSort;
      const safePageSize = clampOrdersPageSize(Number(ordersPageSize));
      const limitValue = overrides?.limit ?? safePageSize;
      const safeLimit = clampOrdersPageSize(Number(limitValue));
      const defaultOffset = Math.max(0, ordersPage * safeLimit);
      const offsetValue = overrides?.offset ?? defaultOffset;
      const safeOffset =
        Number.isFinite(offsetValue) && offsetValue >= 0 ? Math.trunc(offsetValue) : 0;

      const isLandingMode = modes.isLanding();

      const buildBody = (offset: number, limit: number) => {
        const body: Record<string, unknown> = {
          limit,
          offset,
          sort: sortValue,
        };
        if (dateFromValue) body.date_from = dateFromValue;
        if (dateToValue) body.date_to = dateToValue;
        if (returnDateFrom) body.return_date_from = returnDateFrom;
        if (returnDateTo) body.return_date_to = returnDateTo;
        if (kiotvietPurchaseDateFrom) body.kiotviet_purchase_date_from = kiotvietPurchaseDateFrom;
        if (kiotvietPurchaseDateTo) body.kiotviet_purchase_date_to = kiotvietPurchaseDateTo;
        if (channelValue.length > 0) body.channel = channelValue;
        if (qValue) body.q = qValue;
        if (staffValue.length > 0) body.staff = staffValue;
        if (salesStatusValue.length > 0) body.sales_status = salesStatusValue;
        const filteredStatus = statusValue.filter((v) => v !== "6");
        if (filteredStatus.length > 0) body.status = filteredStatus;
        if (invoiceStatusValue.length > 0) body.invoice_status = invoiceStatusValue;
        if (vatValue.length > 0) body.vat = vatValue;
        if (orderTypeValue.length > 0) body.order_type = orderTypeValue;
        if (shippingTypeValue.length > 0) body.shipping_type = shippingTypeValue;
        if (channelTypeValue.length > 0) body.channel_type = channelTypeValue;
        // BE parse cả ở sheet3_view.py để giữ parity, dù Sheet 3 hard-exclude
        // order_source=koc nên trục này là no-op về dữ liệu trên tab đó.
        if (kocOrderTypeValue.length > 0) body.koc_order_type = kocOrderTypeValue;
        if (productValue.length > 0) body.product = productValue;
        if (deliveryBusinessStatusValue.length > 0)
          body.delivery_business_status = deliveryBusinessStatusValue;
        if (kiotvietChannelValue.length > 0) body.kiotviet_channel = kiotvietChannelValue;
        if (branchIdValue.length > 0) body.branch_id = branchIdValue;
        if (fulfillmentWarehouseValue.length > 0)
          body.fulfillment_warehouse = fulfillmentWarehouseValue;
        if (hasShippingCodeValue) body.has_shipping_code = hasShippingCodeValue;
        if (hasInvoiceCodeValue) body.has_invoice_code = hasInvoiceCodeValue;
        if (isDeliveryInvoicePrintedValue)
          body.is_delivery_invoice_printed = isDeliveryInvoicePrintedValue;
        if (customerReturnValue) body.customer_return = customerReturnValue;
        if (hasInternalNoteValue) body.has_internal_note = hasInternalNoteValue;
        if (hasAddressValue) body.has_address = hasAddressValue;
        if (hasReturnSlipValue) body.has_return_slip = hasReturnSlipValue;
        if (hasRecallCodeValue) body.has_recall_code = hasRecallCodeValue;
        if (hasCallRecordingValue) body.has_call_recording = hasCallRecordingValue;
        if (isLandingMode) {
          // Phân Sheet 1/2 cho trang Landing dựa trên scope hiện tại.
          const currentScope = scope.get();
          if (currentScope === "landing-sheet1" || currentScope === "landing-sale")
            body.sheet = "1";
          else if (currentScope === "landing-sheet2") body.sheet = "2";
          return body;
        }
        if (kiotvietChannelNullValue) body.kiotviet_channel_null = kiotvietChannelNullValue;
        if (showOrdersValue) body.show_orders = showOrdersValue;
        return body;
      };

      const singlePageBody = buildBody(safeOffset, safeLimit);
      // Sheet 3 (follow-up) dùng endpoint riêng trả thêm temperature/contact_count.
      const isSheet3 = isLandingMode && scope.get() === "landing-sheet3";
      // Snapshot bộ lọc (không phân trang) cho chức năng xuất toàn bộ theo bộ lọc.
      // Backend khóa cứng tập đơn theo `section` (_section_filter_overrides) nên
      // mọi trang đơn đều xuất được; riêng Sheet 3 dùng endpoint riêng với ràng
      // buộc ngoài bộ lọc chung → vẫn bắt chọn row. Counts-only không đụng
      // snapshot (không phải một lần "load danh sách").
      if (!statusCountsOnly) {
        if (!isSheet3) {
          const exportBody = buildBody(0, safeLimit);
          delete exportBody.limit;
          delete exportBody.offset;
          delete exportBody.sort;
          ordersExportFiltersRef.current = exportBody;
        } else {
          ordersExportFiltersRef.current = null;
        }
      }
      const endpoint = isSheet3
        ? `/api/orders/sheet3`
        : isLandingMode
          ? `/api/orders/landing`
          : modes.isKoc()
            ? `/api/orders/koc`
            : `/api/orders`;

      if (statusCountsOnly) {
        // Counts-only: request nhẹ nhất có thể (limit 1 — backend vẫn trả
        // status_counts đầy đủ cho toàn tập filter), không loading state, không
        // setRows/pagination. Lỗi thì bỏ qua im lặng — counts giữ nguyên, lần
        // loadOrders kế tiếp sẽ tự sửa.
        try {
          const data = await fetchJson(endpoint, {
            method: "POST",
            body: JSON.stringify(buildBody(0, 1)),
          });
          // Có full-load mới hơn đã bắt đầu → response counts này cũ, bỏ.
          if (requestSeq !== loadOrdersSeqRef.current) return;
          if (data && typeof data === "object" && "status_counts" in data) {
            const rawStatus = (data as Record<string, unknown>).status_counts;
            if (rawStatus && typeof rawStatus === "object") {
              const normalizedStatus: Record<string, number> = {};
              for (const [key, value] of Object.entries(rawStatus as Record<string, unknown>)) {
                if (typeof value === "number") normalizedStatus[key] = value;
              }
              setStatusCounts(normalizedStatus);
            }
          }
        } catch (err) {
          // im lặng theo chủ đích (xem trên)
          swallowError(err, "orders.statusCounts");
        }
        return;
      }

      setOrdersFetching(true);
      const shouldShowLoadingOverlay = rowsCountRef.current === 0;
      if (shouldShowLoadingOverlay) {
        setOrdersLoading(true);
      }
      try {
        const data = await fetchJson(endpoint, {
          method: "POST",
          body: JSON.stringify(singlePageBody),
        });
        // Response đã cũ (có lần load mới hơn đang/đã chạy) → bỏ, không ghi đè state.
        if (requestSeq !== loadOrdersSeqRef.current) {
          return;
        }
        const parsed = extractListPayload<OrderRow>(data);
        setOrdersHasNextPage(parsed.length >= safeLimit);
        if (
          data &&
          typeof data === "object" &&
          "count" in data &&
          typeof (data as Record<string, unknown>).count === "number"
        ) {
          setOrdersTotalCount((data as Record<string, unknown>).count as number);
        }
        if (data && typeof data === "object" && "status_counts" in data) {
          const rawStatus = (data as Record<string, unknown>).status_counts;
          if (rawStatus && typeof rawStatus === "object") {
            const normalizedStatus: Record<string, number> = {};
            for (const [key, value] of Object.entries(rawStatus as Record<string, unknown>)) {
              if (typeof value === "number") normalizedStatus[key] = value;
            }
            setStatusCounts(normalizedStatus);
          } else {
            setStatusCounts({});
          }
        } else {
          setStatusCounts({});
        }
        if (data && typeof data === "object" && "sales_status_counts" in data) {
          const raw = (data as Record<string, unknown>).sales_status_counts;
          if (raw && typeof raw === "object") {
            const normalized: Record<string, number> = {};
            for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
              if (typeof value === "number") normalized[key] = value;
            }
            setSalesStatusCounts(normalized);
          }
        } else if (isLandingMode) {
          setSalesStatusCounts({});
        }
        if (data && typeof data === "object" && "temperature_counts" in data) {
          const rawTemp = (data as Record<string, unknown>).temperature_counts;
          if (rawTemp && typeof rawTemp === "object") {
            const normalizedTemp: Record<string, number> = {};
            for (const [key, value] of Object.entries(rawTemp as Record<string, unknown>)) {
              if (typeof value === "number") normalizedTemp[key] = value;
            }
            setTemperatureCounts(normalizedTemp);
          }
        } else if (isSheet3) {
          setTemperatureCounts({});
        }
        if (data && typeof data === "object" && "sheet_stats" in data) {
          const rawStats = (data as Record<string, unknown>).sheet_stats;
          if (rawStats && typeof rawStats === "object") {
            const normalizedStats: Record<string, number> = {};
            for (const [key, value] of Object.entries(rawStats as Record<string, unknown>)) {
              if (typeof value === "number") normalizedStats[key] = value;
            }
            setSheetStats(normalizedStats);
          }
        } else {
          setSheetStats({});
        }
        // Danh sách mới từ server là nguồn chân lý → bỏ bảo vệ self-action; đơn
        // user vừa kship mà hết khớp filter sẽ không có trong kết quả → mất ở đây
        // (đúng ý "chỉ mất khi F5/refilter").
        clearSelfActionOrders();
        setRows(parsed);
      } finally {
        // Chỉ lần load mới nhất mới được tắt overlay, tránh response cũ tắt loading
        // của request đang chạy.
        if (requestSeq === loadOrdersSeqRef.current) {
          setOrdersFetching(false);
          if (shouldShowLoadingOverlay) {
            setOrdersLoading(false);
          }
        }
      }
    },
    [
      clearSelfActionOrders,
      modes,
      scope,
      branchId,
      fulfillmentWarehouse,
      channel,
      dateFilter,
      returnDateFilter,
      kiotvietPurchaseDateFilter,
      deliveryBusinessStatus,
      salesStatus,
      fetchJson,
      hasInvoiceCode,
      hasShippingCode,
      isDeliveryInvoicePrinted,
      customerReturn,
      hasInternalNote,
      hasAddress,
      hasReturnSlip,
      hasRecallCode,
      hasCallRecording,
      invoiceStatus,
      vat,
      orderType,
      shippingType,
      channelType,
      kocOrderType,
      kiotvietChannel,
      kiotvietChannelNull,
      ordersPage,
      ordersPageSize,
      ordersSort,
      product,
      q,
      showOrders,
      staff,
      status,
      rowsCountRef,
      setOrdersFetching,
      setOrdersHasNextPage,
      setOrdersLoading,
      setOrdersTotalCount,
      setRows,
      setSalesStatusCounts,
      setSheetStats,
      setStatusCounts,
      setTemperatureCounts,
    ],
  );

  const goToOrdersPage = useCallback(
    async (nextPage: number, options?: { force?: boolean; overrides?: LoadOrdersOverrides }) => {
      const safePage = Number.isFinite(nextPage) && nextPage > 0 ? Math.trunc(nextPage) : 0;
      const safePageSize = clampOrdersPageSize(Number(ordersPageSize));
      const offset = safePage * safePageSize;
      setOrdersPage(safePage);
      await loadOrders(
        { limit: safePageSize, offset, ...options?.overrides },
        { force: options?.force ?? true },
      );
    },
    [loadOrders, ordersPageSize, setOrdersPage],
  );

  const changeOrdersPageSize = useCallback(
    async (nextPageSize: number, options?: { force?: boolean }) => {
      const safePageSize = clampOrdersPageSize(Number(nextPageSize));
      setOrdersPageSize(safePageSize);
      setOrdersPage(0);
      await loadOrders({ limit: safePageSize, offset: 0 }, { force: options?.force ?? true });
    },
    [loadOrders, setOrdersPage, setOrdersPageSize],
  );

  const refreshOrders = useCallback(async () => {
    const safePageSize = clampOrdersPageSize(Number(ordersPageSize));
    clearOrdersCache();
    await loadOrders(
      {
        limit: safePageSize,
        offset: Math.max(0, ordersPage * safePageSize),
      },
      { force: true },
    );
  }, [clearOrdersCache, loadOrders, ordersPage, ordersPageSize]);

  const getOrdersExportFilters = useCallback(() => ordersExportFiltersRef.current, []);

  return {
    loadOrders,
    goToOrdersPage,
    changeOrdersPageSize,
    refreshOrders,
    getOrdersExportFilters,
  };
}
