import { memo, type ReactNode } from "react";
import { Phone } from "lucide-react";

import { useI18n } from "@/i18n";
import type { OrderColumnKey, OrderRow } from "@/features/orders/order-types";
import type { AddressCatalog, KiotVietOption } from "@/features/orders/use-orders-data";
import type { ChannelRow } from "@/features/channels/types";
import { isSlaBreached } from "@/features/orders/sla";

import type { CrmCatalogPayload } from "./crm-catalog";
import { OrderCell } from "./OrderCell";
import { resolveRowTint } from "./row-tint";

/** Ngữ cảnh ô dùng chung cho mọi thẻ — cùng bộ prop OrdersTable đưa cho OrderTableRow. */
export type OrderMobileCellProps = {
  canCall: boolean;
  canAssignSale: boolean;
  canEditField: (field: string) => boolean;
  kiotvietOptions: KiotVietOption[];
  addressCatalog: AddressCatalog;
  channelStaffByCode: Record<string, Array<{ id: number; name: string }>>;
  channels?: ChannelRow[];
  crmCatalog: CrmCatalogPayload | null;
  warehouseOptions: Array<{ id: number; name: string }>;
  onPatch: (id: number, payload: Partial<OrderRow>, silent?: boolean) => Promise<void>;
};

type Props = {
  row: OrderRow;
  isSelected: boolean;
  isActive: boolean;
  cellProps: OrderMobileCellProps;
  onOpenDetails?: (order: OrderRow) => void;
  onToggleSelection: (id: number, withShift: boolean) => void;
};

/**
 * Thẻ đơn cho điện thoại (<768) — thay dòng bảng 1.200px phải cuộn ngang.
 *
 * Ô Mã kênh / Trạng thái sale / Tổng tiền / Trạng thái / Ngày tạo render qua
 * đúng `OrderCell` của bảng → cùng quyền sửa, cùng handler onPatch, không viết
 * lại nghiệp vụ. Chạm thẻ = click dòng (mở chi tiết); vùng control chặn nổi bọt.
 */
function OrderMobileCardImpl({
  row,
  isSelected,
  isActive,
  cellProps,
  onOpenDetails,
  onToggleSelection,
}: Props) {
  const { t } = useI18n();
  const phone = row.phone || row.customer_phone || "";
  const salesCode = row.crm?.sales_status_code || "";
  const slaBreach =
    !salesCode &&
    typeof row.contact_count === "number" &&
    isSlaBreached({ created_at: row.created_at, contact_count: row.contact_count });
  const { row: tint } = resolveRowTint({
    isSelected,
    hasDuplicatePhone: (row.duplicate_order_ids?.length ?? 0) > 0,
    hasReturningOrder: (row.returning_order_ids?.length ?? 0) > 0,
    slaBreach,
    isActiveRow: isActive,
    salesStatusCode: salesCode,
  });
  const cell = (columnKey: OrderColumnKey): ReactNode => (
    <OrderCell row={row} columnKey={columnKey} {...cellProps} />
  );

  return (
    <li
      data-testid="order-mobile-card"
      className={`cursor-pointer rounded-lg border px-3 py-2.5 ${tint} ${
        isSelected ? "border-primary ring-1 ring-primary" : "border-border"
      } ${slaBreach ? "border-l-2 border-l-red-500" : ""}`}
      onClick={() => {
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) return;
        onOpenDetails?.(row);
      }}
    >
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={isSelected}
          aria-label={`${t("orders.mobile.select", "Chọn đơn")} ${row.name || `#${row.id}`}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelection(row.id, e.shiftKey);
          }}
          onChange={() => {}}
          className="mt-0.5 size-5 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm leading-tight font-semibold">{row.name || "-"}</div>
          {phone ? (
            <a
              href={`tel:${phone}`}
              onClick={(e) => e.stopPropagation()}
              className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary"
            >
              <Phone className="h-3 w-3" />
              {phone}
            </a>
          ) : null}
        </div>
        <div className="shrink-0 text-right text-sm">{cell("total_after_discount")}</div>
      </div>

      {/* Ô sửa inline: chặn click để chạm select không mở chi tiết đơn. */}
      <div
        className="mt-2 grid grid-cols-2 gap-2 [&_select]:w-full [&_select]:min-w-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0">
          <div className="mb-0.5 text-2xs text-muted-foreground">
            {t("orders.columns.channelCode", "Mã kênh")}
          </div>
          {cell("channel_code")}
        </div>
        <div className="min-w-0">
          <div className="mb-0.5 text-2xs text-muted-foreground">
            {t("orders.columns.salesStatus", "Trạng thái sale")}
          </div>
          {cell("sales_status")}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="min-w-0 truncate">{cell("status")}</span>
        <span className="shrink-0">{cell("created_at")}</span>
      </div>
    </li>
  );
}

export const OrderMobileCard = memo(OrderMobileCardImpl);
