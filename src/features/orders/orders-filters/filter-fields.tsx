import { MultiSelect } from "@/components/ui/multi-select";
import { DateFilter } from "@/components/ui/date-filter";
import { type FilterSelectOption } from "@/features/orders/filter-types";
import { type OrdersFilterProps } from "@/features/orders/orders-filters/types";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

export type { FilterSelectOption };

/**
 * Nhãn + control.
 *
 * `compact` xếp nhãn NẰM NGANG trước control — thanh lọc chỉ cao một dòng thay vì
 * hai, và các control trên cùng hàng thẳng chân nhau. Bản xếp dọc dành cho ngăn kéo.
 */
function FilterField({
  htmlFor,
  label,
  className,
  compact,
  children,
}: {
  htmlFor: string;
  label: string;
  className?: string;
  compact?: boolean;
  children: React.ReactNode;
}) {
  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <label
          htmlFor={htmlFor}
          className="shrink-0 text-xs font-medium whitespace-nowrap text-muted-foreground"
        >
          {label}
        </label>
        <div className={cn("w-44 min-w-0", className)}>{children}</div>
      </div>
    );
  }
  return (
    <div className={cn("w-full min-w-0", className)}>
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * Ô lọc nhiều lựa chọn có tìm kiếm. Giữ hợp đồng cũ (value/onChange là mảng option,
 * đúng thứ tự chọn) để các handler lọc không phải đổi.
 */
function FilterMultiSelect({
  id,
  label,
  placeholder,
  options,
  value,
  onChange,
  className,
  compact,
}: {
  id: string;
  label: string;
  placeholder: string;
  options: FilterSelectOption[];
  value: FilterSelectOption[];
  onChange: (selected: readonly FilterSelectOption[]) => void;
  className?: string;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const handleChange = (values: string[]) => {
    const byValue = new Map([...value, ...options].map((opt) => [opt.value, opt] as const));
    onChange(values.flatMap((v) => byValue.get(v) ?? []));
  };
  return (
    <FilterField htmlFor={id} label={label} className={className} compact={compact}>
      <MultiSelect
        id={id}
        options={options}
        selected={value.map((opt) => opt.value)}
        onChange={handleChange}
        placeholder={placeholder}
        emptyText={t("common.noData", "Không có dữ liệu")}
        size={compact ? "sm" : "default"}
        className="w-full"
        menuPortal
      />
    </FilterField>
  );
}

/** Ô lọc nhiều lựa chọn dạng thẻ (components/ui MultiSelect). */
function FilterTagSelect({
  id,
  label,
  placeholder,
  options,
  selected,
  onChange,
  className,
}: {
  id: string;
  label: string;
  placeholder: string;
  options: FilterSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  className?: string;
}) {
  return (
    <FilterField htmlFor={id} label={label} className={className}>
      <MultiSelect
        id={id}
        options={options}
        selected={selected}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full"
        menuPortal
      />
    </FilterField>
  );
}

/**
 * Cờ ba trạng thái: Tất cả / Có / Không.
 *
 * Thay cho `<select>` ba dòng của panel cũ. Giá trị gửi lên server không đổi
 * ("" / "yes" / "no"), chỉ đổi cách bấm — nhờ vậy 8 cờ nằm gọn trong một lưới
 * thay vì 8 khối nhãn + select xếp dọc.
 */
export function TriStateFilter({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  const choices = [
    { value: "", label: t("orders.filters.triAll", "Tất cả") },
    { value: "yes", label: t("orders.filters.triYes", "Có") },
    { value: "no", label: t("orders.filters.triNo", "Không") },
  ];
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-border py-1.5">
      <span id={`${id}-label`} className="min-w-0 truncate text-xs text-muted-foreground">
        {label}
      </span>
      <div
        role="group"
        aria-labelledby={`${id}-label`}
        className="inline-flex shrink-0 overflow-hidden rounded-md border border-input"
      >
        {choices.map((choice) => (
          <button
            key={choice.value || "all"}
            type="button"
            aria-pressed={value === choice.value}
            onClick={() => onChange(choice.value)}
            className={cn(
              "border-r border-input px-2.5 py-1 text-xs last:border-r-0",
              value === choice.value
                ? "bg-primary font-semibold text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Từng ô lọc. Nhận nguyên `OrdersFilterProps` để thanh ngang và ngăn
 * kéo dùng lại đúng một định nghĩa — không có bản sao lệch nhau.
 * ------------------------------------------------------------------ */

export function CreatedAtField({
  props,
  compact,
}: {
  props: OrdersFilterProps;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const label = t("orders.filters.createdAt", "Ngày tạo");
  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="shrink-0 text-xs font-medium whitespace-nowrap text-muted-foreground">
          {label}
        </span>
        <DateFilter
          value={props.dateFilter}
          onChange={props.onDateFilterChange}
          compact
          clearable
        />
      </div>
    );
  }
  return (
    <div className="w-full">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <DateFilter value={props.dateFilter} onChange={props.onDateFilterChange} clearable />
    </div>
  );
}

export function ReturnDateField({ props }: { props: OrdersFilterProps }) {
  const { t } = useI18n();
  return (
    <div className="w-full">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {t("orders.filters.returnDate", "Ngày hoàn hàng")}
      </span>
      <DateFilter
        value={props.returnDateFilter}
        onChange={props.onReturnDateFilterChange}
        clearable
      />
    </div>
  );
}

// "Ngày tạo trên KiotViet" (Order.kiotviet_purchase_date) — chỉ đơn đã có hoá
// đơn KiotViet mới có mốc này; bật lọc thì đơn chưa lên hoá đơn rơi ra ngoài.
export function KiotvietPurchaseDateField({ props }: { props: OrdersFilterProps }) {
  const { t } = useI18n();
  return (
    <div className="w-full">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {t("orders.filters.kiotvietPurchaseDate", "Ngày tạo KiotViet")}
      </span>
      <DateFilter
        value={props.kiotvietPurchaseDateFilter}
        onChange={props.onKiotvietPurchaseDateFilterChange}
        clearable
      />
    </div>
  );
}

export function ChannelField({
  props,
  className,
  compact,
}: {
  props: OrdersFilterProps;
  className?: string;
  compact?: boolean;
}) {
  const { t } = useI18n();
  if (props.hideChannelFilter) return null;
  return (
    <FilterMultiSelect
      id="orders-filter-channel"
      label={t("orders.filters.channel", "Kênh bán hàng")}
      placeholder={t("channel.all", "Tất cả kênh")}
      options={props.channelOptions}
      value={props.selectedChannelOptions}
      onChange={props.onChannelChange}
      className={className}
      compact={compact}
    />
  );
}

export function StaffField({
  props,
  className,
  compact,
}: {
  props: OrdersFilterProps;
  className?: string;
  compact?: boolean;
}) {
  const { t } = useI18n();
  return (
    <FilterMultiSelect
      id="orders-filter-staff"
      label={t("orders.filters.staff", "Nhân viên")}
      placeholder={t("orders.filters.staffAll", "Tất cả nhân viên")}
      options={props.staffOptions}
      value={props.selectedStaffOptions}
      onChange={props.onStaffChange}
      className={className}
      compact={compact}
    />
  );
}

export function SalesStatusField({
  props,
  className,
  compact,
}: {
  props: OrdersFilterProps;
  className?: string;
  compact?: boolean;
}) {
  const { t } = useI18n();
  return (
    <FilterMultiSelect
      id="orders-filter-sales-status"
      label={t("orders.filters.salesStatus", "Trạng thái sale")}
      placeholder={t("orders.filters.salesStatusAll", "Tất cả trạng thái")}
      options={props.salesStatusOptions}
      value={props.selectedSalesStatusOptions}
      onChange={props.onSalesStatusChange}
      className={className}
      compact={compact}
    />
  );
}

/* ---------------------------- Nhóm ---------------------------- */

export function TimeGroupFields({ props }: { props: OrdersFilterProps }) {
  return (
    <>
      <CreatedAtField props={props} />
      <ReturnDateField props={props} />
      <KiotvietPurchaseDateField props={props} />
    </>
  );
}

export function ChannelStaffGroupFields({ props }: { props: OrdersFilterProps }) {
  const { t } = useI18n();
  return (
    <>
      <FilterMultiSelect
        id="orders-filter-kiotviet-channel"
        label={t("orders.filters.kiotvietChannel", "Kênh KiotViet")}
        placeholder={t("orders.filters.kiotvietChannelAll", "Tất cả kênh KiotViet")}
        options={props.kiotvietChannelOptions}
        value={props.selectedKiotvietChannelOptions}
        onChange={props.onKiotvietChannelChange}
      />
      <FilterMultiSelect
        id="orders-filter-branch-id"
        label={t("orders.filters.branchId", "Chi nhánh")}
        placeholder={t("orders.filters.branchIdAll", "Tất cả chi nhánh")}
        options={props.branchIdOptions}
        value={props.selectedBranchIdOptions}
        onChange={props.onBranchIdChange}
      />
      <FilterMultiSelect
        id="orders-filter-fulfillment-warehouse"
        label={t("orders.filters.fulfillmentWarehouse", "Kho xuất")}
        placeholder={t("orders.filters.fulfillmentWarehouseAll", "Tất cả kho")}
        options={props.fulfillmentWarehouseOptions}
        value={props.selectedFulfillmentWarehouseOptions}
        onChange={props.onFulfillmentWarehouseChange}
      />
      <ChannelField props={props} />
      <FilterTagSelect
        id="orders-filter-channel-type"
        label={t("orders.filters.channelType", "Loại kênh")}
        placeholder={t("orders.filters.channelTypeAll", "Tất cả")}
        options={props.channelTypeOptions}
        selected={props.channelType}
        onChange={props.onChannelTypeChange}
      />
      <StaffField props={props} />
    </>
  );
}

export function StatusGroupFields({ props }: { props: OrdersFilterProps }) {
  const { t } = useI18n();
  return (
    <>
      <SalesStatusField props={props} />
      <FilterTagSelect
        id="orders-filter-status"
        label={t("orders.filters.status", "Trạng thái vận chuyển")}
        placeholder={t("status.all", "Tất cả trạng thái")}
        options={props.statusOptions}
        selected={props.status}
        onChange={props.onStatusChange}
      />
      <FilterMultiSelect
        id="orders-filter-delivery-business-status"
        label={t("orders.filters.deliveryBusinessStatus", "Trạng thái vận chuyển thực")}
        placeholder={t("orders.filters.deliveryBusinessStatusAll", "Tất cả trạng thái")}
        options={props.deliveryBusinessStatusOptions}
        value={props.selectedDeliveryBusinessStatusOptions}
        onChange={props.onDeliveryBusinessStatusChange}
      />
      <FilterTagSelect
        id="orders-filter-invoice-status"
        label={t("orders.filters.invoiceStatus", "Trạng thái hóa đơn")}
        placeholder={t("invoiceStatus.all", "Tất cả trạng thái")}
        options={props.invoiceStatusOptions}
        selected={props.invoiceStatus}
        onChange={props.onInvoiceStatusChange}
      />
      <FilterTagSelect
        id="orders-filter-vat"
        label={t("orders.filters.vat", "Xuất VAT")}
        placeholder={t("orders.filters.vatAll", "Tất cả")}
        options={props.vatOptions}
        selected={props.vat}
        onChange={props.onVatChange}
      />
      <FilterTagSelect
        id="orders-filter-order-type"
        label={t("orders.filters.orderType", "Loại đơn hàng")}
        placeholder={t("orders.filters.orderTypeAll", "Tất cả")}
        options={props.orderTypeOptions}
        selected={props.orderType}
        onChange={props.onOrderTypeChange}
      />
      <FilterTagSelect
        id="orders-filter-shipping-type"
        label={t("orders.filters.shippingType", "Loại xuất hàng")}
        placeholder={t("orders.filters.shippingTypeAll", "Tất cả")}
        options={props.shippingTypeOptions}
        selected={props.shippingType}
        onChange={props.onShippingTypeChange}
      />
      {props.isKoc && (
        <FilterTagSelect
          id="orders-filter-koc-order-type"
          label={t("orders.filters.kocOrderType", "Loại đơn KOC")}
          placeholder={t("orders.filters.kocOrderTypeAll", "Tất cả")}
          options={props.kocOrderTypeOptions}
          selected={props.kocOrderType}
          onChange={props.onKocOrderTypeChange}
        />
      )}
    </>
  );
}

export function FlagGroupFields({ props }: { props: OrdersFilterProps }) {
  const { t } = useI18n();
  return (
    <>
      <TriStateFilter
        id="orders-filter-has-shipping-code"
        label={t("orders.filters.hasShippingCode", "Mã vận đơn")}
        value={props.hasShippingCode}
        onChange={props.onHasShippingCodeChange}
      />
      <TriStateFilter
        id="orders-filter-delivery-invoice-printed"
        label={t("orders.filters.isDeliveryInvoicePrinted", "Phiếu giao hàng")}
        value={props.isDeliveryInvoicePrinted}
        onChange={props.onIsDeliveryInvoicePrintedChange}
      />
      <TriStateFilter
        id="orders-filter-customer-return"
        label={t("orders.filters.customerReturn", "Khách trả hàng")}
        value={props.customerReturn}
        onChange={props.onCustomerReturnChange}
      />
      <TriStateFilter
        id="orders-filter-has-return-slip"
        label={t("orders.filters.hasReturnSlip", "Phiếu trả hàng")}
        value={props.hasReturnSlip}
        onChange={props.onHasReturnSlipChange}
      />
      <TriStateFilter
        id="orders-filter-has-recall-code"
        label={t("orders.filters.hasRecallCode", "Mã đơn thu hồi")}
        value={props.hasRecallCode}
        onChange={props.onHasRecallCodeChange}
      />
      <TriStateFilter
        id="orders-filter-has-call-recording"
        label={t("orders.filters.hasCallRecording", "Ghi âm cuộc gọi")}
        value={props.hasCallRecording}
        onChange={props.onHasCallRecordingChange}
      />
      <TriStateFilter
        id="orders-filter-has-internal-note"
        label={t("orders.filters.hasInternalNote", "Ghi chú nội bộ")}
        value={props.hasInternalNote}
        onChange={props.onHasInternalNoteChange}
      />
      <TriStateFilter
        id="orders-filter-has-address"
        label={t("orders.filters.hasAddress", "Địa chỉ khi đổ đơn")}
        value={props.hasAddress}
        onChange={props.onHasAddressChange}
      />
    </>
  );
}

export function ProductGroupFields({ props }: { props: OrdersFilterProps }) {
  const { t } = useI18n();
  return (
    <FilterMultiSelect
      id="orders-filter-product"
      label={t("orders.filters.product", "Sản phẩm")}
      placeholder={t("orders.filters.productAll", "Tất cả sản phẩm")}
      options={props.productOptions}
      value={props.selectedProductOptions}
      onChange={props.onProductChange}
    />
  );
}
