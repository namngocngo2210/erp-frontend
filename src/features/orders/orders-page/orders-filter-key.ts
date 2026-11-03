import type { OrdersFilterValues } from "./orders-page-props";

/**
 * Khóa định danh bộ lọc — đổi khi filter/search/sort/tab đổi (KHÔNG đổi khi page
 * hay cột hiển thị thay đổi). OrdersTable dùng để reset selection khi user đổi bộ lọc.
 */
export function buildOrdersFilterKey(
  filters: OrdersFilterValues,
  landingTab: string | null,
): string {
  return JSON.stringify({
    q: filters.q,
    dateFilter: filters.dateFilter,
    returnDateFilter: filters.returnDateFilter,
    kiotvietPurchaseDateFilter: filters.kiotvietPurchaseDateFilter,
    status: filters.status,
    channel: filters.channel,
    product: filters.product,
    staff: filters.staff,
    deliveryBusinessStatus: filters.deliveryBusinessStatus,
    salesStatus: filters.salesStatus,
    kiotvietChannel: filters.kiotvietChannel,
    branchId: filters.branchId,
    fulfillmentWarehouse: filters.fulfillmentWarehouse,
    invoiceStatus: filters.invoiceStatus,
    vat: filters.vat,
    orderType: filters.orderType,
    shippingType: filters.shippingType,
    channelType: filters.channelType,
    kocOrderType: filters.kocOrderType,
    hasShippingCode: filters.hasShippingCode,
    hasInvoiceCode: filters.hasInvoiceCode,
    isDeliveryInvoicePrinted: filters.isDeliveryInvoicePrinted,
    customerReturn: filters.customerReturn,
    hasInternalNote: filters.hasInternalNote,
    hasAddress: filters.hasAddress,
    hasReturnSlip: filters.hasReturnSlip,
    hasRecallCode: filters.hasRecallCode,
    hasCallRecording: filters.hasCallRecording,
    sort: filters.sort,
    landingTab,
  });
}
