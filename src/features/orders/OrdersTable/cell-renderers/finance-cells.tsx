import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ORDER_VAT_OPTIONS, OrderVatBadge } from "@/features/orders/vat";
import type { OrderColumnKey, OrderRow, OrderVat } from "@/features/orders/order-types";

import { formatAmount } from "../constants";
import type { CellRenderer } from "./types";
import { NativeCellSelect } from "@/components/ui/native-cell-select";

// ─────────────────────────────────────────────────────────────
// Cột tiền / hóa đơn / VAT — giữ nguyên logic từ OrderCell cũ.
// ─────────────────────────────────────────────────────────────

export const FINANCE_CELL_RENDERERS: Partial<Record<OrderColumnKey, CellRenderer>> = {
  sku: ({ row }) => {
    // Dòng Sheet 1/2: SKU + giá cùng cell.
    if (typeof row.contact_count === "number") {
      return (
        <div className="leading-tight">
          <div className="font-mono text-xs font-medium">{row.sku || "-"}</div>
          <div className="text-xs text-muted-foreground">{formatAmount(row.total_amount)}</div>
        </div>
      );
    }
    return <span className="font-mono text-xs">{row.sku || "-"}</span>;
  },

  quantity: ({ row }) => <span className="text-center block">{row.quantity ?? "-"}</span>,

  total_amount: ({ row }) => <span className="font-medium">{formatAmount(row.total_amount)}</span>,

  total_after_discount: ({ row }) => (
    <span className="font-medium">{formatAmount(row.total_after_discount)}</span>
  ),

  customer_prepaid: ({ row }) => <span>{formatAmount(row.customer_prepaid)}</span>,

  payment_method: ({ row }) => <span>{row.payment_method || "-"}</span>,

  invoice_code: ({ row }) => <span>{row.invoice_code || "-"}</span>,

  invoice_status: ({ row, t }) => {
    if (row.invoice_status == null) return <span>-</span>;
    const invoiceStatusValue = String(row.invoice_status);
    const invoiceStatusColors: Record<string, { bg: string; text: string }> = {
      "1": { bg: "bg-green-100", text: "text-green-700" },
      "2": { bg: "bg-red-100", text: "text-red-700" },
      "3": { bg: "bg-yellow-100", text: "text-yellow-700" },
      "5": { bg: "bg-orange-100", text: "text-orange-700" },
    };
    const invColors = invoiceStatusColors[invoiceStatusValue] || {
      bg: "bg-gray-100",
      text: "text-gray-700",
    };
    return (
      <Badge className={`border-0 whitespace-nowrap ${invColors.bg} ${invColors.text}`}>
        {t(`invoiceStatus.${invoiceStatusValue}`, invoiceStatusValue)}
      </Badge>
    );
  },

  vat: ({ row, onPatch, canEditField }) => {
    const canEdit = !!row.can_edit && !!onPatch && canEditField("vat");
    const current = (row.vat ?? "no") as OrderVat;
    if (!canEdit) {
      return <OrderVatBadge vat={current} />;
    }
    return (
      <NativeCellSelect
        className="min-w-[90px]"
        value={current}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          e.stopPropagation();
          onPatch?.(row.id, { vat: e.target.value as OrderVat } as Partial<OrderRow>);
        }}
      >
        {ORDER_VAT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </NativeCellSelect>
    );
  },

  is_export_vat: ({ row, t, onPatch, canEditField }) => {
    const canEdit = !!row.can_edit && !!onPatch && canEditField("is_export_vat");
    const on = Boolean(row.is_export_vat);
    const label = on
      ? t("orders.isExportVat.yes", "Đã xuất")
      : t("orders.isExportVat.no", "Chưa xuất");
    const cls = on
      ? "bg-action-success/10 text-action-success border-action-success/30"
      : "bg-muted text-muted-foreground border-border";
    if (!canEdit) {
      return (
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${cls}`}
        >
          {label}
        </span>
      );
    }
    return (
      <button
        type="button"
        className={`inline-flex cursor-pointer items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors hover:opacity-80 ${cls}`}
        onClick={(e) => {
          e.stopPropagation();
          onPatch?.(row.id, { is_export_vat: !on } as Partial<OrderRow>);
        }}
      >
        {label}
      </button>
    );
  },

  vat_link: ({ row, t, onPatch, canEditField }) => {
    const canEdit = !!row.can_edit && !!onPatch && canEditField("vat_link");
    const link = row.vat_link || "";
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          className="h-7 w-full min-w-[140px] rounded border border-border bg-transparent px-1.5 text-xs focus:outline-hidden focus:ring-1 focus:ring-ring disabled:cursor-default disabled:opacity-60"
          defaultValue={link}
          disabled={!canEdit}
          placeholder={t("orders.placeholders.vatLink", "Dán link hóa đơn")}
          onClick={(e) => e.stopPropagation()}
          onBlur={(e) => {
            const newValue = e.target.value.trim();
            if (newValue === (row.vat_link || "")) return;
            onPatch?.(row.id, { vat_link: newValue } as Partial<OrderRow>);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            title={t("orders.placeholders.openVatLink", "Mở link hóa đơn")}
            className="shrink-0 text-primary hover:text-primary/80"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>
    );
  },
};
