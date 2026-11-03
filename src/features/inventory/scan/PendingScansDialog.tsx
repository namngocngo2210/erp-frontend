import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormDialogShell } from "@/components/ui/form-dialog-content";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import type { PendingScanRow } from "@/lib/api/pending-scans";
import {
  usePendingScans,
  useRetryPendingScan,
  useDeletePendingScan,
} from "@/features/inventory/pending-scans-queries";
import { formatDateTimeVi } from "@/lib/format";
import { useConfirm } from "@/hooks/use-confirm";
import { StatusBadge } from "@/components/ui/status-badge";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
};

function kindLabel(kind: PendingScanRow["kind"]) {
  return kind === "dispatch" ? "Xuất giao" : "Nhập hoàn";
}

function ScanStatusBadge({ row }: { row: PendingScanRow }) {
  // Đơn về ở trạng thái HỦY → cron KHÔNG tự xuất kho; giữ mã lại cho người xử lý.
  if (row.status === "cancelled") {
    return (
      <div className="space-y-1">
        <StatusBadge tone="warning">Đơn đã hủy — không xuất kho</StatusBadge>
        {row.error ? (
          <p className="max-w-56 truncate text-xs text-muted-foreground" title={row.error}>
            {row.error}
          </p>
        ) : null}
      </div>
    );
  }
  if (row.status === "invalid") {
    return <StatusBadge tone="danger">Mã không đúng</StatusBadge>;
  }
  if (row.status === "failed") {
    return (
      <div className="space-y-1">
        <StatusBadge tone="danger">Lỗi</StatusBadge>
        <p
          className="max-w-56 truncate text-xs text-muted-foreground"
          title={row.error || undefined}
        >
          {row.error || "—"}
        </p>
      </div>
    );
  }
  // Đang chờ cron thử lại (chưa phải lỗi) — info, tách khỏi cam "đơn đã hủy".
  return <StatusBadge tone="info">{`Chờ khớp (${row.attempts ?? 0} lần thử)`}</StatusBadge>;
}

export function PendingScansDialog({ open, onOpenChange }: Props) {
  const { data, isLoading } = usePendingScans({}, { enabled: open });
  const retryMutation = useRetryPendingScan();
  const deleteMutation = useDeletePendingScan();
  const confirm = useConfirm();

  const items = data?.items ?? [];

  function handleRetry(row: PendingScanRow) {
    retryMutation.mutate(row.id, {
      onSuccess: () => toast.success(`Đã thử lại mã ${row.code}.`),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Thử lại thất bại."),
    });
  }

  async function handleDelete(row: PendingScanRow) {
    if (!(await confirm({ title: `Xoá mã ${row.code} khỏi danh sách chờ?`, destructive: true })))
      return;
    deleteMutation.mutate(row.id, {
      onSuccess: () => toast.success(`Đã xoá mã ${row.code}.`),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Xoá thất bại."),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogShell
        title="Chờ khớp đơn"
        footer={
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        }
      >
        <div className="overflow-x-auto rounded-lg border border-border">
          <table data-slot="table" className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Mã vận đơn</th>
                <th className="px-3 py-2">Loại</th>
                <th className="px-3 py-2">Kho</th>
                <th className="px-3 py-2">Người quét</th>
                <th className="px-3 py-2">Thời gian quét</th>
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td className="px-3 py-6 text-center" colSpan={7}>
                    <LogoSpinner size={28} />
                  </td>
                </tr>
              )}
              {!isLoading && items.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-muted-foreground" colSpan={7}>
                    Không có mã nào chờ khớp.
                  </td>
                </tr>
              )}
              {!isLoading &&
                items.map((row) => (
                  <tr
                    key={row.id}
                    className={`border-t border-border hover:bg-muted/50 ${
                      row.status === "invalid"
                        ? "bg-action-danger/10 text-action-danger"
                        : row.status === "cancelled"
                          ? "bg-action-warning/10"
                          : ""
                    }`}
                  >
                    <td className="px-3 py-2 font-medium">{row.code}</td>
                    <td className="px-3 py-2">{kindLabel(row.kind)}</td>
                    <td className="px-3 py-2">{row.warehouse_name}</td>
                    <td className="px-3 py-2">{row.scanned_by_name}</td>
                    <td className="px-3 py-2">{formatDateTimeVi(row.created_at)}</td>
                    <td className="px-3 py-2">
                      <ScanStatusBadge row={row} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        {row.status === "failed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2"
                            disabled={retryMutation.isPending && retryMutation.variables === row.id}
                            onClick={() => handleRetry(row)}
                          >
                            Thử lại
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          disabled={deleteMutation.isPending && deleteMutation.variables === row.id}
                          onClick={() => handleDelete(row)}
                          aria-label={`Xoá ${row.code}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </FormDialogShell>
    </Dialog>
  );
}
