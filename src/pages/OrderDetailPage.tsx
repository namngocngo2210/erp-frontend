import { useCallback, useEffect, useMemo, useState } from "react";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { useCrmCatalogs } from "@/features/orders/queries";
import { type OrderRow, type ProductRow } from "@/features/orders/order-types";
import { type KiotVietOption } from "@/features/orders/use-orders-data";
import { useI18n } from "@/i18n";
import { buildChannelStaffByCode, type ChannelStaffUser } from "@/features/orders/channel-staff";
import { INVOICE_LOCK_HINT, isInvoiceLocked } from "@/features/orders/invoice-lock";
import { isFulfillmentWarehouseLocked } from "@/features/orders/fulfillment-warehouse-lock";
import { useWarehousesList } from "@/features/warehouses/queries";
import { ManualDispatchDialog } from "@/features/orders/ManualDispatchDialog";
import { BlockProducts } from "@/features/orders/BlockProducts";
import { BlockFinancials } from "@/features/orders/BlockFinancials";
import { type CrmCatalogPayload } from "@/features/orders/BlockCrmRating";
import { BlockGeneralInfo } from "@/features/orders/order-detail/BlockGeneralInfo";
import {
  OrderDetailBottomTabs,
  TAB_BEHAVIOR,
} from "@/features/orders/order-detail/OrderDetailBottomTabs";
import { OrderDetailTopbar } from "@/features/orders/order-detail/OrderDetailTopbar";
import { useOrderDetailDraft } from "@/features/orders/order-detail/use-order-detail-draft";
import { useUnsavedGuard } from "@/hooks/use-unsaved-guard";

type Props = {
  orderId: number;
  order: OrderRow | null;
  isLoading?: boolean;
  onBack: () => void;
  onPatch: (id: number, payload: Partial<OrderRow>, silent?: boolean) => Promise<void>;
  onDuplicate?: (id: number) => Promise<void>;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  kiotvietOptions?: KiotVietOption[];
  products?: ProductRow[];
  channels?: Array<{ code: string; name: string }>;
  staffUsers?: ChannelStaffUser[];
  isKoc?: boolean;
  /** Quyền `sale-assignment:edit` — thiếu thì ô "Nhân sự" chỉ đọc. Fail-closed như OrderFormDialog. */
  canAssignSale?: boolean;
  /** Quyền `stock:edit` — thiếu thì ẩn nút "Xuất kho". Fail-closed như canAssignSale. */
  canDispatch?: boolean;
};

export function OrderDetailPage({
  orderId,
  order,
  isLoading = false,
  onBack,
  onPatch,
  onDuplicate,
  onNavigatePrev,
  onNavigateNext,
  hasPrev = false,
  hasNext = false,
  kiotvietOptions = [],
  products = [],
  channels = [],
  staffUsers = [],
  isKoc = false,
  canAssignSale = false,
  canDispatch: canDispatchProp = false,
}: Props) {
  const { t } = useI18n();
  // Catalog CRM qua React Query; lỗi bỏ qua — UI fallback về local constants.
  const { data: crmCatalogData } = useCrmCatalogs<CrmCatalogPayload>();
  const crmCatalog = crmCatalogData ?? null;

  // Ô chọn nhân viên trong form: BE đã scope danh sách theo phòng ban của trang
  // (KOC -> Booking, còn lại -> Sales), FE chỉ dựng map theo mã kênh để hiển thị.
  const channelStaffByCode = useMemo(
    () => buildChannelStaffByCode(channels, staffUsers),
    [channels, staffUsers],
  );

  // Kho xuất: dùng chung cache React Query với trang Tồn kho. Lỗi bỏ qua — select
  // rỗng, các ô khác của trang vẫn sửa/lưu được bình thường.
  const { data: warehouseData } = useWarehousesList({ isActive: true, limit: 200, offset: 0 });
  const warehouseOptions = useMemo(
    () => (warehouseData?.items ?? []).map((w) => ({ value: String(w.id), label: w.name })),
    [warehouseData],
  );

  // Đơn đã hủy (invoice_status=2 hoặc status=6) chỉ xem, không cho sửa.
  const isReadOnly = !!order && (order.invoice_status === 2 || Number(order.status) === 6);

  // Đơn đã có mã hóa đơn: khoá khối Sản phẩm + Tài chính. Mọi thông tin khác vẫn sửa
  // được. Khác `isReadOnly` (đơn hủy) là khoá tất.
  const isInvoiceLockedOrder = !!order && isInvoiceLocked(order);

  // Đơn đã qua bước "Đã xuất kho": tồn đã trừ ở kho hiện tại nên không cho đổi kho.
  const isWarehouseLockedOrder = !!order && isFulfillmentWarehouseLocked(order);

  // Nút "Xuất kho" thủ công: cùng điều kiện khoá với ô chọn kho phía trên
  // (`isWarehouseLockedOrder` đã đọc `crm.delivery_business_status_code`, đúng
  // proxy duy nhất phía FE cho "đã xuất kho"). Chốt chặn thật vẫn là backend
  // (trả skipped `already_dispatched`) — nó đọc thêm sổ tồn, thứ payload đơn
  // không mang theo. `canDispatchProp` do trang cha tính bằng usePermission()
  // (component này render ngoài AppShellContext trong test nên không tự gọi hook).
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const canDispatch = canDispatchProp && !isWarehouseLockedOrder;

  // Tab khối cuối trang. Reset khi chuyển sang đơn khác để không mở đơn mới ở
  // tab lịch sử của đơn cũ.
  const [bottomTab, setBottomTab] = useState<string>(TAB_BEHAVIOR);
  useEffect(() => {
    setBottomTab(TAB_BEHAVIOR);
  }, [orderId]);

  const { patch, pendingCount, hasUnsavedChanges, isSaving, savePendingChanges, effectiveOrder } =
    useOrderDetailDraft({ orderId, order, onPatch, isReadOnly, isInvoiceLockedOrder });
  const confirmLeave = useUnsavedGuard(hasUnsavedChanges);

  // Navigation handlers with unsaved changes check
  const handleBackWithCheck = useCallback(async () => {
    if (await confirmLeave()) onBack?.();
  }, [confirmLeave, onBack]);

  const handleNavigatePrevWithCheck = useCallback(async () => {
    if (await confirmLeave()) onNavigatePrev?.();
  }, [confirmLeave, onNavigatePrev]);

  const handleNavigateNextWithCheck = useCallback(async () => {
    if (await confirmLeave()) onNavigateNext?.();
  }, [confirmLeave, onNavigateNext]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <OrderDetailTopbar
        orderId={orderId}
        order={order}
        displayOrder={effectiveOrder}
        hasPrev={hasPrev}
        hasNext={hasNext}
        onBack={handleBackWithCheck}
        onPrev={handleNavigatePrevWithCheck}
        onNext={handleNavigateNextWithCheck}
        onDuplicate={onDuplicate}
        isReadOnly={isReadOnly}
        canDispatch={canDispatch}
        onDispatch={() => setDispatchOpen(true)}
        hasUnsavedChanges={hasUnsavedChanges}
        pendingCount={pendingCount}
        isSaving={isSaving}
        onSave={savePendingChanges}
        t={t}
      />

      {/* ── Content ── */}
      <div className="min-h-0 flex-1">
        {isLoading || !order ? (
          <div className="flex items-center justify-center py-24">
            {isLoading ? (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <LogoSpinner size={52} />
                <p className="text-sm">Đang tải chi tiết đơn hàng...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Package className="h-10 w-10 opacity-30" />
                <p className="text-sm">Không tìm thấy đơn hàng #{orderId}</p>
                <Button variant="outline" size="sm" onClick={onBack}>
                  Quay lại danh sách
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full overflow-y-auto bg-muted/20">
            <div className="mx-auto flex w-full flex-col gap-4 p-4">
              {isReadOnly && (
                <div className="rounded-md border border-action-warning/30 bg-action-warning/10 px-3 py-2 text-sm text-action-warning">
                  Đơn đã hủy — chỉ xem, không thể chỉnh sửa.
                </div>
              )}
              {!isReadOnly && isInvoiceLockedOrder && (
                <div
                  role="status"
                  className="rounded-md border border-action-info/30 bg-action-info/10 px-3 py-2 text-sm text-action-info"
                >
                  {INVOICE_LOCK_HINT}
                </div>
              )}
              <fieldset disabled={isReadOnly} className="contents">
                {/* 2 cột 50/50: trái thông tin đơn hàng, phải sản phẩm + tài chính */}
                <div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-2 xl:items-stretch xl:gap-6">
                  <div className="h-full min-h-0">
                    <BlockGeneralInfo
                      order={effectiveOrder || order}
                      patch={patch}
                      t={t}
                      kiotvietOptions={kiotvietOptions}
                      channels={channels}
                      channelStaffByCode={channelStaffByCode}
                      warehouseOptions={warehouseOptions}
                      warehouseLocked={isWarehouseLockedOrder}
                      canAssignSale={canAssignSale}
                      className="h-full"
                    />
                  </div>

                  <div className="flex h-full min-h-0 flex-col gap-4">
                    <fieldset disabled={isInvoiceLockedOrder} className="contents">
                      <BlockProducts
                        order={effectiveOrder || order}
                        products={products}
                        patch={patch}
                        contentLocked={isInvoiceLockedOrder}
                      />
                      <BlockFinancials
                        order={effectiveOrder || order}
                        patch={patch}
                        className="flex-1"
                        contentLocked={isInvoiceLockedOrder}
                      />
                    </fieldset>
                    <label className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-xs">
                      <input
                        type="checkbox"
                        checked={!!(effectiveOrder || order).customer_return}
                        onChange={(e) => patch({ customer_return: e.target.checked })}
                      />
                      <span>{t("orders.columns.customerReturn", "Khách trả hàng")}</span>
                    </label>
                  </div>
                </div>
              </fieldset>

              <OrderDetailBottomTabs
                order={effectiveOrder || order}
                patch={patch}
                isReadOnly={isReadOnly}
                isKoc={isKoc}
                crmCatalog={crmCatalog}
                active={bottomTab}
                onChange={setBottomTab}
                t={t}
              />
            </div>
          </div>
        )}
      </div>

      {dispatchOpen && order && (
        <ManualDispatchDialog
          open={dispatchOpen}
          onOpenChange={setDispatchOpen}
          orderId={order.id}
          defaultWarehouseId={(effectiveOrder || order).fulfillment_warehouse ?? null}
          items={(effectiveOrder || order).items ?? []}
        />
      )}
    </div>
  );
}

export default OrderDetailPage;
