import { memo } from "react";

import { TableCell, TableRow } from "@/components/ui/table";
import { useI18n } from "@/i18n";
import { isSlaBreached } from "@/features/orders/sla";
import type { OrderColumnKey, OrderRow } from "@/features/orders/order-types";
import type { AddressCatalog, KiotVietOption } from "@/features/orders/use-orders-data";
import type { ChannelRow } from "@/features/channels/types";

import { getColumnConfig } from "./constants";
import { resolveRowTint } from "./row-tint";
import type { CrmCatalogPayload } from "./crm-catalog";
import { OrderCell } from "./OrderCell";

// ─────────────────────────────────────────────────────────────
// OrderTableRow — single table row. Extracted + memoized so that
// re-renders of the table (e.g. selection / catalog changes) only
// re-render the rows whose props actually changed. Pure JSX move.
// ─────────────────────────────────────────────────────────────
type OrderTableRowProps = {
  row: OrderRow;
  orderedColumns: OrderColumnKey[];
  lockedSet: ReadonlySet<OrderColumnKey>;
  /** Offset `left` sticky theo width THẬT của header (đo ở OrdersTable). */
  lockedLeftByKey: Partial<Record<OrderColumnKey, number>>;
  isActiveRow: boolean;
  isSelected: boolean;
  isTransferred: boolean;
  /** Trang landing: hiện nút click-to-call cạnh SĐT (webphone Zenify). */
  canCall?: boolean;
  /** Quyền `sale-assignment:edit` — thiếu thì cột sale chỉ đọc. */
  canAssignSale?: boolean;
  /** Quyền sửa-theo-field — cha (OrdersTable) gọi `useOrderFieldGrants`, truyền
   * xuống dạng prop để OrderCell test được không cần AppShellContext.Provider. */
  canEditField?: (field: string) => boolean;
  kiotvietOptions: KiotVietOption[];
  addressCatalog: AddressCatalog;
  channelStaffByCode: Record<string, Array<{ id: number; name: string }>>;
  channels?: ChannelRow[];
  crmCatalog: CrmCatalogPayload | null;
  warehouseOptions: Array<{ id: number; name: string }>;
  onPatch: (id: number, payload: Partial<OrderRow>, silent?: boolean) => Promise<void>;
  onOpenDetails?: (order: OrderRow) => void;
  onToggleRowSelection: (id: number, withShift: boolean) => void;
};

function OrderTableRowImpl({
  row,
  orderedColumns,
  lockedSet,
  lockedLeftByKey,
  isActiveRow,
  isSelected,
  isTransferred,
  canCall = false,
  canAssignSale = false,
  canEditField,
  kiotvietOptions,
  addressCatalog,
  channelStaffByCode,
  channels,
  crmCatalog,
  warehouseOptions,
  onPatch,
  onOpenDetails,
  onToggleRowSelection,
}: OrderTableRowProps) {
  const { t } = useI18n();
  const salesCode = row.crm?.sales_status_code || "";
  // Trùng SĐT do backend chấm (cùng SĐT + cùng sản phẩm, ≤30 ngày) — không còn
  // đoán bằng cách so các dòng đang hiển thị, nên bắt được cả đơn ở trang khác.
  const hasDuplicatePhone = (row.duplicate_order_ids?.length ?? 0) > 0;
  // Khách đang/vừa hoàn đơn cùng sản phẩm — cảnh báo riêng, nền cam đè lên đỏ.
  const hasReturningOrder = (row.returning_order_ids?.length ?? 0) > 0;
  // SLA: đơn Sheet 1/2 (có contact_count) mới & chưa gọi quá 30 phút → tô đỏ cảnh báo.
  // Chỉ áp cho lead CHƯA xử lý (chưa set trạng thái sale); đơn đã có trạng thái
  // (vd "Đã chốt") không còn là lead bỏ quên nên giữ nguyên màu theo trạng thái.
  const slaBreach =
    !salesCode &&
    typeof row.contact_count === "number" &&
    isSlaBreached({ created_at: row.created_at, contact_count: row.contact_count });
  const { row: baseRowClass, stickyBg } = resolveRowTint({
    isSelected,
    hasDuplicatePhone,
    hasReturningOrder,
    slaBreach,
    isActiveRow,
    salesStatusCode: salesCode,
  });
  return (
    <TableRow
      className={`cursor-pointer border-b border-border/70 ${baseRowClass} ${slaBreach ? "border-l-2 border-l-red-500" : ""} ${isTransferred ? "opacity-75" : ""}`}
      onClick={() => {
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) return;
        onOpenDetails?.(row);
      }}
    >
      {/* Checkbox */}
      <TableCell
        className="sticky left-0 z-10 w-12 bg-card px-2 py-1 text-center"
        style={{
          position: "sticky",
          left: 0,
          zIndex: 10,
          backgroundColor: stickyBg,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative inline-flex items-center justify-center">
          <input
            type="checkbox"
            checked={isSelected}
            onClick={(e) => onToggleRowSelection(row.id, e.shiftKey)}
            onChange={() => {}}
            className="size-4"
          />
          {isTransferred && (
            <span
              className="absolute -right-1.5 -top-1.5 inline-flex h-3 w-3 items-center justify-center rounded-full border border-white bg-action-success"
              title={t("orders.landing.transferred", "Đã chuyển sang Đơn hàng")}
              aria-label={t("orders.landing.transferred", "Đã chuyển sang Đơn hàng")}
            />
          )}
        </div>
      </TableCell>
      {/* Data cells */}
      {orderedColumns.map((columnKey) => {
        const config = getColumnConfig(columnKey);
        if (!config) return null;

        const isLocked = lockedSet.has(columnKey);
        const lockedIndex = orderedColumns.filter((c) => lockedSet.has(c)).indexOf(columnKey);
        const stickyStyle = isLocked
          ? {
              position: "sticky" as const,
              left: `${lockedLeftByKey[columnKey] ?? 0}px`,
              zIndex: 10 - lockedIndex,
              backgroundColor: stickyBg,
              boxShadow: "1px 0 0 0 var(--border)",
            }
          : {};

        return (
          <TableCell key={columnKey} className="px-2 py-1 text-sm" style={stickyStyle}>
            <OrderCell
              row={row}
              columnKey={columnKey}
              kiotvietOptions={kiotvietOptions}
              addressCatalog={addressCatalog}
              channelStaffByCode={channelStaffByCode}
              channels={channels}
              crmCatalog={crmCatalog}
              warehouseOptions={warehouseOptions}
              onPatch={onPatch}
              canCall={canCall}
              canAssignSale={canAssignSale}
              canEditField={canEditField}
            />
          </TableCell>
        );
      })}
    </TableRow>
  );
}

export const OrderTableRow = memo(OrderTableRowImpl);
