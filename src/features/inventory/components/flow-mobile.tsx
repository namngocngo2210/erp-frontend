import type { ReactNode } from "react";

import { LogoSpinner } from "@/components/ui/logo-spinner";
import type {
  FlowPendingScanItem,
  IssueOrdersHistoryItem,
  IssueSkuOrderItem,
  IssueSkusHistoryItem,
  ReturnHistoryItem,
  ReturnSkuReturnItem,
  ReturnSkusHistoryItem,
} from "@/lib/api/inventory-flow";

import { displayQty, shippingCodeLabel } from "../flow-quantity";
import { FlowNoteCell, PendingBadge, PendingTime, SkuLines } from "./flow-shared";
import {
  CardActions,
  CardField,
  CardFields,
  MobileCard,
  SkuCard,
  SkuDetailCard,
  SkuDetailList,
} from "./mobile-cards";
import { formatDateTimeVi } from "@/lib/format";

/**
 * Đường mobile của hai tab Lịch sử nhập xuất (Xuất hàng ra / Nhập hàng hoàn về).
 *
 * Desktop giữ nguyên bảng trong IssueTab/ReturnTab — file này CHỈ là cách bày lại
 * đúng những field đó dưới dạng thẻ. Cố ý không đọc dữ liệu hay giữ state: mọi
 * hành vi (bung dòng, khớp đơn, điều chỉnh) vẫn do tab quyết định và truyền xuống,
 * nên hai đường không thể trôi lệch hành vi.
 */

/** Nhãn mã chứng từ của 1 dòng chi tiết trong tab Xuất — phiếu kho/chuyển kho/đơn. */
function issueDetailTitle(o: IssueSkuOrderItem): string {
  if (o.kind === "document") return `Phiếu xuất kho ${o.doc_code ?? ""}`;
  if (o.kind === "transfer") return `Phiếu chuyển kho ${o.doc_code ?? ""}`;
  return o.invoice_code ?? o.order_code ?? "—";
}

export function IssueSkuMobileCard({
  row,
  expanded,
  onToggle,
  detailLoading,
  details,
}: {
  row: IssueSkusHistoryItem;
  expanded: boolean;
  onToggle: () => void;
  detailLoading: boolean;
  details: IssueSkuOrderItem[];
}) {
  const notes = [
    row.doc_count > 0 ? `gồm ${row.doc_quantity} phiếu kho` : null,
    row.transfer_count > 0 ? `gồm ${row.transfer_quantity} chuyển kho` : null,
  ].filter(Boolean);

  return (
    <SkuCard
      sku={row.sku ?? "—"}
      name={row.name ?? "—"}
      countLabel="Số đơn"
      count={row.order_count}
      qtyLabel="SL xuất"
      qty={displayQty(
        row.net + row.doc_quantity + row.transfer_quantity,
        row.dispatched + row.doc_quantity + row.transfer_quantity,
      )}
      qtyNote={notes.length > 0 ? notes.join(" · ") : undefined}
      expanded={expanded}
      onToggle={onToggle}
    >
      <SkuDetailList>
        {detailLoading ? (
          <LogoSpinner size={22} label="Đang tải..." className="mx-auto" />
        ) : (
          details.map((o) => (
            <SkuDetailCard
              key={o.kind === "order" ? `order-${o.order_id}` : `doc-${o.doc_code}`}
              title={issueDetailTitle(o)}
              qty={displayQty(o.net, o.dispatched)}
              qtyLabel="SL xuất"
              fields={[
                { label: "Mã vận đơn", value: o.shipping_code ?? "—" },
                { label: "Kho", value: o.warehouse_name ?? "—" },
              ]}
            />
          ))
        )}
      </SkuDetailList>
    </SkuCard>
  );
}

export function ReturnSkuMobileCard({
  row,
  expanded,
  onToggle,
  detailLoading,
  details,
}: {
  row: ReturnSkusHistoryItem;
  expanded: boolean;
  onToggle: () => void;
  detailLoading: boolean;
  details: ReturnSkuReturnItem[];
}) {
  return (
    <SkuCard
      sku={row.sku ?? "—"}
      name={row.name ?? "—"}
      countLabel="Số phiếu"
      count={row.return_count}
      qtyLabel="SL hoàn"
      qty={row.qty_total + row.transfer_quantity}
      qtyNote={row.transfer_count > 0 ? `gồm ${row.transfer_quantity} chuyển kho` : undefined}
      expanded={expanded}
      onToggle={onToggle}
    >
      <SkuDetailList>
        {detailLoading ? (
          <LogoSpinner size={22} label="Đang tải..." className="mx-auto" />
        ) : (
          details.map((rt) => (
            <SkuDetailCard
              key={rt.kind === "transfer" ? `tr-${rt.code}` : `ret-${rt.return_id}`}
              title={rt.code}
              qty={rt.quantity}
              qtyLabel="SL"
              fields={[
                {
                  label: "Mã hóa đơn nguồn",
                  value: rt.source_order_invoice_code ?? rt.source_order_code ?? "—",
                },
                { label: "Mã vận đơn", value: rt.shipping_code ?? "—" },
                { label: "Kho", value: rt.warehouse_name ?? "—" },
                { label: "Loại hoàn", value: rt.return_type_label },
              ]}
            />
          ))
        )}
      </SkuDetailList>
    </SkuCard>
  );
}

export function IssueOrderMobileCard({ row }: { row: IssueOrdersHistoryItem }) {
  const isDoc = row.kind === "document" || row.kind === "transfer";
  return (
    <MobileCard>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-sm">
          {isDoc ? (
            <div className="flex flex-wrap items-start gap-1.5">
              <span
                className={`rounded px-1.5 py-0.5 text-xs ${
                  row.kind === "transfer"
                    ? "bg-sky-100 text-sky-700"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {row.kind === "transfer" ? "Phiếu chuyển kho" : "Phiếu xuất kho"} {row.doc_code}
              </span>
              <SkuLines code={null} lines={row.lines} />
            </div>
          ) : (
            <SkuLines code={row.invoice_code ?? row.order_code} lines={row.lines} />
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold">{displayQty(row.net, row.dispatched)}</p>
          <p className="text-xs text-muted-foreground">SL xuất</p>
        </div>
      </div>

      <CardFields className="mt-2">
        <CardField label="Mã vận đơn" value={shippingCodeLabel(row)} />
        <CardField label="Kho" value={row.warehouse_name ?? "—"} />
        <CardField label="Người thực hiện" value={row.performed_by || "—"} />
        <CardField label="Số SKU" value={row.sku_count} />
        <CardField label="Thời gian" value={row.last_at ? formatDateTimeVi(row.last_at) : "—"} />
        <CardField
          label="Ghi chú"
          value={
            <FlowNoteCell
              targetType={row.kind === "order" ? "order_dispatch" : "stock_document"}
              targetId={row.kind === "order" ? row.order_id : row.doc_id}
              note={row.note ?? ""}
            />
          }
        />
      </CardFields>
    </MobileCard>
  );
}

export function ReturnOrderMobileCard({
  row,
  note,
  actions,
}: {
  row: ReturnHistoryItem;
  note: ReactNode;
  actions: ReactNode;
}) {
  return (
    <MobileCard>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-sm">
          {row.kind === "transfer" ? (
            <span className="rounded bg-sky-100 px-1.5 py-0.5 text-xs text-sky-700">
              {row.code}
            </span>
          ) : (
            <span className="font-medium">{row.code}</span>
          )}
          <div className="mt-1">
            <SkuLines
              code={row.source_order_invoice_code ?? row.source_order_code}
              lines={row.lines}
            />
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold">{row.qty_total}</p>
          <p className="text-xs text-muted-foreground">SL hoàn</p>
        </div>
      </div>

      <CardFields className="mt-2">
        <CardField label="Mã vận đơn" value={row.shipping_code ?? "—"} />
        <CardField label="Kho" value={row.warehouse_name ?? "—"} />
        <CardField label="Người thực hiện" value={row.performed_by || "—"} />
        <CardField label="Loại hoàn" value={row.return_type_label} />
        <CardField label="Ghi chú" value={note} />
        <CardField label="Thời gian" value={formatDateTimeVi(row.created_at)} />
      </CardFields>

      {actions && <CardActions>{actions}</CardActions>}
    </MobileCard>
  );
}

/**
 * Thẻ cho 1 mã vận đơn chờ khớp (đứng đầu danh sách ở cả hai tab).
 *
 * Giữ nguyên quy ước màu của bản bảng: đã khớp = xanh, chưa khớp = hổ phách — kho
 * đọc bảng này theo màu trước khi đọc chữ.
 */
export function FlowPendingMobileCard({
  item,
  qtyLabel,
  note,
  actions,
  children,
}: {
  item: FlowPendingScanItem;
  qtyLabel: string;
  note: ReactNode;
  actions: ReactNode;
  children?: ReactNode;
}) {
  return (
    <MobileCard tone={item.status === "matched" ? "green" : "amber"}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold">{item.code}</p>
          <div className="mt-1">
            <PendingBadge item={item} />
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold">{item.status === "matched" ? item.qty : "—"}</p>
          <p className="text-xs text-muted-foreground">{qtyLabel}</p>
        </div>
      </div>

      <div className="mt-2 text-xs">
        <SkuLines code={item.matched_order_code || null} lines={item.lines} />
      </div>

      <CardFields className="mt-2">
        <CardField label="Kho" value={item.warehouse_name ?? "—"} />
        <CardField label="Người thực hiện" value={item.performed_by || "—"} />
        <CardField label="Số SKU" value={item.sku_count || "—"} />
        <CardField label="Ghi chú" value={note} />
        <CardField label="Thời gian" value={<PendingTime item={item} />} />
      </CardFields>

      {actions && <CardActions>{actions}</CardActions>}
      {children}
    </MobileCard>
  );
}

/** Dòng tổng cuối danh sách — thay cho `<tfoot>` của bản bảng. */
export function FlowTotalMobileCard({ label, total }: { label: ReactNode; total: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm font-medium">
      <span className="min-w-0">{label}</span>
      <span className="shrink-0">{total}</span>
    </div>
  );
}
