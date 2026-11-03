import { useEffect, useState } from "react";
import { Clock, FileSpreadsheet, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { usePermission } from "@/hooks/usePermission";

import { Button } from "@/components/ui/button";
import { DateFilter, getDateRange } from "@/components/ui/date-filter";
import type { DateFilterValue } from "@/components/ui/date-filter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchJson } from "@/services/http";
import {
  downloadStockDocumentExcel,
  useStockDocument,
  useSubmitStockDocument,
  useApproveStockDocument,
  useRejectStockDocument,
  useCancelStockDocument,
} from "@/features/inventory/documents-queries";
import type { StockDocumentRow } from "@/features/inventory/documents-types";
import { CreateStockDocumentDialog } from "@/features/inventory/components/CreateStockDocumentDialog";
import { LedgerTable } from "@/features/inventory/components/LedgerTable";
import { Pager } from "@/features/inventory/components/flow-shared";
import { StockDocumentDetailDialog } from "@/features/inventory/components/StockDocumentDetailDialog";
import type { WarehouseListResponse } from "@/lib/api/warehouses";
import type { ImportLine } from "@/features/inventory/import-lines";
import { ImportExcelDialog } from "@/features/inventory/ImportExcelDialog";
import { useLedgerDocuments } from "@/features/inventory/ledger-queries";
import { useDebouncedValue } from "@/hooks/useDebounce";
import type { LedgerRow } from "@/features/inventory/ledger-types";
import { STOCK_STATUS_OPTIONS } from "@/features/inventory/ledger-types";
import { ScanReturnDialog } from "@/features/inventory/scan/ScanReturnDialog";
import { PendingScansDialog } from "@/features/inventory/scan/PendingScansDialog";
import { usePendingScans } from "@/features/inventory/pending-scans-queries";
import { useConfirm } from "@/hooks/use-confirm";

const PAGE_SIZE = 50;

function useWarehouses() {
  return useQuery({
    queryKey: ["warehouses", "list"],
    queryFn: () =>
      fetchJson("/api/warehouses?limit=200&offset=0") as Promise<WarehouseListResponse>,
    staleTime: 60_000,
  });
}

function defaultDateFilter(): DateFilterValue {
  const range = getDateRange("this_month");
  return { option: "this_month", from: range.from, to: range.to };
}

export default function StockDocumentsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [scanReturnOpen, setScanReturnOpen] = useState(false);
  const [pendingScansOpen, setPendingScansOpen] = useState(false);
  const [seedLines, setSeedLines] = useState<ImportLine[]>([]);
  const [editDoc, setEditDoc] = useState<StockDocumentRow | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>("");
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 300);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(defaultDateFilter);
  const [offset, setOffset] = useState(0);

  const perm = usePermission();
  const canApprove = perm("stock-documents:approve");
  const canViewShipments = perm("shipments:view");
  // Quét trả hàng ghi sổ nhập hoàn → thuộc section returns, không phải stock-documents.
  const canScanReturn = perm("returns:edit");

  const { data: pendingScansData } = usePendingScans({}, { enabled: canViewShipments });
  const pendingScansCount = pendingScansData?.total ?? 0;

  const filters: Record<string, string | string[]> = {
    limit: String(PAGE_SIZE),
    offset: String(offset),
    ...(debouncedSearch ? { q: debouncedSearch } : {}),
    ...(typeFilter ? { type: [typeFilter] } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(dateFilter.from ? { date_from: dateFilter.from } : {}),
    ...(dateFilter.to ? { date_to: dateFilter.to } : {}),
  };

  const { data, isLoading } = useLedgerDocuments(filters);
  const { data: warehousesData } = useWarehouses();
  const { data: editDocFull } = useStockDocument(editId);

  const qc = useQueryClient();

  const submitMutation = useSubmitStockDocument();
  const approveMutation = useApproveStockDocument();
  const rejectMutation = useRejectStockDocument();
  const cancelMutation = useCancelStockDocument();
  const confirm = useConfirm();

  const rows: LedgerRow[] = data?.items ?? [];
  const total = data?.total ?? 0;
  const warehouses = warehousesData?.items ?? [];
  const busy =
    submitMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending ||
    cancelMutation.isPending;

  // When editDocFull loads, open edit dialog
  useEffect(() => {
    if (editId != null && editDocFull) {
      setEditDoc(editDocFull);
      setCreateOpen(true);
    }
  }, [editId, editDocFull]);

  // Mutation nào cũng đã invalidate key của nó; đây chỉ dùng cho luồng ngoài React Query
  // (ScanReturnDialog). Không gọi refetch() kèm invalidate — sẽ bắn 2 request/thao tác.
  function refreshLedger() {
    void qc.invalidateQueries({ queryKey: ["inventory", "ledger"] });
  }

  function showErr(err: unknown) {
    toast.error(err instanceof Error ? err.message : "Thao tác thất bại.");
  }

  const handleSubmitDoc = (id: number) =>
    submitMutation.mutate(id, {
      onSuccess: () => {
        toast.success("Đã gửi duyệt phiếu.");
        refreshLedger();
      },
      onError: showErr,
    });

  const handleApprove = (id: number) =>
    approveMutation.mutate(id, {
      onSuccess: () => {
        toast.success("Đã duyệt & ghi sổ phiếu.");
        refreshLedger();
      },
      onError: showErr,
    });

  const handleReject = (id: number) => {
    const reason = window.prompt("Lý do từ chối:");
    if (reason === null) return;
    rejectMutation.mutate(
      { id, reason },
      {
        onSuccess: () => {
          toast.success("Đã từ chối phiếu.");
          refreshLedger();
        },
        onError: showErr,
      },
    );
  };

  async function handleExportDoc(row: LedgerRow) {
    try {
      await downloadStockDocumentExcel(row.id, row.code);
    } catch {
      toast.error("Xuất file phiếu thất bại.");
    }
  }

  async function handleCancelDoc(id: number) {
    if (
      !(await confirm({ title: "Huỷ phiếu kho này?", confirmText: "Huỷ phiếu", destructive: true }))
    )
      return;
    try {
      await cancelMutation.mutateAsync(id);
      toast.success("Huỷ phiếu thành công.");
      refreshLedger();
    } catch (err) {
      showErr(err);
    }
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Phiếu kho"
        actions={
          <>
            {/* Tìm theo mã phiếu / mã vận đơn / mã hoá đơn */}
            <div className="relative w-56">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setOffset(0);
                }}
                placeholder="Tìm mã phiếu / vận đơn…"
                className="h-8 pl-8 text-xs"
              />
            </div>

            <DateFilter
              value={dateFilter}
              onChange={(v) => {
                setDateFilter(v);
                setOffset(0);
              }}
              inline
            />

            {/* Loại phiếu filter */}
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v);
                setOffset(0);
              }}
            >
              <SelectTrigger className="h-8 w-44 text-xs" aria-label="Loại phiếu">
                <SelectValue placeholder="Tất cả loại" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tất cả loại</SelectItem>
                <SelectItem value="receipt">Nhập kho</SelectItem>
                <SelectItem value="issue">Xuất kho</SelectItem>
                <SelectItem value="adjustment">Điều chỉnh</SelectItem>
                <SelectItem value="transfer">Chuyển kho</SelectItem>
              </SelectContent>
            </Select>

            {/* Trạng thái filter */}
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setOffset(0);
              }}
            >
              <SelectTrigger className="h-8 w-40 text-xs" aria-label="Trạng thái">
                <SelectValue placeholder="Tất cả trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tất cả</SelectItem>
                {STOCK_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Chờ khớp đơn */}
            {canViewShipments && (
              <Button size="sm" variant="outline" onClick={() => setPendingScansOpen(true)}>
                <Clock className="mr-1 size-4" />
                {`Chờ khớp đơn (${pendingScansCount})`}
              </Button>
            )}

            {/* Import Excel */}
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
              <FileSpreadsheet className="mr-1 size-4" />
              Tải file Excel
            </Button>

            {/* Tạo ▼ dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="mr-1 size-4" />
                  Tạo
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setEditId(null);
                    setEditDoc(null);
                    setSeedLines([]);
                    setCreateOpen(true);
                  }}
                >
                  Phiếu kho
                </DropdownMenuItem>
                {canScanReturn && (
                  <DropdownMenuItem onClick={() => setScanReturnOpen(true)}>
                    Quét trả hàng (hàng loạt)
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      {/* Khung viền + vùng cuộn ngang nằm TRONG LedgerTable (chỉ ở nhánh bảng);
          bọc từ ngoài thì trên điện thoại danh sách thẻ bị lồng thêm một khung
          trắng thừa và vẫn giữ vùng cuộn ngang không còn tác dụng. */}
      <LedgerTable
        rows={rows}
        isLoading={isLoading}
        canApproveStock={canApprove}
        busy={busy}
        onViewStock={setDetailId}
        onExportStock={(row) => void handleExportDoc(row)}
        onEditStock={(id) => {
          setSeedLines([]);
          setEditDoc(null);
          setEditId(id);
        }}
        onSubmitStock={handleSubmitDoc}
        onApproveStock={handleApprove}
        onRejectStock={handleReject}
        onCancelStock={(id) => void handleCancelDoc(id)}
      />
      {total > PAGE_SIZE && (
        <Pager offset={offset} total={total} pageSize={PAGE_SIZE} onChange={setOffset} />
      )}

      <ImportExcelDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={(lines) => {
          setImportOpen(false);
          setEditId(null);
          setEditDoc(null);
          setSeedLines(lines);
          setCreateOpen(true);
        }}
      />

      <CreateStockDocumentDialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setEditDoc(null);
            setEditId(null);
          }
        }}
        warehouses={warehouses}
        initialLines={seedLines}
        editDocument={editDoc}
      />

      <ScanReturnDialog
        open={scanReturnOpen}
        onOpenChange={setScanReturnOpen}
        onDone={refreshLedger}
      />

      <PendingScansDialog open={pendingScansOpen} onOpenChange={setPendingScansOpen} />

      <StockDocumentDetailDialog
        documentId={detailId}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
      />
    </div>
  );
}
