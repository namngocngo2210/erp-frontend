import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormDialogShell } from "@/components/ui/form-dialog-content";
import { type OrderRow, type ProductRow } from "@/features/orders/order-types";
import {
  type AddressCatalog,
  type CreateOrderPayload,
  type KiotVietOrderAction,
} from "@/features/orders/use-orders-data";
import { useI18n } from "@/i18n";

import { OrderFormBasicSection } from "@/features/orders/order-form/OrderFormBasicSection";
import { OrderFormCustomerSection } from "@/features/orders/order-form/OrderFormCustomerSection";
import { OrderFormFinancialSection } from "@/features/orders/order-form/OrderFormFinancialSection";
import { OrderFormItemsSection } from "@/features/orders/order-form/OrderFormItemsSection";
import { OrderFormKiotVietMenu } from "@/features/orders/order-form/OrderFormKiotVietMenu";
import { OrderFormPurchaseHistory } from "@/features/orders/order-form/OrderFormPurchaseHistory";
import { type ChannelOption } from "@/features/orders/order-form/order-form-helpers";
import { useOrderForm, type OrderDialogMode } from "@/features/orders/order-form/use-order-form";

export type { OrderDialogMode };

type OrderFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: OrderDialogMode;
  initialOrder: OrderRow | null;
  channels: ChannelOption[];
  products: ProductRow[];
  /**
   * Code bảng giá THẬT SỰ mà `products` hiện tại phản ánh ("" = bảng mặc định) —
   * do use-orders-catalogs.ts cập nhật ĐỒNG THỜI với `products` mỗi khi server trả
   * dữ liệu mới, KHÔNG suy đoán từ kênh đang chọn trên form. Dùng để gắn nhãn đúng
   * khi merge `products` vào catalog "đã biết" của form (use-order-form-products.ts)
   * — nếu chỉ đoán bằng `priceBookCode` hiện hành, `products` vẫn CŨ (chưa refetch
   * kịp) sẽ bị dán nhầm nhãn bảng giá MỚI, tái lập đúng loại bug gắn nhãn sai đã sửa.
   */
  productsPriceBook: string;
  /** Tìm sản phẩm theo tên/SKU trực tiếp trên server cho ô chọn sản phẩm. */
  onSearchProducts?: (
    query: string,
    options?: { limit?: number; signal?: AbortSignal; priceBook?: string },
  ) => Promise<ProductRow[]>;
  /**
   * Đảm bảo catalog sản phẩm (prop `products`) đã nạp đúng bảng giá — gọi lại khi
   * kênh đang chọn trên form đổi bảng giá. Không truyền = form chỉ dùng catalog có sẵn.
   */
  onEnsureProductsLoaded?: (options?: { force?: boolean; priceBook?: string }) => Promise<void>;
  kiotvietOptions: Array<{ id: number; name: string; branch_id?: string; branch_ids?: string[] }>;
  addressCatalog: AddressCatalog;
  channelStaffByCode: Record<string, Array<{ id: number; name: string }>>;
  submitting: boolean;
  /** Đang ở trang đơn KOC — bật auto-fill prepaid khi chọn "không trả lại". */
  kocMode?: boolean;
  onSubmit: (values: CreateOrderPayload) => Promise<void>;
  onKiotVietAction?: (action: KiotVietOrderAction, ids: number[]) => Promise<void>;
  onFetchOrderHistoryByPhone: (
    phone: string,
    options?: { signal?: AbortSignal },
  ) => Promise<OrderRow[]>;
  onLookupCustomerByPhone: (
    phone: string,
    options?: { signal?: AbortSignal },
  ) => Promise<{
    id: number;
    code?: string;
    full_name?: string;
    phone_raw: string;
    phone_normalized: string;
    gender?: number | null;
  } | null>;
  onLoadDistrictsForProvince: (
    provinceCode: string,
    options?: { force?: boolean },
  ) => Promise<void>;
  onLoadWardsForDistrict: (
    provinceCode: string,
    districtCode: string,
    options?: { force?: boolean },
  ) => Promise<void>;
  /** Quyền `sale-assignment:edit` — thiếu thì ô chọn nhân viên phụ trách bị khoá. */
  canAssignSale?: boolean;
  /** Id người dùng hiện tại — dùng để preset sale phụ trách khi tạo đơn mới lúc thiếu quyền. */
  currentUserId?: number | null;
  /** Quyền sửa-theo-field (từ `useOrderFieldGrants`, gọi ở component cha có
   * AppShellContext — dialog thuần nhận prop để test được không cần Provider).
   * Mặc định luôn cho sửa (chưa nạp quyền / không truyền = không khoá). */
  canEditField?: (field: string) => boolean;
};

/**
 * Dialog tạo/sửa đơn hàng — chỉ còn lắp ráp: toàn bộ state + effect + dữ liệu dẫn
 * xuất nằm ở useOrderForm (order-form/use-order-form.ts), các khối UI nằm ở các
 * section trong order-form/.
 */
export function OrderFormDialog({
  open,
  onOpenChange,
  mode,
  initialOrder,
  channels,
  products,
  productsPriceBook,
  onSearchProducts,
  onEnsureProductsLoaded,
  kiotvietOptions,
  channelStaffByCode,
  submitting,
  kocMode = false,
  onSubmit,
  onKiotVietAction,
  onFetchOrderHistoryByPhone,
  onLookupCustomerByPhone,
  canAssignSale = false,
  currentUserId = null,
  canEditField = () => true,
}: OrderFormDialogProps) {
  const { t } = useI18n();

  const {
    form,
    setForm,
    isCreateMode,
    focusedPriceIndex,
    setFocusedPriceIndex,
    dimensionParts,
    setDimensionParts,
    locationOptions,
    wardOptions,
    productById,
    productBySku,
    searchProductOptions,
    channelSelectOptions,
    staffSelectOptions,
    kiotvietSelectOptions,
    orderSourceOptions,
    vatOptions,
    warehouseSelectOptions,
    selectedWarehouseName,
    stock,
    branchSelectOptions,
    customer,
    updateItems,
    addItem,
    removeItemAt,
    markItemPriceManuallyEdited,
    markChannelChangedByUser,
    clearZeroOnFocus,
  } = useOrderForm({
    open,
    mode,
    initialOrder,
    channels,
    products,
    productsPriceBook,
    onSearchProducts,
    onEnsureProductsLoaded,
    kiotvietOptions,
    channelStaffByCode,
    kocMode,
    canAssignSale,
    currentUserId,
    onFetchOrderHistoryByPhone,
    onLookupCustomerByPhone,
    t,
  });

  const title = isCreateMode
    ? t("orders.modal.addOrderTitle")
    : t("orders.actions.details", "Chi tiết đơn hàng");
  const submitLabel = isCreateMode ? t("orders.actions.create") : t("common.save", "Lưu");
  const submittingLabel = isCreateMode
    ? t("orders.actions.creating")
    : t("common.saving", "Đang lưu...");
  const selectedOrderId = mode === "edit" ? Number(initialOrder?.id ?? 0) : 0;
  const displayCustomerCode = String(form.customer_code || "").trim();
  // Quyền sửa-theo-field chỉ áp cho nhánh SỬA đơn — tạo mới luôn cho điền đủ.
  const isFieldLocked = (field: string) => !isCreateMode && !canEditField(field);

  // Việc loại field chưa được cấp quyền khỏi payload PATCH KHÔNG được làm ở đây
  // nữa: onSubmit truyền `form` ĐẦY ĐỦ lên `OrdersPage.handleSubmitOrderDialog`,
  // nơi đó strip trên ĐẦU RA của `buildPatchPayload` (order-import-format.ts) —
  // hàm dựng payload PATCH luôn set MỌI field bằng fallback rỗng/null/0 bất kể
  // input có key đó hay không, nên nếu strip Ở ĐÂY (trên `form`, input của
  // buildPatchPayload) thì field bị strip sẽ bị nó dựng lại thành giá trị rỗng
  // TƯỜNG MINH thay vì biến mất — backend coi đó là "đổi thật" trên field chưa
  // cấp quyền → 403 gần như mọi lần Lưu. Đồng thời `handleSubmitOrderDialog`
  // còn một guard tiền điều kiện đọc `values.channel_code`/`values.phone` —
  // guard đó cũng cần `form` đầy đủ, không phải bản đã strip.

  const footer = (
    <>
      {mode === "edit" && (
        <OrderFormKiotVietMenu
          t={t}
          open={open}
          submitting={submitting}
          selectedOrderId={selectedOrderId}
          onKiotVietAction={onKiotVietAction}
        />
      )}
      <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
        {t("orders.actions.cancel")}
      </Button>
      <Button
        className="bg-primary text-primary-foreground hover:bg-primary/90"
        onClick={() => onSubmit(form).catch(() => null)}
        disabled={submitting}
      >
        {submitting ? submittingLabel : submitLabel}
      </Button>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogShell title={title} footer={footer}>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:items-start">
          <div className="contents">
            <div className="rounded-lg border border-border p-2.5 lg:order-1">
              <p className="mb-3 text-sm font-semibold text-foreground">
                {t("orders.modal.section.basicAndCustomer", "Thông tin chung & khách hàng")}
              </p>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("orders.modal.section.basic")}
              </p>
              <OrderFormBasicSection
                t={t}
                form={form}
                setForm={setForm}
                isCreateMode={isCreateMode}
                kocMode={kocMode}
                canAssignSale={canAssignSale}
                isFieldLocked={isFieldLocked}
                markChannelChangedByUser={markChannelChangedByUser}
                channelSelectOptions={channelSelectOptions}
                staffSelectOptions={staffSelectOptions}
                kiotvietSelectOptions={kiotvietSelectOptions}
                kiotvietOptions={kiotvietOptions}
                branchSelectOptions={branchSelectOptions}
                orderSourceOptions={orderSourceOptions}
                vatOptions={vatOptions}
                warehouseSelectOptions={warehouseSelectOptions}
                selectedWarehouseName={selectedWarehouseName}
                stock={stock}
              />
              <div className="my-2 border-t border-border/70" />
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("orders.modal.section.customer")}
              </p>
              <OrderFormCustomerSection
                t={t}
                form={form}
                setForm={setForm}
                isFieldLocked={isFieldLocked}
                displayCustomerCode={displayCustomerCode}
                onPhoneBlurLookup={customer.handlePhoneBlurLookup}
                locationOptions={locationOptions}
                wardOptions={wardOptions}
              />
            </div>

            {mode === "edit" && (
              <OrderFormPurchaseHistory
                t={t}
                currentPhone={customer.currentPhone}
                purchaseHistory={customer.purchaseHistory}
                historyCount={customer.historyCount}
                historyLoading={customer.historyLoading}
                historyError={customer.historyError}
                historyTotalAmount={customer.historyTotalAmount}
              />
            )}
          </div>

          <div className="contents">
            <div className="rounded-lg border border-border p-2.5 lg:order-2">
              <p className="mb-3 text-sm font-semibold text-foreground">
                {t("orders.detail.section.productAndFinancial", "Sản phẩm & tài chính")}
              </p>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("orders.columns.product")}
              </p>
              <OrderFormItemsSection
                t={t}
                form={form}
                setForm={setForm}
                isFieldLocked={isFieldLocked}
                focusedPriceIndex={focusedPriceIndex}
                setFocusedPriceIndex={setFocusedPriceIndex}
                productById={productById}
                productBySku={productBySku}
                searchProductOptions={searchProductOptions}
                updateItems={updateItems}
                addItem={addItem}
                removeItemAt={removeItemAt}
                markItemPriceManuallyEdited={markItemPriceManuallyEdited}
                dimensionParts={dimensionParts}
                setDimensionParts={setDimensionParts}
                clearZeroOnFocus={clearZeroOnFocus}
              />
              <div className="my-2 border-t border-border/70" />
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("orders.detail.section.financial", "Tài chính")}
              </p>
              <OrderFormFinancialSection
                t={t}
                form={form}
                setForm={setForm}
                clearZeroOnFocus={clearZeroOnFocus}
                isFieldLocked={isFieldLocked}
              />
            </div>
          </div>
        </div>
      </FormDialogShell>
    </Dialog>
  );
}
