import { useState } from "react";
import { Eye, FileSpreadsheet, Link2, Plus, Scissors } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { DateFilter } from "@/components/ui/date-filter";
import type { DateFilterValue } from "@/components/ui/date-filter";
import { Input } from "@/components/ui/input";
import { ResponsiveList } from "@/components/ui/responsive-list";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { TablePagination } from "@/components/ui/table-pagination";
import { useExportJobs } from "@/features/exports/ExportJobsProvider";
import { useProductSearch } from "@/features/products/queries";
import { useDebouncedValue } from "@/hooks/useDebounce";

import { useWarrantyCodeBatches } from "@/features/warranty-codes/queries";
import type { BatchStatus, WarrantyCodeBatch } from "@/features/warranty-codes/types";

import { AssignProductDialog } from "./AssignProductDialog";
import { GenerateBatchDialog } from "./GenerateBatchDialog";
import { SplitBatchDialog } from "./SplitBatchDialog";
import { formatDateTimeVi, formatNumber } from "@/lib/format";

const PAGE_SIZE = 50;

const STATUS_BADGE: Record<BatchStatus, { label: string; className: string }> = {
  reserved: { label: "Chưa gắn SP", className: "bg-action-warning/10 text-action-warning" },
  assigned: { label: "Đã gắn", className: "bg-action-success/10 text-action-success" },
};

/** Lô đang sinh mã nền: badge tiến độ thay cho badge trạng thái, khoá mọi thao tác. */
function statusBadge(batch: WarrantyCodeBatch): { label: string; className: string } {
  if (batch.is_generating) {
    return {
      label: `Đang sinh ${formatNumber(batch.generated_count)}/${formatNumber(batch.quantity)}`,
      className: "bg-action-info/10 text-action-info",
    };
  }
  return STATUS_BADGE[batch.status];
}

function fmtDate(v: string | null): string {
  return formatDateTimeVi(v, { onInvalid: "raw" });
}

type Props = {
  /** Task 9 nối: điều hướng sang tab IMEI đã lọc theo lô này khi bấm "Xem mã". */
  onViewCodes?: (batchId: number) => void;
};

/** Tab "Lô hàng" trang Mã bảo hành — danh sách lô mã + Tạo lô / Gán SP / Tách / Xuất Excel (chọn nhiều hoặc theo bộ lọc). */
export function BatchesTab({ onViewCodes }: Props) {
  const { startExport } = useExportJobs();
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 300);
  const [productId, setProductId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<BatchStatus | "">("");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    option: "custom",
    from: "",
    to: "",
  });
  const [offset, setOffset] = useState(0);
  // Lô đã tick để xuất Excel — giữ qua các trang, reset khi đổi bộ lọc (resetPage).
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [generateOpen, setGenerateOpen] = useState(false);
  const [assignBatch, setAssignBatch] = useState<WarrantyCodeBatch | null>(null);
  const [splitBatch, setSplitBatch] = useState<WarrantyCodeBatch | null>(null);

  const searchProducts = useProductSearch();
  const searchProductOptions = async (q: string) => {
    const list = await searchProducts(q);
    return list.map((p) => ({ value: String(p.id), label: p.sku }));
  };

  // Cùng một bộ lọc cho list và cho "xuất theo bộ lọc" — backend
  // (repository.filter_batches) cũng dùng chung, nên file xuất khớp đúng bảng.
  const filters = {
    ...(debouncedSearch ? { q: debouncedSearch } : {}),
    ...(productId ? { product_id: productId } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(dateFilter.from ? { date_from: dateFilter.from } : {}),
    ...(dateFilter.to ? { date_to: dateFilter.to } : {}),
  };
  const params = { ...filters, limit: PAGE_SIZE, offset };

  const { data, isLoading } = useWarrantyCodeBatches(params);
  const rows: WarrantyCodeBatch[] = data?.results ?? [];
  const total = data?.total ?? 0;

  const resetPage = () => {
    setOffset(0);
    setSelectedIds([]);
  };

  const selectedSet = new Set(selectedIds);
  // Lô đang sinh mã không chọn được (backend từ chối xuất khi thiếu mã).
  const selectableRows = rows.filter((b) => !b.is_generating);
  const pageSelectedCount = selectableRows.filter((b) => selectedSet.has(b.id)).length;
  const pageState: boolean | "indeterminate" =
    selectableRows.length > 0 && pageSelectedCount === selectableRows.length
      ? true
      : pageSelectedCount > 0
        ? "indeterminate"
        : false;

  const toggleRow = (id: number, checked: boolean) =>
    setSelectedIds((prev) =>
      checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id),
    );
  const togglePage = (checked: boolean) =>
    setSelectedIds((prev) => {
      const pageIds = selectableRows.map((b) => b.id);
      if (checked) return [...new Set([...prev, ...pageIds])];
      const drop = new Set(pageIds);
      return prev.filter((x) => !drop.has(x));
    });

  // Một job export duy nhất: có tick → đúng các lô đã tick; không tick → toàn bộ
  // lô khớp bộ lọc (mọi trang). Lỗi (thiếu quyền, lô đang sinh mã…) đã được
  // `startExport` tự toast từ `detail` của validate().
  function handleExport() {
    return startExport(
      "warranty_code_batch",
      selectedIds.length > 0 ? { batch_ids: [...selectedIds].sort((a, b) => a - b) } : { filters },
    );
  }

  const toolbar = (
    <div className="flex w-full flex-wrap items-center gap-2">
      <Input
        value={searchInput}
        onChange={(e) => {
          setSearchInput(e.target.value);
          resetPage();
        }}
        placeholder="Tìm mã phiếu..."
        className="h-9 w-full max-w-xs"
      />

      <SearchableSelect
        onSearch={searchProductOptions}
        value={productId != null ? String(productId) : ""}
        onChange={(v) => {
          setProductId(v ? Number(v) : null);
          resetPage();
        }}
        placeholder="Tất cả sản phẩm"
        className="h-9 w-56"
      />

      <Select
        value={statusFilter}
        onValueChange={(v) => {
          setStatusFilter(v as BatchStatus | "");
          resetPage();
        }}
      >
        <SelectTrigger className="h-9 w-40" aria-label="Trạng thái">
          <SelectValue placeholder="Tất cả trạng thái" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Tất cả</SelectItem>
          <SelectItem value="reserved">Chưa gắn SP</SelectItem>
          <SelectItem value="assigned">Đã gắn</SelectItem>
        </SelectContent>
      </Select>

      <DateFilter
        value={dateFilter}
        onChange={(v) => {
          setDateFilter(v);
          resetPage();
        }}
        inline
      />

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => void handleExport()}
          disabled={!isLoading && total === 0}
          title={
            selectedIds.length > 0
              ? `Xuất ${selectedIds.length} lô đã chọn`
              : "Xuất toàn bộ lô theo bộ lọc hiện tại"
          }
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          {selectedIds.length > 0 ? `Xuất Excel (${selectedIds.length})` : "Xuất Excel"}
        </Button>
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => setGenerateOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Tạo lô
        </Button>
      </div>
    </div>
  );

  function renderActions(batch: WarrantyCodeBatch) {
    // Đang sinh mã: backend từ chối gán/tách (400) — ẩn luôn nút, chỉ để Xem mã.
    const ready = !batch.is_generating;
    return (
      <div className="flex items-center justify-end gap-1">
        {ready && batch.status === "reserved" && (
          <>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setAssignBatch(batch)}
              title="Gán sản phẩm"
              aria-label="Gán sản phẩm"
            >
              <Link2 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setSplitBatch(batch)}
              title="Tách lô"
              aria-label="Tách lô"
            >
              <Scissors className="h-4 w-4" />
            </Button>
          </>
        )}
        {onViewCodes && (
          <Button
            size="icon"
            variant="outline"
            onClick={() => onViewCodes(batch.id)}
            title="Xem mã"
            aria-label="Xem mã"
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  const table = (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <Checkbox
              checked={pageState}
              onCheckedChange={togglePage}
              disabled={selectableRows.length === 0}
              aria-label="Chọn tất cả lô trong trang"
            />
          </TableHead>
          <TableHead>Mã phiếu</TableHead>
          <TableHead>Khoảng số</TableHead>
          <TableHead>Số lượng</TableHead>
          <TableHead>Trạng thái</TableHead>
          <TableHead>Sản phẩm</TableHead>
          <TableHead>Người tạo</TableHead>
          <TableHead>Người gán</TableHead>
          <TableHead>Ngày tạo</TableHead>
          <TableHead className="text-right">Thao tác</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
              Đang tải...
            </TableCell>
          </TableRow>
        ) : rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
              Chưa có lô mã nào.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((batch) => {
            const badge = statusBadge(batch);
            return (
              <TableRow
                key={batch.id}
                data-state={selectedSet.has(batch.id) ? "selected" : undefined}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedSet.has(batch.id)}
                    onCheckedChange={(checked) => toggleRow(batch.id, checked)}
                    disabled={batch.is_generating}
                    aria-label={`Chọn lô ${batch.batch_code}`}
                  />
                </TableCell>
                <TableCell className="font-medium">{batch.batch_code}</TableCell>
                <TableCell>
                  {batch.start_serial} – {batch.end_serial}
                </TableCell>
                <TableCell>{formatNumber(batch.quantity)}</TableCell>
                <TableCell>
                  <Badge className={badge.className}>{badge.label}</Badge>
                </TableCell>
                <TableCell>{batch.product_sku ?? "—"}</TableCell>
                <TableCell>{batch.created_by_name ?? "—"}</TableCell>
                <TableCell>{batch.assigned_by_name ?? "—"}</TableCell>
                <TableCell>{fmtDate(batch.created_at)}</TableCell>
                <TableCell className="text-right">{renderActions(batch)}</TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );

  return (
    <>
      <DataTableShell loading={isLoading && rows.length === 0} toolbar={toolbar}>
        <ResponsiveList
          items={rows}
          table={table}
          getKey={(it: WarrantyCodeBatch) => it.id}
          loading={isLoading}
          emptyText="Chưa có lô mã nào."
          renderCard={(batch: WarrantyCodeBatch) => {
            const badge = statusBadge(batch);
            return (
              <div className="w-full rounded-lg border border-border bg-card p-3 text-left text-sm shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    <Checkbox
                      checked={selectedSet.has(batch.id)}
                      onCheckedChange={(checked) => toggleRow(batch.id, checked)}
                      disabled={batch.is_generating}
                      aria-label={`Chọn lô ${batch.batch_code}`}
                    />
                    {batch.batch_code}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>
                <div className="mt-1 text-muted-foreground">
                  {batch.start_serial} – {batch.end_serial}
                </div>
                <div className="text-muted-foreground">
                  SL: {formatNumber(batch.quantity)} · SP: {batch.product_sku ?? "—"}
                </div>
                <div className="mt-2">{renderActions(batch)}</div>
              </div>
            );
          }}
        />
        {total > PAGE_SIZE && (
          <TablePagination
            className="border-t border-border px-3 py-2"
            total={total}
            pageSize={PAGE_SIZE}
            offset={offset}
            onOffsetChange={setOffset}
          />
        )}
      </DataTableShell>

      <GenerateBatchDialog open={generateOpen} onOpenChange={setGenerateOpen} />
      <AssignProductDialog
        batch={assignBatch}
        onOpenChange={(open) => {
          if (!open) setAssignBatch(null);
        }}
      />
      <SplitBatchDialog
        batch={splitBatch}
        onOpenChange={(open) => {
          if (!open) setSplitBatch(null);
        }}
      />
    </>
  );
}
