import { memo, useMemo } from "react";

import { MultiSelect } from "@/components/ui/multi-select";
import { DateFilter, type DateFilterValue } from "@/components/ui/date-filter";
import type { FilterSelectOption } from "@/features/orders/filter-types";
import { useI18n } from "@/i18n";

// Trạng thái vận chuyển thực — đồng bộ với backend
// `backend/apps/orders/crm_catalog.py` DELIVERY_BUSINESS_STATUS_OPTIONS.
const DELIVERY_BUSINESS_STATUS_OPTIONS: FilterSelectOption[] = [
  { value: "warehouse_processing", label: "Kho đang xử lý" },
  { value: "dispatched", label: "Đã xuất kho" },
  { value: "received", label: "Đã nhận" },
  { value: "not_received", label: "Chưa nhận" },
  { value: "stalled_complaint", label: "Đơn dừng hành trình nhiều ngày, đang khiếu nại" },
  { value: "post_office_lost", label: "Bưu cục làm mất" },
];

type Props = {
  dateFilter: DateFilterValue;
  onDateFilterChange: (v: DateFilterValue) => void;
  status: string[];
  onStatusChange: (v: string[]) => void;
  invoiceStatus: string[];
  onInvoiceStatusChange: (v: string[]) => void;
  deliveryBusinessStatus: string[];
  onDeliveryBusinessStatusChange: (v: string[]) => void;
};

function ShipmentsFilterBarImpl({
  dateFilter,
  onDateFilterChange,
  status,
  onStatusChange,
  invoiceStatus,
  onInvoiceStatusChange,
  deliveryBusinessStatus,
  onDeliveryBusinessStatusChange,
}: Props) {
  const { t } = useI18n();

  // 14 trạng thái vận chuyển — mirror OrdersPage statusOptions.
  const statusOptions = useMemo<FilterSelectOption[]>(
    () =>
      Array.from({ length: 14 }, (_, index) => ({
        value: String(index),
        label: t(`status.${String(index)}`, t("status.all")),
      })),
    [t],
  );

  // Trạng thái hoá đơn [1, 2, 3, 5] — mirror OrdersPage invoiceStatusOptions.
  const invoiceStatusOptions = useMemo<FilterSelectOption[]>(
    () =>
      [1, 2, 3, 5].map((v) => ({
        value: String(v),
        label: t(`invoiceStatus.${String(v)}`, String(v)),
      })),
    [t],
  );

  return (
    // Wrap thay vì cuộn ngang: ở tablet/điện thoại filter xuống dòng, không bị giấu sau thanh cuộn.
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-2">
      <div className="min-w-0 max-w-full">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">
          {t("orders.filters.createdAt", "Ngày tạo")}
        </span>
        <DateFilter value={dateFilter} onChange={onDateFilterChange} inline />
      </div>
      <div className="w-full sm:w-56">
        <label
          htmlFor="shipments-filter-status"
          className="mb-1 block text-xs font-medium text-muted-foreground"
        >
          {t("orders.filters.status", "Trạng thái vận chuyển")}
        </label>
        <MultiSelect
          id="shipments-filter-status"
          options={statusOptions}
          selected={status}
          onChange={onStatusChange}
          placeholder={t("status.all", "Tất cả trạng thái")}
          className="w-full"
          menuPortal
        />
      </div>
      <div className="w-full sm:w-56">
        <label
          htmlFor="shipments-filter-invoice-status"
          className="mb-1 block text-xs font-medium text-muted-foreground"
        >
          {t("orders.filters.invoiceStatus", "Trạng thái hoá đơn")}
        </label>
        <MultiSelect
          id="shipments-filter-invoice-status"
          options={invoiceStatusOptions}
          selected={invoiceStatus}
          onChange={onInvoiceStatusChange}
          placeholder={t("invoiceStatus.all", "Tất cả trạng thái")}
          className="w-full"
          menuPortal
        />
      </div>
      <div className="w-full sm:w-56">
        <label
          htmlFor="shipments-filter-delivery-business-status"
          className="mb-1 block text-xs font-medium text-muted-foreground"
        >
          {t("orders.filters.deliveryBusinessStatus", "Trạng thái vận chuyển thực")}
        </label>
        <MultiSelect
          id="shipments-filter-delivery-business-status"
          options={DELIVERY_BUSINESS_STATUS_OPTIONS}
          selected={deliveryBusinessStatus}
          onChange={onDeliveryBusinessStatusChange}
          placeholder={t("orders.filters.deliveryBusinessStatusAll", "Tất cả trạng thái")}
          className="w-full"
          menuPortal
        />
      </div>
    </div>
  );
}

export const ShipmentsFilterBar = memo(ShipmentsFilterBarImpl);
