import { OrdersFilters } from "../orders-filters/OrdersFilters";
import type { OrdersFilterValues } from "./orders-page-props";
import type { useOrdersFilterHandlers } from "./use-orders-filter-handlers";
import type { useOrdersFilterOptions } from "./use-orders-filter-options";

type Props = {
  filters: OrdersFilterValues;
  options: ReturnType<typeof useOrdersFilterOptions>;
  handlers: ReturnType<typeof useOrdersFilterHandlers>;
  hideChannelFilter: boolean;
  isKoc: boolean;
  /** Điện thoại: chỉ nút lọc (icon + badge) mở ngăn kéo từ đáy. */
  compact?: boolean;
};

/** Nối giá trị lọc + option + handler vào thanh lọc đơn hàng (OrdersFilters đã memo). */
export function OrdersFiltersBar({
  filters,
  options,
  handlers,
  hideChannelFilter,
  isKoc,
  compact = false,
}: Props) {
  return (
    <OrdersFilters
      compact={compact}
      dateFilter={filters.dateFilter}
      onDateFilterChange={handlers.handleDateFilterChange}
      returnDateFilter={filters.returnDateFilter}
      onReturnDateFilterChange={handlers.handleReturnDateFilterChange}
      kiotvietPurchaseDateFilter={filters.kiotvietPurchaseDateFilter}
      onKiotvietPurchaseDateFilterChange={handlers.handleKiotvietPurchaseDateFilterChange}
      kiotvietChannelOptions={options.kiotvietChannelOptions}
      selectedKiotvietChannelOptions={options.selectedKiotvietChannelOptions}
      onKiotvietChannelChange={handlers.handleKiotvietChannelMultiChange}
      branchIdOptions={options.branchIdOptions}
      selectedBranchIdOptions={options.selectedBranchIdOptions}
      onBranchIdChange={handlers.handleBranchIdMultiChange}
      fulfillmentWarehouseOptions={options.fulfillmentWarehouseOptions}
      selectedFulfillmentWarehouseOptions={options.selectedFulfillmentWarehouseOptions}
      onFulfillmentWarehouseChange={handlers.handleFulfillmentWarehouseMultiChange}
      hideChannelFilter={hideChannelFilter}
      channelOptions={options.channelOptions}
      selectedChannelOptions={options.selectedChannelOptions}
      onChannelChange={handlers.handleChannelMultiChange}
      staffOptions={options.staffOptions}
      selectedStaffOptions={options.selectedStaffOptions}
      onStaffChange={handlers.handleStaffMultiChange}
      salesStatusOptions={options.salesStatusOptions}
      selectedSalesStatusOptions={options.selectedSalesStatusOptions}
      onSalesStatusChange={handlers.handleSalesStatusMultiChange}
      invoiceStatusOptions={options.invoiceStatusOptions}
      invoiceStatus={filters.invoiceStatus}
      onInvoiceStatusChange={handlers.handleInvoiceStatusChange}
      vatOptions={options.vatOptions}
      vat={filters.vat}
      onVatChange={handlers.handleVatChange}
      orderTypeOptions={options.orderTypeFilterOptions}
      orderType={filters.orderType}
      onOrderTypeChange={handlers.handleOrderTypeChange}
      shippingTypeOptions={options.shippingTypeFilterOptions}
      channelTypeOptions={options.channelTypeFilterOptions}
      shippingType={filters.shippingType}
      channelType={filters.channelType}
      onShippingTypeChange={handlers.handleShippingTypeChange}
      onChannelTypeChange={handlers.handleChannelTypeChange}
      isKoc={isKoc}
      kocOrderTypeOptions={options.kocOrderTypeFilterOptions}
      kocOrderType={filters.kocOrderType}
      onKocOrderTypeChange={handlers.handleKocOrderTypeChange}
      statusOptions={options.statusOptions}
      status={filters.status}
      onStatusChange={handlers.handleStatusChange}
      deliveryBusinessStatusOptions={options.deliveryBusinessStatusOptions}
      selectedDeliveryBusinessStatusOptions={options.selectedDeliveryBusinessStatusOptions}
      onDeliveryBusinessStatusChange={handlers.handleDeliveryBusinessStatusMultiChange}
      hasShippingCode={filters.hasShippingCode}
      onHasShippingCodeChange={handlers.handleHasShippingCodeChange}
      isDeliveryInvoicePrinted={filters.isDeliveryInvoicePrinted}
      onIsDeliveryInvoicePrintedChange={handlers.handleIsDeliveryInvoicePrintedChange}
      customerReturn={filters.customerReturn}
      onCustomerReturnChange={handlers.handleCustomerReturnChange}
      hasReturnSlip={filters.hasReturnSlip}
      onHasReturnSlipChange={handlers.handleHasReturnSlipChange}
      hasRecallCode={filters.hasRecallCode}
      onHasRecallCodeChange={handlers.handleHasRecallCodeChange}
      hasCallRecording={filters.hasCallRecording}
      onHasCallRecordingChange={handlers.handleHasCallRecordingChange}
      hasInternalNote={filters.hasInternalNote}
      onHasInternalNoteChange={handlers.handleHasInternalNoteChange}
      hasAddress={filters.hasAddress}
      onHasAddressChange={handlers.handleHasAddressChange}
      productOptions={options.productOptions}
      selectedProductOptions={options.selectedProductOptions}
      onProductChange={handlers.handleProductMultiChange}
      onClearFilters={handlers.handleClearFilters}
    />
  );
}
