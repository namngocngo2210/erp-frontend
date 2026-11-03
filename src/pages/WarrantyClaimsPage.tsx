import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DataTableShell } from "@/components/ui/data-table-shell";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ResponsiveList } from "@/components/ui/responsive-list";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { WarrantyClaimFormDialog } from "@/features/warranty-claims/components/WarrantyClaimFormDialog";
import { WarrantyColumnPicker } from "@/features/warranty-claims/components/WarrantyColumnPicker";
import { WarrantyClaimsTable } from "@/features/warranty-claims/components/WarrantyClaimsTable";
import { useWarrantyColumns } from "@/features/warranty-claims/useWarrantyColumns";
import { STATUS_BADGE_CLASS } from "@/features/warranty-claims/warranty-claim-columns";
import {
  useBulkDeleteWarrantyClaims,
  useCreateWarrantyClaim,
  useUpdateWarrantyClaim,
  useWarrantyClaims,
} from "@/features/warranty-claims/queries";
import {
  WARRANTY_STATUS_OPTIONS,
  type WarrantyClaim,
  type WarrantyClaimPayload,
  type WarrantyClaimStatus,
} from "@/features/warranty-claims/warranty-claim-types";
import { useExportJobs } from "@/features/exports/ExportJobsProvider";

const PAGE_SIZE = 50;

export default function WarrantyClaimsPage() {
  const navigate = useNavigate();
  const { startExport } = useExportJobs();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<WarrantyClaimStatus | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  const cols = useWarrantyColumns();

  const params = useMemo(
    () => ({ q: q.trim() || undefined, status, limit: PAGE_SIZE, offset: 0 }),
    [q, status],
  );
  const { data, isLoading } = useWarrantyClaims(params);
  const items = data?.results ?? [];

  const createMutation = useCreateWarrantyClaim();
  const updateMutation = useUpdateWarrantyClaim();
  const bulkDeleteMutation = useBulkDeleteWarrantyClaims();

  const openDetail = (id: number) => navigate(`/aftersales/warranty/${id}`);

  const handleSetQ = (value: string) => {
    setQ(value);
    setSelectedIds(new Set());
  };

  const handleSetStatus = (value: WarrantyClaimStatus | null) => {
    setStatus(value);
    setSelectedIds(new Set());
  };

  const toggleRow = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds((prev) => {
      const allSelected = items.length > 0 && items.every((it) => prev.has(it.id));
      if (allSelected) return new Set();
      return new Set(items.map((it) => it.id));
    });
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    bulkDeleteMutation.mutate(ids, {
      onSuccess: (res) => {
        toast.success(`Đã xóa ${res.deleted} phiếu bảo hành.`);
        setSelectedIds(new Set());
        setShowDeleteDialog(false);
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Xóa thất bại."),
    });
  };

  // Task 17: chạy nền qua job export thay vì tải blob đồng bộ — lỗi tạo job đã được
  // `startExport` tự toast, không cần bắt lại ở đây. `ids` khớp key `validate()` của
  // WarrantyClaimsExport (apps/warranty/exports_definitions.py): có chọn dòng → xuất
  // đúng các phiếu đó; không chọn → xuất theo bộ lọc q/status hiện tại của trang.
  const handleExport = async () => {
    setIsExporting(true);
    try {
      await startExport(
        "warranty_claims",
        selectedIds.size > 0 ? { ids: Array.from(selectedIds) } : { q: params.q, status },
      );
    } finally {
      setIsExporting(false);
    }
  };

  // Trả Promise<boolean> (true = lưu OK) để bảng rollback input uncontrolled
  // (ngày kích hoạt) khi PATCH lỗi; lỗi đã toast tại đây, không reject.
  const handlePatch = (id: number, patch: Partial<WarrantyClaimPayload>) =>
    updateMutation.mutateAsync({ id, payload: patch }).then(
      () => true,
      (err: unknown) => {
        toast.error(err instanceof Error ? err.message : "Lưu thất bại.");
        return false;
      },
    );

  const handleCreate = (payload: WarrantyClaimPayload) => {
    createMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("Đã tạo phiếu bảo hành.");
        setDialogOpen(false);
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Thao tác thất bại."),
    });
  };

  const toolbar = (
    <div className="flex w-full flex-wrap items-center gap-2">
      <Input
        value={q}
        onChange={(e) => handleSetQ(e.target.value)}
        placeholder="Tìm theo SĐT / mã vận đơn / tên..."
        className="h-9 w-full max-w-xs"
      />
      <Select
        value={status == null ? "all" : String(status)}
        onValueChange={(v) =>
          handleSetStatus(v === "all" ? null : (Number(v) as WarrantyClaimStatus))
        }
      >
        <SelectTrigger className="h-9 w-auto">
          <SelectValue placeholder="Tất cả trạng thái" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả trạng thái</SelectItem>
          {WARRANTY_STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={String(o.value)}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        <Button
          variant="destructive"
          size="sm"
          className="inline-flex h-9 items-center gap-1.5 px-2.5 text-xs"
          disabled={selectedIds.size === 0}
          onClick={() => setShowDeleteDialog(true)}
          aria-label="Xóa đã chọn"
          title="Xóa đã chọn"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Xóa đã chọn ({selectedIds.size})</span>
        </Button>
        <Button variant="outline" className="h-9" disabled={isExporting} onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? "Đang xuất..." : "Xuất Excel"}
        </Button>
        <WarrantyColumnPicker {...cols} />
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Thêm bảo hành
        </Button>
      </div>
    </div>
  );

  const table = (
    <WarrantyClaimsTable
      rows={items}
      orderedColumns={cols.orderedColumns}
      lockedColumns={cols.lockedColumns}
      isLoading={isLoading}
      onOpenDetail={openDetail}
      onPatch={handlePatch}
      selectedIds={selectedIds}
      onToggleRow={toggleRow}
      onToggleAll={toggleAll}
    />
  );

  return (
    <>
      <DataTableShell loading={isLoading && items.length === 0} toolbar={toolbar}>
        <ResponsiveList
          items={items}
          table={table}
          getKey={(it: WarrantyClaim) => it.id}
          emptyText="Chưa có phiếu bảo hành nào."
          renderCard={(row: WarrantyClaim) => (
            <button
              type="button"
              className="w-full rounded-lg border border-border bg-card p-3 text-left text-sm shadow-sm"
              onClick={() => openDetail(row.id)}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">{row.order.name}</span>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[row.status]}`}
                >
                  {row.status_label}
                </span>
              </div>
              <div className="mt-1 text-muted-foreground">{row.order.phone}</div>
              <div className="text-muted-foreground">VĐ: {row.order.shipping_code || "—"}</div>
            </button>
          )}
        />
      </DataTableShell>

      <WarrantyClaimFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        isPending={createMutation.isPending}
        onSubmit={handleCreate}
      />

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa phiếu bảo hành</DialogTitle>
            <DialogDescription>
              Xóa {selectedIds.size} phiếu bảo hành đã chọn? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              disabled={bulkDeleteMutation.isPending}
              onClick={handleBulkDelete}
            >
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
