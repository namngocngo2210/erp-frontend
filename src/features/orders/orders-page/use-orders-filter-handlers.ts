import { useCallback, useRef, type KeyboardEvent } from "react";
import { toast } from "sonner";

import { type DateFilterValue } from "@/components/ui/date-filter";
import { type FilterSelectOption } from "@/features/orders/filter-types";
import { type StatusChipFilterState } from "@/features/orders/order-status-counts";
import { type OrdersSortValue } from "@/features/orders/use-orders-data";
import { useI18n } from "@/i18n";

type Translate = ReturnType<typeof useI18n>["t"];

/** Các option đang chọn của ô lọc nhiều lựa chọn (đúng thứ tự chọn). */
type SelectedOptions = readonly FilterSelectOption[];

/** Bộ giá trị filter có thể ghi đè khi gọi lại danh sách — mirror prop của OrdersPage. */
export type OrdersFilterOverrides = Partial<{
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
  hasShippingCode: string;
  hasInvoiceCode: string;
  isDeliveryInvoicePrinted: string;
  customerReturn: string;
  hasInternalNote: string;
  hasAddress: string;
  hasReturnSlip: string;
  hasRecallCode: string;
  hasCallRecording: string;
  sort: OrdersSortValue;
}>;

type UseOrdersFilterHandlersArgs = {
  t: Translate;
  q: string;
  ordersPage: number;
  onQChange: (value: string) => void;
  onDateFilterChange: (value: DateFilterValue) => void;
  onReturnDateFilterChange: (value: DateFilterValue) => void;
  onKiotvietPurchaseDateFilterChange: (value: DateFilterValue) => void;
  onStatusChange: (value: string[]) => void;
  onChannelChange: (value: string[]) => void;
  onProductChange: (value: string[]) => void;
  onStaffChange: (value: string[]) => void;
  onDeliveryBusinessStatusChange: (value: string[]) => void;
  onSalesStatusChange: (value: string[]) => void;
  onKiotvietChannelChange: (value: string[]) => void;
  onBranchIdChange: (value: string[]) => void;
  onFulfillmentWarehouseChange: (value: string[]) => void;
  onInvoiceStatusChange: (value: string[]) => void;
  onVatChange: (value: string[]) => void;
  onOrderTypeChange: (value: string[]) => void;
  onShippingTypeChange: (value: string[]) => void;
  onChannelTypeChange: (value: string[]) => void;
  onKocOrderTypeChange: (value: string[]) => void;
  onHasShippingCodeChange: (value: string) => void;
  onIsDeliveryInvoicePrintedChange: (value: string) => void;
  onCustomerReturnChange: (value: string) => void;
  onHasInternalNoteChange: (value: string) => void;
  onHasAddressChange: (value: string) => void;
  onHasReturnSlipChange: (value: string) => void;
  onHasRecallCodeChange: (value: string) => void;
  onHasCallRecordingChange: (value: string) => void;
  onApplyFilters: (overrides?: OrdersFilterOverrides) => Promise<void>;
  onClearFilters: () => Promise<void>;
  onOrdersPageChange: (nextPage: number) => Promise<void>;
  onOrdersPageSizeChange: (nextPageSize: number) => Promise<void>;
};

/**
 * Các handler của thanh bộ lọc đơn hàng. Mọi handler đều theo cùng một khuôn:
 * cập nhật state filter ở tầng trên rồi gọi lại danh sách với override tương ứng,
 * lỗi thì log kèm khoá filter và báo toast chung.
 *
 * Tách khỏi OrdersPage để phần render của trang không bị ~250 dòng wiring lặp lại
 * che mất bố cục.
 */
export function useOrdersFilterHandlers({
  t,
  q,
  ordersPage,
  onQChange,
  onDateFilterChange,
  onReturnDateFilterChange,
  onKiotvietPurchaseDateFilterChange,
  onStatusChange,
  onChannelChange,
  onProductChange,
  onStaffChange,
  onDeliveryBusinessStatusChange,
  onSalesStatusChange,
  onKiotvietChannelChange,
  onBranchIdChange,
  onFulfillmentWarehouseChange,
  onInvoiceStatusChange,
  onVatChange,
  onOrderTypeChange,
  onShippingTypeChange,
  onChannelTypeChange,
  onKocOrderTypeChange,
  onHasShippingCodeChange,
  onIsDeliveryInvoicePrintedChange,
  onCustomerReturnChange,
  onHasInternalNoteChange,
  onHasAddressChange,
  onHasReturnSlipChange,
  onHasRecallCodeChange,
  onHasCallRecordingChange,
  onApplyFilters,
  onClearFilters,
  onOrdersPageChange,
  onOrdersPageSizeChange,
}: UseOrdersFilterHandlersArgs) {
  const handleDateFilterChange = useCallback(
    (value: DateFilterValue) => {
      onDateFilterChange(value);
      onApplyFilters({ dateFilter: value }).catch((err) => {
        console.error("filter-[date]", err);
        toast.error(t("orders.toast.fetchListFailed"));
      });
    },
    [onDateFilterChange, onApplyFilters, t],
  );

  const handleReturnDateFilterChange = useCallback(
    (value: DateFilterValue) => {
      onReturnDateFilterChange(value);
      onApplyFilters({ returnDateFilter: value }).catch((err) => {
        console.error("filter-[returnDate]", err);
        toast.error(t("orders.toast.fetchListFailed"));
      });
    },
    [onReturnDateFilterChange, onApplyFilters, t],
  );

  const handleKiotvietPurchaseDateFilterChange = useCallback(
    (value: DateFilterValue) => {
      onKiotvietPurchaseDateFilterChange(value);
      onApplyFilters({ kiotvietPurchaseDateFilter: value }).catch((err) => {
        console.error("filter-[kiotvietPurchaseDate]", err);
        toast.error(t("orders.toast.fetchListFailed"));
      });
    },
    [onKiotvietPurchaseDateFilterChange, onApplyFilters, t],
  );

  const handleStatusChange = useCallback(
    (values: string[]) => {
      onStatusChange(values);
      onApplyFilters({ status: values }).catch((err) => {
        console.error("filter-[status]", err);
        toast.error(t("orders.toast.fetchListFailed"));
      });
    },
    [onStatusChange, onApplyFilters, t],
  );

  const handleChannelMultiChange = useCallback(
    (selectedOptions: SelectedOptions) => {
      const values = selectedOptions.map((option) => option.value);
      onChannelChange(values);
      onApplyFilters({ channel: values }).catch((err) => {
        console.error("filter-[channel]", err);
        toast.error(t("orders.toast.fetchListFailed"));
      });
    },
    [onChannelChange, onApplyFilters, t],
  );
  const handleProductMultiChange = useCallback(
    (selectedOptions: SelectedOptions) => {
      const values = selectedOptions.map((option) => option.value);
      onProductChange(values);
      onApplyFilters({ product: values }).catch((err) => {
        console.error("filter-[product]", err);
        toast.error(t("orders.toast.fetchListFailed"));
      });
    },
    [onProductChange, onApplyFilters, t],
  );
  const handleStaffMultiChange = useCallback(
    (selectedOptions: SelectedOptions) => {
      const values = selectedOptions.map((option) => option.value);
      onStaffChange(values);
      onApplyFilters({ staff: values }).catch((err) => {
        console.error("filter-[staff]", err);
        toast.error(t("orders.toast.fetchListFailed"));
      });
    },
    [onStaffChange, onApplyFilters, t],
  );
  const handleDeliveryBusinessStatusMultiChange = useCallback(
    (selectedOptions: SelectedOptions) => {
      const values = selectedOptions.map((option) => option.value);
      onDeliveryBusinessStatusChange(values);
      onApplyFilters({ deliveryBusinessStatus: values }).catch((err) => {
        console.error("filter-[deliveryBusinessStatus]", err);
        toast.error(t("orders.toast.fetchListFailed"));
      });
    },
    [onDeliveryBusinessStatusChange, onApplyFilters, t],
  );
  const handleSalesStatusMultiChange = useCallback(
    (selectedOptions: SelectedOptions) => {
      const values = selectedOptions.map((option) => option.value);
      onSalesStatusChange(values);
      onApplyFilters({ salesStatus: values }).catch((err) => {
        console.error("filter-[salesStatus]", err);
        toast.error(t("orders.toast.fetchListFailed"));
      });
    },
    [onSalesStatusChange, onApplyFilters, t],
  );
  const handleInvoiceStatusChange = useCallback(
    (values: string[]) => {
      onInvoiceStatusChange(values);
      onApplyFilters({ invoiceStatus: values }).catch((err) => {
        console.error("filter-[invoiceStatus]", err);
        toast.error(t("orders.toast.fetchListFailed"));
      });
    },
    [onInvoiceStatusChange, onApplyFilters, t],
  );
  const handleVatChange = useCallback(
    (values: string[]) => {
      onVatChange(values);
      onApplyFilters({ vat: values }).catch((err) => {
        console.error("filter-[vat]", err);
        toast.error(t("orders.toast.fetchListFailed"));
      });
    },
    [onVatChange, onApplyFilters, t],
  );
  const handleOrderTypeChange = useCallback(
    (values: string[]) => {
      onOrderTypeChange(values);
      onApplyFilters({ orderType: values }).catch((err) => {
        console.error("filter-[orderType]", err);
        toast.error(t("orders.toast.fetchListFailed"));
      });
    },
    [onOrderTypeChange, onApplyFilters, t],
  );
  const handleChannelTypeChange = useCallback(
    (values: string[]) => {
      onChannelTypeChange(values);
      onApplyFilters({ channelType: values }).catch((err) => {
        console.error("filter-[channelType]", err);
        toast.error(t("orders.toast.fetchListFailed"));
      });
    },
    [onChannelTypeChange, onApplyFilters, t],
  );
  const handleShippingTypeChange = useCallback(
    (values: string[]) => {
      onShippingTypeChange(values);
      onApplyFilters({ shippingType: values }).catch((err) => {
        console.error("filter-[shippingType]", err);
        toast.error(t("orders.toast.fetchListFailed"));
      });
    },
    [onShippingTypeChange, onApplyFilters, t],
  );
  const handleKocOrderTypeChange = useCallback(
    (values: string[]) => {
      onKocOrderTypeChange(values);
      onApplyFilters({ kocOrderType: values }).catch((err) => {
        console.error("filter-[kocOrderType]", err);
        toast.error(t("orders.toast.fetchListFailed"));
      });
    },
    [onKocOrderTypeChange, onApplyFilters, t],
  );

  const handleKiotvietChannelMultiChange = useCallback(
    (selectedOptions: SelectedOptions) => {
      const values = selectedOptions.map((option) => option.value);
      onKiotvietChannelChange(values);
      onApplyFilters({ kiotvietChannel: values }).catch((err) => {
        console.error("filter-[kiotvietChannel]", err);
        toast.error(t("orders.toast.fetchListFailed"));
      });
    },
    [onKiotvietChannelChange, onApplyFilters, t],
  );
  const handleBranchIdMultiChange = useCallback(
    (selectedOptions: SelectedOptions) => {
      const values = selectedOptions.map((option) => option.value);
      onBranchIdChange(values);
      onApplyFilters({ branchId: values }).catch((err) => {
        console.error("filter-[branchId]", err);
        toast.error(t("orders.toast.fetchListFailed"));
      });
    },
    [onBranchIdChange, onApplyFilters, t],
  );
  const handleFulfillmentWarehouseMultiChange = useCallback(
    (selectedOptions: SelectedOptions) => {
      const values = selectedOptions.map((option) => option.value);
      onFulfillmentWarehouseChange(values);
      onApplyFilters({ fulfillmentWarehouse: values }).catch((err) => {
        console.error("filter-[fulfillmentWarehouse]", err);
        toast.error(t("orders.toast.fetchListFailed"));
      });
    },
    [onFulfillmentWarehouseChange, onApplyFilters, t],
  );
  const handleHasShippingCodeChange = useCallback(
    (value: string) => {
      onHasShippingCodeChange(value);
      onApplyFilters({ hasShippingCode: value }).catch((err) => {
        console.error("filter-[hasShippingCode]", err);
        toast.error(t("orders.toast.fetchListFailed"));
      });
    },
    [onHasShippingCodeChange, onApplyFilters, t],
  );
  const handleIsDeliveryInvoicePrintedChange = useCallback(
    (value: string) => {
      onIsDeliveryInvoicePrintedChange(value);
      onApplyFilters({ isDeliveryInvoicePrinted: value }).catch((err) => {
        console.error("filter-[isDeliveryInvoicePrinted]", err);
        toast.error(t("orders.toast.fetchListFailed"));
      });
    },
    [onIsDeliveryInvoicePrintedChange, onApplyFilters, t],
  );
  const handleCustomerReturnChange = useCallback(
    (value: string) => {
      onCustomerReturnChange(value);
      onApplyFilters({ customerReturn: value }).catch((err) => {
        console.error("filter-[customerReturn]", err);
        toast.error(t("orders.toast.fetchListFailed"));
      });
    },
    [onCustomerReturnChange, onApplyFilters, t],
  );
  const handleHasInternalNoteChange = useCallback(
    (value: string) => {
      onHasInternalNoteChange(value);
      onApplyFilters({ hasInternalNote: value }).catch((err) => {
        console.error("filter-[hasInternalNote]", err);
        toast.error(t("orders.toast.fetchListFailed"));
      });
    },
    [onHasInternalNoteChange, onApplyFilters, t],
  );
  const handleHasAddressChange = useCallback(
    (value: string) => {
      onHasAddressChange(value);
      onApplyFilters({ hasAddress: value }).catch((err) => {
        console.error("filter-[hasAddress]", err);
        toast.error(t("orders.toast.fetchListFailed"));
      });
    },
    [onHasAddressChange, onApplyFilters, t],
  );
  const handleHasReturnSlipChange = useCallback(
    (value: string) => {
      onHasReturnSlipChange(value);
      onApplyFilters({ hasReturnSlip: value }).catch((err) => {
        console.error("filter-[hasReturnSlip]", err);
        toast.error(t("orders.toast.fetchListFailed"));
      });
    },
    [onHasReturnSlipChange, onApplyFilters, t],
  );
  const handleHasRecallCodeChange = useCallback(
    (value: string) => {
      onHasRecallCodeChange(value);
      onApplyFilters({ hasRecallCode: value }).catch((err) => {
        console.error("filter-[hasRecallCode]", err);
        toast.error(t("orders.toast.fetchListFailed"));
      });
    },
    [onHasRecallCodeChange, onApplyFilters, t],
  );
  const handleHasCallRecordingChange = useCallback(
    (value: string) => {
      onHasCallRecordingChange(value);
      onApplyFilters({ hasCallRecording: value }).catch((err) => {
        console.error("filter-[hasCallRecording]", err);
        toast.error(t("orders.toast.fetchListFailed"));
      });
    },
    [onHasCallRecordingChange, onApplyFilters, t],
  );

  const handleClearFilters = useCallback(() => {
    onClearFilters().catch((err) => {
      console.error("filter-[clear]", err);
      toast.error(t("orders.toast.fetchListFailed"));
    });
  }, [onClearFilters, t]);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      onApplyFilters({ q: q }).catch((err) => {
        console.error("filter-[search]", err);
        toast.error(t("orders.toast.fetchListFailed"));
      });
    },
    [onApplyFilters, q, t],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      onQChange(value);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => {
        onApplyFilters({ q: value }).catch((err) => {
          console.error("filter-[search]", err);
          toast.error(t("orders.toast.fetchListFailed"));
        });
      }, 400);
    },
    [onQChange, onApplyFilters, t],
  );

  const handlePageChange = useCallback(
    (page: number) => {
      if (page < 0 || page === ordersPage) return;
      onOrdersPageChange(page).catch((err) => {
        console.error("filter-[page]", err);
        toast.error(t("orders.toast.fetchListFailed"));
      });
    },
    [onOrdersPageChange, ordersPage, t],
  );

  const handlePageSizeChange = useCallback(
    (value: string) => {
      const nextPageSize = Number(value);
      if (!Number.isFinite(nextPageSize) || nextPageSize <= 0) return;
      onOrdersPageSizeChange(nextPageSize).catch((err) => {
        console.error("filter-[pageSize]", err);
        toast.error(t("orders.toast.fetchListFailed"));
      });
    },
    [onOrdersPageSizeChange, t],
  );

  // Chip status và chip "Đã hủy" thuộc 2 trục lọc khác nhau (status vs invoice_status)
  // nên cập nhật đồng thời để chúng hành xử như bộ tab loại trừ: chọn lifecycle thì bỏ
  // cờ hủy, và ngược lại.
  const applyStatusChips = useCallback(
    (next: StatusChipFilterState) => {
      onStatusChange(next.status);
      onInvoiceStatusChange(next.invoiceStatus);
      onApplyFilters({ status: next.status, invoiceStatus: next.invoiceStatus }).catch((err) => {
        console.error("filter-[statusChip]", err);
        toast.error(t("orders.toast.fetchListFailed"));
      });
    },
    [onStatusChange, onInvoiceStatusChange, onApplyFilters, t],
  );

  return {
    handleDateFilterChange,
    handleReturnDateFilterChange,
    handleKiotvietPurchaseDateFilterChange,
    handleStatusChange,
    handleChannelMultiChange,
    handleProductMultiChange,
    handleStaffMultiChange,
    handleDeliveryBusinessStatusMultiChange,
    handleSalesStatusMultiChange,
    handleInvoiceStatusChange,
    handleVatChange,
    handleOrderTypeChange,
    handleShippingTypeChange,
    handleChannelTypeChange,
    handleKocOrderTypeChange,
    handleKiotvietChannelMultiChange,
    handleBranchIdMultiChange,
    handleFulfillmentWarehouseMultiChange,
    handleHasShippingCodeChange,
    handleIsDeliveryInvoicePrintedChange,
    handleCustomerReturnChange,
    handleHasInternalNoteChange,
    handleHasAddressChange,
    handleHasReturnSlipChange,
    handleHasRecallCodeChange,
    handleHasCallRecordingChange,
    handleClearFilters,
    handleSearchKeyDown,
    handleSearchChange,
    handlePageChange,
    handlePageSizeChange,
    applyStatusChips,
  };
}
