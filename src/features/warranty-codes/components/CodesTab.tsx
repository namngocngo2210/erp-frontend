import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { DateFilter } from "@/components/ui/date-filter";
import type { DateFilterValue } from "@/components/ui/date-filter";
import { Input } from "@/components/ui/input";
import { ResponsiveList } from "@/components/ui/responsive-list";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { TablePagination } from "@/components/ui/table-pagination";
import { useProductSearch } from "@/features/products/queries";
import { useDebouncedValue } from "@/hooks/useDebounce";

import { useWarrantyCodes } from "@/features/warranty-codes/queries";
import type { BatchStatus, WarrantyCodeRow } from "@/features/warranty-codes/types";
import { formatDateTimeVi } from "@/lib/format";

const PAGE_SIZE = 50;

const STATUS_BADGE: Record<BatchStatus, { label: string; className: string }> = {
  reserved: { label: "Chưa gắn SP", className: "bg-action-warning/10 text-action-warning" },
  assigned: { label: "Đã gắn", className: "bg-action-success/10 text-action-success" },
};

function fmtDate(v: string | null): string {
  return formatDateTimeVi(v, { onInvalid: "raw" });
}

type Props = {
  /** Task 8 nối: khi vào tab từ "Xem mã" của một lô, lọc sẵn theo lô đó. */
  initialBatchId?: number | null;
};

/** Tab "IMEI" trang Mã bảo hành — danh sách từng mã (serial) đã sinh. */
export function CodesTab({ initialBatchId = null }: Props) {
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 300);
  const [productId, setProductId] = useState<number | null>(null);
  const [batchId, setBatchId] = useState<number | null>(initialBatchId);
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    option: "custom",
    from: "",
    to: "",
  });
  const [offset, setOffset] = useState(0);

  // initialBatchId có thể đổi mỗi lần bấm "Xem mã" ở tab Lô hàng (Task 8) —
  // đồng bộ lại filter + về trang 1 khi giá trị này thay đổi.
  useEffect(() => {
    setBatchId(initialBatchId);
    setOffset(0);
  }, [initialBatchId]);

  const searchProducts = useProductSearch();
  const searchProductOptions = async (q: string) => {
    const list = await searchProducts(q);
    return list.map((p) => ({ value: String(p.id), label: p.sku }));
  };

  const params = {
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(productId ? { product_id: productId } : {}),
    ...(batchId ? { batch_id: batchId } : {}),
    ...(dateFilter.from ? { date_from: dateFilter.from } : {}),
    ...(dateFilter.to ? { date_to: dateFilter.to } : {}),
    limit: PAGE_SIZE,
    offset,
  };

  const { data, isLoading } = useWarrantyCodes(params);
  const rows: WarrantyCodeRow[] = data?.results ?? [];
  const total = data?.total ?? 0;

  const resetPage = () => setOffset(0);

  const clearBatchFilter = () => {
    setBatchId(null);
    resetPage();
  };

  const toolbar = (
    <div className="flex w-full flex-wrap items-center gap-2">
      <Input
        value={searchInput}
        onChange={(e) => {
          setSearchInput(e.target.value);
          resetPage();
        }}
        placeholder="Tìm serial / mã..."
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

      <DateFilter
        value={dateFilter}
        onChange={(v) => {
          setDateFilter(v);
          resetPage();
        }}
        inline
      />

      {batchId != null && (
        <Badge
          className="cursor-pointer gap-1 bg-primary/10 text-primary hover:bg-primary/20"
          onClick={clearBatchFilter}
        >
          Lô #{batchId} ×
        </Badge>
      )}
    </div>
  );

  const table = (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Serial</TableHead>
          <TableHead>Mã</TableHead>
          <TableHead>Lô</TableHead>
          <TableHead>Sản phẩm</TableHead>
          <TableHead>Trạng thái</TableHead>
          <TableHead>Ngày tạo</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
              Đang tải...
            </TableCell>
          </TableRow>
        ) : rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
              Chưa có mã nào.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => {
            const badge = STATUS_BADGE[row.status];
            return (
              <TableRow key={row.id}>
                <TableCell className="font-mono">{row.serial}</TableCell>
                <TableCell className="font-mono">{row.code}</TableCell>
                <TableCell>{row.batch_code}</TableCell>
                <TableCell>{row.product_sku ?? "—"}</TableCell>
                <TableCell>
                  <Badge className={badge.className}>{badge.label}</Badge>
                </TableCell>
                <TableCell>{fmtDate(row.created_at)}</TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );

  return (
    <DataTableShell loading={isLoading && rows.length === 0} toolbar={toolbar}>
      <ResponsiveList
        items={rows}
        table={table}
        getKey={(it: WarrantyCodeRow) => it.id}
        loading={isLoading}
        emptyText="Chưa có mã nào."
        renderCard={(row: WarrantyCodeRow) => {
          const badge = STATUS_BADGE[row.status];
          return (
            <div className="w-full rounded-lg border border-border bg-card p-3 text-left text-sm shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-mono font-medium text-foreground">{row.serial}</span>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
                >
                  {badge.label}
                </span>
              </div>
              <div className="mt-1 font-mono text-muted-foreground">{row.code}</div>
              <div className="text-muted-foreground">
                Lô: <span>{row.batch_code}</span> · SP: <span>{row.product_sku ?? "—"}</span>
              </div>
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
  );
}
