import { Badge } from "@/components/ui/badge";
import { ORDER_SOURCE_LABELS } from "@/features/orders/order-source";
import type { OrderColumnKey, OrderRow, OrderSource } from "@/features/orders/order-types";

import { PhoneWithCall } from "./PhoneWithCall";
import type { CellRenderer } from "./types";
import { NativeCellSelect } from "@/components/ui/native-cell-select";

// ─────────────────────────────────────────────────────────────
// Cột thông tin khách hàng — tên, SĐT, địa chỉ, giới tính,
// mã/loại khách. Giữ nguyên logic từ OrderCell cũ.
// ─────────────────────────────────────────────────────────────

export const CUSTOMER_CELL_RENDERERS: Partial<Record<OrderColumnKey, CellRenderer>> = {
  name: ({ row, canCall }) => {
    // Dòng Sheet 1/2: gộp nguồn + Tên + SĐT vào 1 cell.
    if (typeof row.contact_count === "number") {
      const sourceLabel = row.order_source
        ? (ORDER_SOURCE_LABELS[row.order_source as OrderSource] ?? row.order_source)
        : null;
      return (
        <div className="min-w-[140px]">
          {sourceLabel && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
              {sourceLabel}
            </span>
          )}
          <div className="font-medium leading-tight">{row.name || "-"}</div>
          <div className="text-xs text-muted-foreground">
            <PhoneWithCall
              phone={row.phone || row.customer_phone || ""}
              canCall={canCall}
              duplicateIds={row.duplicate_order_ids ?? []}
              returningIds={row.returning_order_ids ?? []}
            />
          </div>
        </div>
      );
    }
    return (
      <span className="block min-w-[150px] font-medium whitespace-nowrap">{row.name || "-"}</span>
    );
  },

  phone: ({ row, canCall }) => (
    <PhoneWithCall
      phone={row.phone || row.customer_phone || ""}
      canCall={canCall}
      duplicateIds={row.duplicate_order_ids ?? []}
      returningIds={row.returning_order_ids ?? []}
    />
  ),

  address: ({ row }) => (
    <span
      className="block min-w-[200px] max-w-[340px] wrap-break-word text-xs leading-snug"
      title={row.address || undefined}
    >
      {row.address || "-"}
    </span>
  ),

  raw_address: ({ row }) => (
    <span
      className="block min-w-[200px] max-w-[340px] wrap-break-word text-xs leading-snug"
      title={row.raw_address || undefined}
    >
      {row.raw_address || "-"}
    </span>
  ),

  has_address: ({ row, t }) => {
    // Cờ BẤT BIẾN ghi lúc ingest (cùng nghĩa bộ lọc "Địa chỉ khi đổ đơn"): sale
    // điền địa chỉ sau đó cờ vẫn giữ false. Vắng field (payload cũ) = có địa chỉ,
    // khớp db_default=True và use-filter-mirror.
    const hasAddress = row.has_address !== false;
    return hasAddress ? (
      <Badge className="border-0 bg-sky-100 text-sky-700 whitespace-nowrap">
        {t("orders.filters.hasAddressYes", "Có địa chỉ")}
      </Badge>
    ) : (
      <Badge className="border-0 bg-amber-100 text-amber-700 whitespace-nowrap">
        {t("orders.filters.hasAddressNo", "Không có địa chỉ")}
      </Badge>
    );
  },

  kiotviet_location: ({ row }) => (
    <span className="block whitespace-nowrap text-xs leading-snug">
      {row.kiotviet_location || "-"}
    </span>
  ),

  kiotviet_ward: ({ row }) => (
    <span className="block whitespace-nowrap text-xs leading-snug">{row.kiotviet_ward || "-"}</span>
  ),

  customer_gender: ({ row, t, onPatch, canEditField }) => {
    const canEdit = !!row.can_edit && !!onPatch && canEditField("customer_gender");
    const value = row.customer_gender;
    const current = value === 1 ? "1" : value === 0 ? "0" : "";
    if (!canEdit) {
      return (
        <span>
          {current === "1"
            ? t("gender.male", "Nam")
            : current === "0"
              ? t("gender.female", "Nữ")
              : "-"}
        </span>
      );
    }
    return (
      <NativeCellSelect
        className="min-w-[80px]"
        value={current}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          e.stopPropagation();
          const raw = e.target.value;
          const next = raw === "1" ? 1 : raw === "0" ? 0 : null;
          onPatch?.(row.id, { customer_gender: next } as Partial<OrderRow>);
        }}
      >
        <option value="">-</option>
        <option value="1">{t("gender.male", "Nam")}</option>
        <option value="0">{t("gender.female", "Nữ")}</option>
      </NativeCellSelect>
    );
  },

  customer_code: ({ row }) => <span>{row.customer_code || "-"}</span>,

  customer_type: ({ row, t }) => {
    const isNew = row.customer_is_new;
    if (isNew === null || isNew === undefined) return <span>-</span>;
    return isNew ? (
      <Badge className="border-0 bg-sky-100 text-sky-700 whitespace-nowrap">
        {t("orders.customerType.new", "Khách mới")}
      </Badge>
    ) : (
      <Badge className="border-0 bg-slate-100 text-slate-600 whitespace-nowrap">
        {t("orders.customerType.old", "Khách cũ")}
      </Badge>
    );
  },
};
