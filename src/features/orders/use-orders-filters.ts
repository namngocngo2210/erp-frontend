import { useCallback, useEffect, useRef, useState } from "react";

import { type DateFilterValue } from "@/components/ui/date-filter";
import {
  createDefaultStoredFilters,
  type FilterScope,
  getFilterStorageKey,
  getStoredOrderFilters,
  type StoredOrderFilters,
} from "@/features/orders/order-storage";
import { type LoadOrdersOverrides } from "@/features/orders/use-orders-table";
import { swallowError } from "@/lib/errors";

export { createDefaultStoredFilters };

/**
 * Chuyển một bộ lọc đã lưu thành override ĐẦY ĐỦ cho `loadOrders`.
 *
 * Vì sao bắt buộc: `loadOrders` là useCallback đóng gói state filter của render
 * hiện tại. Khi đổi scope (đổi tab / đổi trang) hay xoá lọc, ta gọi setState rồi
 * gọi `loadOrders` NGAY trong cùng event — closure vẫn giữ giá trị cũ, nên trường
 * nào không có override sẽ gửi giá trị của scope TRƯỚC lên server trong khi panel
 * đã hiển thị giá trị mới → "list không khớp bộ lọc, phải xoá lọc rồi lọc lại".
 *
 * Trước đây danh sách override được chép tay ở 6 call site (App: 4 nhánh section,
 * RootLayout: đổi tab, useOrdersData: clearFilters) nên cứ thêm filter mới là
 * thiếu ở đâu đó. Spread nguyên object để TypeScript ép StoredOrderFilters và
 * LoadOrdersOverrides luôn đồng bộ — không thể quên trường nào nữa.
 */
export function filtersToLoadOverrides(filters: StoredOrderFilters): LoadOrdersOverrides {
  return { ...filters };
}

/**
 * Owns the orders filter state cluster previously inlined in `useOrdersData`.
 *
 * Behaviour is intentionally identical to the prior inline `useState`s:
 * - `q` starts empty (NOT from stored filters).
 * - `kiotvietChannelNull` / `showOrders` start empty (NOT from stored filters)
 *   and are NOT touched by `reset()` — mirroring the old `clearFilters`, which
 *   left them as-is.
 * - All other values seed from `storedFilters`.
 * - `reset()` restores the same defaults the god hook's `clearFilters` used.
 */
export type UseOrdersFiltersReturn = {
  q: string;
  dateFilter: DateFilterValue;
  returnDateFilter: DateFilterValue;
  kiotvietPurchaseDateFilter: DateFilterValue;
  status: string[];
  channel: string[];
  product: string[];
  staff: string[];
  deliveryBusinessStatus: string[];
  salesStatus: string[];
  kiotvietChannel: string[];
  branchId: string[];
  fulfillmentWarehouse: string[];
  invoiceStatus: string[];
  vat: string[];
  orderType: string[];
  shippingType: string[];
  channelType: string[];
  kocOrderType: string[];
  kiotvietChannelNull: string;
  showOrders: string;
  hasShippingCode: string;
  hasInvoiceCode: string;
  isDeliveryInvoicePrinted: string;
  customerReturn: string;
  hasInternalNote: string;
  hasAddress: string;
  hasReturnSlip: string;
  hasRecallCode: string;
  hasCallRecording: string;
  setQ: React.Dispatch<React.SetStateAction<string>>;
  setDateFilter: React.Dispatch<React.SetStateAction<DateFilterValue>>;
  setReturnDateFilter: React.Dispatch<React.SetStateAction<DateFilterValue>>;
  setKiotvietPurchaseDateFilter: React.Dispatch<React.SetStateAction<DateFilterValue>>;
  setStatus: React.Dispatch<React.SetStateAction<string[]>>;
  setChannel: React.Dispatch<React.SetStateAction<string[]>>;
  setProduct: React.Dispatch<React.SetStateAction<string[]>>;
  setStaff: React.Dispatch<React.SetStateAction<string[]>>;
  setDeliveryBusinessStatus: React.Dispatch<React.SetStateAction<string[]>>;
  setSalesStatus: React.Dispatch<React.SetStateAction<string[]>>;
  setKiotvietChannel: React.Dispatch<React.SetStateAction<string[]>>;
  setBranchId: React.Dispatch<React.SetStateAction<string[]>>;
  setFulfillmentWarehouse: React.Dispatch<React.SetStateAction<string[]>>;
  setInvoiceStatus: React.Dispatch<React.SetStateAction<string[]>>;
  setVat: React.Dispatch<React.SetStateAction<string[]>>;
  setOrderType: React.Dispatch<React.SetStateAction<string[]>>;
  setShippingType: React.Dispatch<React.SetStateAction<string[]>>;
  setChannelType: React.Dispatch<React.SetStateAction<string[]>>;
  setKocOrderType: React.Dispatch<React.SetStateAction<string[]>>;
  setKiotvietChannelNull: React.Dispatch<React.SetStateAction<string>>;
  setShowOrders: React.Dispatch<React.SetStateAction<string>>;
  setHasShippingCode: React.Dispatch<React.SetStateAction<string>>;
  setHasInvoiceCode: React.Dispatch<React.SetStateAction<string>>;
  setIsDeliveryInvoicePrinted: React.Dispatch<React.SetStateAction<string>>;
  setCustomerReturn: React.Dispatch<React.SetStateAction<string>>;
  setHasInternalNote: React.Dispatch<React.SetStateAction<string>>;
  setHasAddress: React.Dispatch<React.SetStateAction<string>>;
  setHasReturnSlip: React.Dispatch<React.SetStateAction<string>>;
  setHasRecallCode: React.Dispatch<React.SetStateAction<string>>;
  setHasCallRecording: React.Dispatch<React.SetStateAction<string>>;
  reset: () => void;
};

export function useOrdersFilters(storedFilters: StoredOrderFilters): UseOrdersFiltersReturn {
  const [q, setQ] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(storedFilters.dateFilter);
  const [returnDateFilter, setReturnDateFilter] = useState<DateFilterValue>(
    storedFilters.returnDateFilter,
  );
  const [kiotvietPurchaseDateFilter, setKiotvietPurchaseDateFilter] = useState<DateFilterValue>(
    storedFilters.kiotvietPurchaseDateFilter,
  );
  const [status, setStatus] = useState<string[]>(storedFilters.status);
  const [channel, setChannel] = useState<string[]>(storedFilters.channel);
  const [product, setProduct] = useState<string[]>(storedFilters.product);
  const [staff, setStaff] = useState<string[]>(storedFilters.staff);
  const [deliveryBusinessStatus, setDeliveryBusinessStatus] = useState<string[]>(
    storedFilters.deliveryBusinessStatus,
  );
  const [salesStatus, setSalesStatus] = useState<string[]>(storedFilters.salesStatus);
  const [kiotvietChannel, setKiotvietChannel] = useState<string[]>(storedFilters.kiotvietChannel);
  const [branchId, setBranchId] = useState<string[]>(storedFilters.branchId);
  const [fulfillmentWarehouse, setFulfillmentWarehouse] = useState<string[]>(
    storedFilters.fulfillmentWarehouse,
  );
  const [invoiceStatus, setInvoiceStatus] = useState<string[]>(storedFilters.invoiceStatus);
  const [vat, setVat] = useState<string[]>(storedFilters.vat);
  const [orderType, setOrderType] = useState<string[]>(storedFilters.orderType);
  const [shippingType, setShippingType] = useState<string[]>(storedFilters.shippingType);
  const [channelType, setChannelType] = useState<string[]>(storedFilters.channelType);
  const [kocOrderType, setKocOrderType] = useState<string[]>(storedFilters.kocOrderType);
  const [kiotvietChannelNull, setKiotvietChannelNull] = useState<string>("");
  const [showOrders, setShowOrders] = useState<string>("");
  const [hasShippingCode, setHasShippingCode] = useState<string>(storedFilters.hasShippingCode);
  const [hasInvoiceCode, setHasInvoiceCode] = useState<string>(storedFilters.hasInvoiceCode);
  const [isDeliveryInvoicePrinted, setIsDeliveryInvoicePrinted] = useState<string>(
    storedFilters.isDeliveryInvoicePrinted,
  );
  const [customerReturn, setCustomerReturn] = useState<string>(storedFilters.customerReturn);
  const [hasInternalNote, setHasInternalNote] = useState<string>(storedFilters.hasInternalNote);
  const [hasAddress, setHasAddress] = useState<string>(storedFilters.hasAddress);
  const [hasReturnSlip, setHasReturnSlip] = useState<string>(storedFilters.hasReturnSlip);
  const [hasRecallCode, setHasRecallCode] = useState<string>(storedFilters.hasRecallCode);
  const [hasCallRecording, setHasCallRecording] = useState<string>(storedFilters.hasCallRecording);

  const reset = useCallback(() => {
    // Cùng nguồn giá trị mặc định với `clearFilters` (xem createDefaultStoredFilters)
    // để state panel và override gửi lên server không thể lệch nhau.
    const defaults = createDefaultStoredFilters();
    setQ("");
    setDateFilter(defaults.dateFilter);
    setReturnDateFilter(defaults.returnDateFilter);
    setKiotvietPurchaseDateFilter(defaults.kiotvietPurchaseDateFilter);
    setStatus(defaults.status);
    setChannel(defaults.channel);
    setProduct(defaults.product);
    setStaff(defaults.staff);
    setDeliveryBusinessStatus(defaults.deliveryBusinessStatus);
    setSalesStatus(defaults.salesStatus);
    setKiotvietChannel(defaults.kiotvietChannel);
    setBranchId(defaults.branchId);
    setFulfillmentWarehouse(defaults.fulfillmentWarehouse);
    setInvoiceStatus(defaults.invoiceStatus);
    setVat(defaults.vat);
    setOrderType(defaults.orderType);
    setShippingType(defaults.shippingType);
    setChannelType(defaults.channelType);
    setKocOrderType(defaults.kocOrderType);
    setHasShippingCode(defaults.hasShippingCode);
    setHasInvoiceCode(defaults.hasInvoiceCode);
    setIsDeliveryInvoicePrinted(defaults.isDeliveryInvoicePrinted);
    setCustomerReturn(defaults.customerReturn);
    setHasInternalNote(defaults.hasInternalNote);
    setHasAddress(defaults.hasAddress);
    setHasReturnSlip(defaults.hasReturnSlip);
    setHasRecallCode(defaults.hasRecallCode);
    setHasCallRecording(defaults.hasCallRecording);
  }, []);

  return {
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
    reset,
  };
}

/**
 * "Rỗng" = không có bộ lọc nào đang bật → xoá hẳn key thay vì ghi một payload vô
 * nghĩa vào localStorage. Điều kiện y hệt bản inline cũ trong god hook (dùng ở cả
 * lúc flush scope cũ lẫn lúc persist scope hiện tại).
 */
function isStoredFiltersEmpty(payload: StoredOrderFilters): boolean {
  const isCustom = payload.dateFilter.option === "custom";
  const hasCustomDates = isCustom && (payload.dateFilter.from || payload.dateFilter.to);
  const hasReturnDates = !!(payload.returnDateFilter.from || payload.returnDateFilter.to);
  const hasKiotvietPurchaseDates = !!(
    payload.kiotvietPurchaseDateFilter.from || payload.kiotvietPurchaseDateFilter.to
  );
  return (
    !hasCustomDates &&
    !hasReturnDates &&
    !hasKiotvietPurchaseDates &&
    payload.status.length === 0 &&
    payload.channel.length === 0 &&
    payload.product.length === 0 &&
    payload.staff.length === 0 &&
    payload.deliveryBusinessStatus.length === 0 &&
    payload.salesStatus.length === 0 &&
    payload.kiotvietChannel.length === 0 &&
    payload.branchId.length === 0 &&
    payload.fulfillmentWarehouse.length === 0 &&
    payload.invoiceStatus.length === 0 &&
    payload.vat.length === 0 &&
    payload.orderType.length === 0 &&
    payload.shippingType.length === 0 &&
    payload.channelType.length === 0 &&
    payload.kocOrderType.length === 0 &&
    !payload.hasShippingCode &&
    !payload.hasInvoiceCode &&
    !payload.isDeliveryInvoicePrinted &&
    !payload.customerReturn &&
    !payload.hasInternalNote &&
    !payload.hasAddress &&
    !payload.hasReturnSlip &&
    !payload.hasRecallCode &&
    !payload.hasCallRecording
  );
}

/**
 * Truy cập scope hiện hành. Scope do `useOrdersData` sở hữu (một `useRef`) vì
 * `loadOrders` cũng đọc nó để chọn endpoint sheet 1/2/3 của trang Landing — nên
 * hook này nhận cặp get/set thay vì cầm thẳng ref của component khác.
 */
export type FilterScopeAccess = {
  get: () => FilterScope;
  set: (next: FilterScope) => void;
};

type UseOrdersFilterScopeDeps = {
  filters: UseOrdersFiltersReturn;
  scope: FilterScopeAccess;
};

/**
 * Sở hữu phần "scope" của bộ lọc: mỗi tab (Đơn hàng / Landing sheet 1-2-3 / KOC…)
 * có một key localStorage riêng, và bộ lọc được lưu/nạp theo key đó.
 *
 * Tách khỏi `useOrdersData` (god hook) nhưng GIỮ NGUYÊN vị trí gọi trong thân hook
 * để thứ tự chạy các `useEffect` không đổi — cụ thể effect persist ở đây vẫn chạy
 * sau effect đồng bộ `filterSnapshotRef` của god hook như trước.
 */
export function useOrdersFilterScope({ filters, scope }: UseOrdersFilterScopeDeps) {
  const {
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
    hasShippingCode,
    hasInvoiceCode,
    isDeliveryInvoicePrinted,
    customerReturn,
    hasInternalNote,
    hasAddress,
    hasReturnSlip,
    hasRecallCode,
    hasCallRecording,
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
    setHasShippingCode,
    setHasInvoiceCode,
    setIsDeliveryInvoicePrinted,
    setCustomerReturn,
    setHasInternalNote,
    setHasAddress,
    setHasReturnSlip,
    setHasRecallCode,
    setHasCallRecording,
  } = filters;

  // Snapshot đầy đủ filter (gồm cả dateFilter + product) phục vụ scope switch:
  // khi đổi scope phải flush state hiện tại sang key cũ trước khi load key mới.
  const currentFiltersRef = useRef<StoredOrderFilters>({
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
    hasShippingCode,
    hasInvoiceCode,
    isDeliveryInvoicePrinted,
    customerReturn,
    hasInternalNote,
    hasAddress,
    hasReturnSlip,
    hasRecallCode,
    hasCallRecording,
  });
  useEffect(() => {
    currentFiltersRef.current = {
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
      hasShippingCode,
      hasInvoiceCode,
      isDeliveryInvoicePrinted,
      customerReturn,
      hasInternalNote,
      hasAddress,
      hasReturnSlip,
      hasRecallCode,
      hasCallRecording,
    };
  }, [
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
    hasShippingCode,
    hasInvoiceCode,
    isDeliveryInvoicePrinted,
    customerReturn,
    hasInternalNote,
    hasAddress,
    hasReturnSlip,
    hasRecallCode,
    hasCallRecording,
  ]);

  const switchFilterScope = useCallback(
    (
      nextScope: FilterScope,
      fallbackDefaults?: Partial<StoredOrderFilters>,
    ): StoredOrderFilters => {
      const currentScope = scope.get();

      // 1) Flush filter hiện tại sang key của scope CŨ ngay (đồng bộ) để không
      // bị effect persist ghi đè key MỚI sau khi đổi ref.
      if (currentScope !== nextScope) {
        try {
          const snapshot = currentFiltersRef.current;
          const oldKey = getFilterStorageKey(currentScope);
          if (isStoredFiltersEmpty(snapshot)) {
            localStorage.removeItem(oldKey);
          } else {
            localStorage.setItem(oldKey, JSON.stringify(snapshot));
          }
        } catch (err) {
          // ignore storage error
          swallowError(err, "orders.filters.storage.legacy");
        }
      }

      // 2) Đổi ref sang scope mới
      scope.set(nextScope);

      // 3) Load filter của scope mới. Nếu chưa từng lưu → áp fallback defaults
      //    (cho phép caller set status/invoice_status mặc định cho từng tab).
      const hasStored = (() => {
        try {
          return !!localStorage.getItem(getFilterStorageKey(nextScope));
        } catch {
          return false;
        }
      })();
      const stored = getStoredOrderFilters(nextScope);
      const target: StoredOrderFilters =
        hasStored || !fallbackDefaults ? stored : { ...stored, ...fallbackDefaults };

      // 4) Áp tất cả setters
      setDateFilter(target.dateFilter);
      setReturnDateFilter(target.returnDateFilter);
      setKiotvietPurchaseDateFilter(target.kiotvietPurchaseDateFilter);
      setStatus(target.status);
      setChannel(target.channel);
      setProduct(target.product);
      setStaff(target.staff);
      setDeliveryBusinessStatus(target.deliveryBusinessStatus);
      setSalesStatus(target.salesStatus);
      setKiotvietChannel(target.kiotvietChannel);
      setBranchId(target.branchId);
      setFulfillmentWarehouse(target.fulfillmentWarehouse);
      setInvoiceStatus(target.invoiceStatus);
      setVat(target.vat);
      setOrderType(target.orderType);
      setShippingType(target.shippingType);
      setChannelType(target.channelType);
      setKocOrderType(target.kocOrderType);
      setHasShippingCode(target.hasShippingCode);
      setHasInvoiceCode(target.hasInvoiceCode);
      setIsDeliveryInvoicePrinted(target.isDeliveryInvoicePrinted);
      setCustomerReturn(target.customerReturn);
      setHasInternalNote(target.hasInternalNote);
      setHasAddress(target.hasAddress);
      setHasReturnSlip(target.hasReturnSlip);
      setHasRecallCode(target.hasRecallCode);
      setHasCallRecording(target.hasCallRecording);

      // 5) Sync ref ngay (đề phòng caller dùng giá trị state qua closure)
      currentFiltersRef.current = target;

      return target;
    },
    // Các setter đến từ useOrdersFilters (bọc useState setters) — identity ổn định,
    // liệt kê đủ để thỏa exhaustive-deps mà không đổi hành vi.
    [
      scope,
      setBranchId,
      setFulfillmentWarehouse,
      setChannel,
      setCustomerReturn,
      setDateFilter,
      setDeliveryBusinessStatus,
      setHasInternalNote,
      setHasAddress,
      setHasReturnSlip,
      setHasRecallCode,
      setHasCallRecording,
      setHasInvoiceCode,
      setHasShippingCode,
      setInvoiceStatus,
      setIsDeliveryInvoicePrinted,
      setKiotvietChannel,
      setKocOrderType,
      setOrderType,
      setShippingType,
      setChannelType,
      setProduct,
      setReturnDateFilter,
      setKiotvietPurchaseDateFilter,
      setSalesStatus,
      setStaff,
      setStatus,
      setVat,
    ],
  );

  useEffect(() => {
    try {
      const payload: StoredOrderFilters = {
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
        hasShippingCode,
        hasInvoiceCode,
        isDeliveryInvoicePrinted,
        customerReturn,
        hasInternalNote,
        hasAddress,
        hasReturnSlip,
        hasRecallCode,
        hasCallRecording,
      };
      const storageKey = getFilterStorageKey(scope.get());
      if (isStoredFiltersEmpty(payload)) {
        localStorage.removeItem(storageKey);
      } else {
        localStorage.setItem(storageKey, JSON.stringify(payload));
      }
    } catch (err) {
      // ignore storage error
      swallowError(err, "orders.filters.storage");
    }
  }, [
    scope,
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
    hasShippingCode,
    hasInvoiceCode,
    isDeliveryInvoicePrinted,
    customerReturn,
    hasInternalNote,
    hasAddress,
    hasReturnSlip,
    hasRecallCode,
    hasCallRecording,
  ]);

  return { switchFilterScope };
}
