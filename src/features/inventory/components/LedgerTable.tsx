import { Eye, FileSpreadsheet, Paperclip, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { ResponsiveList } from "@/components/ui/responsive-list";
import type { LedgerRow } from "@/features/inventory/ledger-types";

import { CardActions, CardField, CardFields, MobileCard } from "./mobile-cards";
import { formatDateVi } from "@/lib/format";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";

// Nháp = trung tính; chờ duyệt = cảnh báo; đã ghi sổ = thành công; huỷ = lỗi.
const STOCK_STATUS_TONE: Record<string, StatusTone> = {
  draft: "neutral",
  pending_approval: "warning",
  posted: "success",
  cancelled: "danger",
};

const BTN = "h-7 px-2 text-xs";

export type LedgerTableProps = {
  rows: LedgerRow[];
  isLoading: boolean;
  canApproveStock: boolean;
  busy: boolean;
  onViewStock: (id: number) => void;
  onExportStock: (row: LedgerRow) => void;
  onEditStock: (id: number) => void;
  onSubmitStock: (id: number) => void;
  onApproveStock: (id: number) => void;
  onRejectStock: (id: number) => void;
  onCancelStock: (id: number) => void;
};

type LedgerActionProps = Pick<
  LedgerTableProps,
  | "canApproveStock"
  | "busy"
  | "onViewStock"
  | "onExportStock"
  | "onEditStock"
  | "onSubmitStock"
  | "onApproveStock"
  | "onRejectStock"
  | "onCancelStock"
>;

/**
 * Bộ nút thao tác của 1 phiếu. Tách riêng vì bảng (desktop) và thẻ (mobile) phải
 * hiện đúng cùng một tập nút theo trạng thái — để hai chỗ tự chép luật thì sớm
 * muộn cũng lệch.
 */
function LedgerRowActions({
  row,
  canApproveStock,
  busy,
  onViewStock,
  onExportStock,
  onEditStock,
  onSubmitStock,
  onApproveStock,
  onRejectStock,
  onCancelStock,
}: LedgerActionProps & { row: LedgerRow }) {
  return (
    <>
      <Button size="sm" variant="outline" className={BTN} onClick={() => onViewStock(row.id)}>
        <Eye className="mr-1 size-3.5" />
        Xem
      </Button>
      {/* Xuất file phiếu — mở với mọi trạng thái: phiếu nháp cũng cần đưa cho
          kho đối chiếu trước khi gửi duyệt. */}
      <Button size="sm" variant="outline" className={BTN} onClick={() => onExportStock(row)}>
        <FileSpreadsheet className="mr-1 size-3.5" />
        Excel
      </Button>
      {row.status === "draft" && (
        <>
          <Button size="sm" variant="outline" className={BTN} onClick={() => onEditStock(row.id)}>
            <Pencil className="mr-1 size-3.5" />
            Sửa
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={`${BTN} border-action-info/30 text-action-info hover:bg-action-info/10`}
            disabled={busy}
            onClick={() => onSubmitStock(row.id)}
          >
            Gửi duyệt
          </Button>
        </>
      )}
      {row.status === "pending_approval" && canApproveStock && (
        <>
          <Button
            size="sm"
            variant="outline"
            className={`${BTN} border-action-success/30 text-action-success hover:bg-action-success/10`}
            disabled={busy}
            onClick={() => onApproveStock(row.id)}
          >
            Duyệt
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={`${BTN} border-destructive/30 text-destructive hover:bg-destructive/10`}
            disabled={busy}
            onClick={() => onRejectStock(row.id)}
          >
            Từ chối
          </Button>
        </>
      )}
      {row.status === "posted" && canApproveStock && (
        <Button
          size="sm"
          variant="outline"
          className={`${BTN} border-destructive/30 text-destructive hover:bg-destructive/10`}
          disabled={busy}
          onClick={() => onCancelStock(row.id)}
        >
          Huỷ
        </Button>
      )}
    </>
  );
}

/** Chip trạng thái phiếu — dùng chung bảng và thẻ. */
function LedgerStatusBadge({ row }: { row: LedgerRow }) {
  return (
    <StatusBadge tone={STOCK_STATUS_TONE[row.status] ?? "neutral"}>{row.status_label}</StatusBadge>
  );
}

/** Bảng sổ phiếu kho (nhập/xuất/điều chỉnh/chuyển kho). */
export function LedgerTable({
  rows,
  isLoading,
  canApproveStock,
  busy,
  onViewStock,
  onExportStock,
  onEditStock,
  onSubmitStock,
  onApproveStock,
  onRejectStock,
  onCancelStock,
}: LedgerTableProps) {
  const actionProps: LedgerActionProps = {
    canApproveStock,
    busy,
    onViewStock,
    onExportStock,
    onEditStock,
    onSubmitStock,
    onApproveStock,
    onRejectStock,
    onCancelStock,
  };

  return (
    <ResponsiveList
      items={isLoading ? [] : rows}
      getKey={(r) => r.id}
      loading={isLoading}
      emptyText="Chưa có phiếu nào."
      renderCard={(r) => (
        <MobileCard>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-words text-sm font-semibold">{r.code}</p>
              <p className="text-xs text-muted-foreground">{r.type_label}</p>
            </div>
            <LedgerStatusBadge row={r} />
          </div>

          <CardFields className="mt-2">
            <CardField label="Kho" value={r.warehouse_label} />
            <CardField label="Ngày" value={formatDateVi(r.created_at)} />
            <CardField
              label="Chứng từ"
              value={
                r.has_attachments ? (
                  <button
                    type="button"
                    onClick={() => onViewStock(r.id)}
                    className="inline-flex items-center gap-1 text-primary"
                  >
                    <Paperclip className="size-3.5" />
                    Xem chứng từ
                  </button>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )
              }
            />
          </CardFields>

          <CardActions>
            <LedgerRowActions row={r} {...actionProps} />
          </CardActions>
        </MobileCard>
      )}
      table={
        <div className="overflow-x-auto rounded-xl border border-border bg-white">
          <table data-slot="table" className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Mã</th>
                <th className="px-3 py-2">Loại phiếu</th>
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2">Kho</th>
                <th className="px-3 py-2">Chứng từ</th>
                <th className="px-3 py-2">Ngày</th>
                <th className="px-3 py-2">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td className="px-3 py-3" colSpan={7}>
                    <LogoSpinner label="Đang tải..." className="mx-auto" />
                  </td>
                </tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-muted-foreground" colSpan={7}>
                    Chưa có phiếu nào.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-border transition-colors hover:bg-muted/50"
                >
                  <td className="px-3 py-2 font-medium">{r.code}</td>
                  <td className="px-3 py-2">{r.type_label}</td>
                  <td className="px-3 py-2">
                    <LedgerStatusBadge row={r} />
                  </td>
                  <td className="px-3 py-2">{r.warehouse_label}</td>
                  <td className="px-3 py-2">
                    {r.has_attachments ? (
                      <button
                        type="button"
                        onClick={() => onViewStock(r.id)}
                        className="text-primary"
                        title="Xem chứng từ"
                      >
                        <Paperclip className="size-4" />
                      </button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{formatDateVi(r.created_at)}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <LedgerRowActions row={r} {...actionProps} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    />
  );
}
