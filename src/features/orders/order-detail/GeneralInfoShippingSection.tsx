import { Badge } from "@/components/ui/badge";
import { ERow, InfoRow } from "../order-detail-shared";
import { fmt } from "../order-detail-format";
import { statusBadgeClass } from "../order-status-badge";
import type { OrderRow } from "../order-types";
import { ShippingCodeLink } from "../ShippingCodeLink";
import { FULFILLMENT_WAREHOUSE_LOCK_HINT } from "../fulfillment-warehouse-lock";
import { PancakeDeliverySection } from "@/features/pancake-pos/components/PancakeDeliverySection";

type Props = {
  order: OrderRow;
  patch: (p: Partial<OrderRow>) => void;
  t: (k: string, f?: string) => string;
  warehouseOptions: Array<{ value: string; label: string }>;
  warehouseLocked: boolean;
};

/** Nhóm "Vận chuyển" trong khối Thông tin đơn hàng. */
export function GeneralInfoShippingSection({
  order,
  patch,
  t,
  warehouseOptions,
  warehouseLocked,
}: Props) {
  return (
    <section className="pt-3 flex-1 min-h-0">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Vận chuyển
      </h4>
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <InfoRow
          stacked
          label="Trạng thái"
          value={
            <Badge className={statusBadgeClass(order.status)} variant="outline">
              {t(`status.${order.status}`, String(order.status))}
            </Badge>
          }
        />
        <InfoRow
          stacked
          label="Mã vận đơn"
          value={
            <ShippingCodeLink
              shippingCode={order.shipping_code}
              providerCode={order.shipping_provider}
            />
          }
        />
        <ERow
          stacked
          label={t("orders.columns.fulfillmentWarehouse", "Kho xuất")}
          rawValue={order.fulfillment_warehouse != null ? String(order.fulfillment_warehouse) : ""}
          display={
            <span className="text-sm font-medium">{order.fulfillment_warehouse_name || "—"}</span>
          }
          type="select"
          options={warehouseOptions}
          disabled={warehouseLocked}
          disabledHint={FULFILLMENT_WAREHOUSE_LOCK_HINT}
          onSave={(v) => {
            // Patch kèm tên kho (từ label option) để ô hiện ngay giá trị mới —
            // `fulfillment_warehouse_name` là field read-only phía BE, gửi thừa
            // lên PATCH cũng bị serializer bỏ qua, y như cặp staff_id/staff_name.
            const selected = warehouseOptions.find((o) => o.value === String(v)) || null;
            patch({
              fulfillment_warehouse: v ? Number(v) : null,
              fulfillment_warehouse_name: selected?.label ?? null,
            });
          }}
        />
        <ERow
          stacked
          label="Phí vận chuyển"
          rawValue={order.shipping_fee}
          display={<span className="text-sm font-medium">{fmt(order.shipping_fee)}</span>}
          onSave={(v) => patch({ shipping_fee: String(v) })}
        />
        <InfoRow stacked label="Mã hóa đơn" value={order.invoice_code} />
        {order.old_invoice_code && (
          <InfoRow stacked label="HĐ Kiot cũ" value={order.old_invoice_code} />
        )}
      </div>
      {order.id ? <PancakeDeliverySection orderId={order.id} /> : null}
    </section>
  );
}
