import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { DateFilter } from "@/components/ui/date-filter";
import type { DateFilterValue } from "@/components/ui/date-filter";
import { Input } from "@/components/ui/input";
import { ResponsiveList } from "@/components/ui/responsive-list";
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
import { useDebouncedValue } from "@/hooks/useDebounce";

import { useScanLogs } from "@/features/warranty-codes/queries";
import type { ScanLogChannel, ScanLogResult, ScanLogRow } from "@/features/warranty-codes/types";
import { formatDateTimeVi } from "@/lib/format";

const PAGE_SIZE = 50;

const RESULT_BADGE: Record<ScanLogResult, { label: string; className: string }> = {
  activated: {
    label: "Kích hoạt thành công",
    className: "bg-action-success/10 text-action-success",
  },
  already_activated: {
    label: "Mã đã được kích hoạt",
    className: "bg-action-warning/10 text-action-warning",
  },
  not_found: { label: "Không tìm thấy mã", className: "bg-action-danger/10 text-action-danger" },
  viewed: { label: "Xem lại", className: "bg-gray-100 text-gray-700" },
};

const CHANNEL_LABEL: Record<ScanLogChannel, string> = {
  web: "Website",
  zalo_oa: "Zalo OA",
};

function fmtDate(v: string | null): string {
  return formatDateTimeVi(v, { onInvalid: "raw" });
}

/** Tab "Nhật ký" trang Mã bảo hành — lịch sử tra cứu/kích hoạt mã bảo hành. */
export function ScanLogsTab() {
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 300);
  const [ipInput, setIpInput] = useState("");
  const debouncedIp = useDebouncedValue(ipInput.trim(), 300);
  const [resultFilter, setResultFilter] = useState<ScanLogResult | "">("");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    option: "custom",
    from: "",
    to: "",
  });
  const [offset, setOffset] = useState(0);

  const params = {
    ...(debouncedSearch ? { keyword: debouncedSearch } : {}),
    ...(debouncedIp ? { ip_address: debouncedIp } : {}),
    ...(resultFilter ? { result: resultFilter } : {}),
    ...(dateFilter.from ? { date_from: dateFilter.from } : {}),
    ...(dateFilter.to ? { date_to: dateFilter.to } : {}),
    limit: PAGE_SIZE,
    offset,
  };

  const { data, isLoading } = useScanLogs(params);
  const rows: ScanLogRow[] = data?.results ?? [];
  const total = data?.total ?? 0;

  const resetPage = () => setOffset(0);

  const toolbar = (
    <div className="flex w-full flex-wrap items-center gap-2">
      <Input
        value={searchInput}
        onChange={(e) => {
          setSearchInput(e.target.value);
          resetPage();
        }}
        placeholder="IMEI code / từ khóa..."
        className="h-9 w-full max-w-xs"
      />

      <Input
        value={ipInput}
        onChange={(e) => {
          setIpInput(e.target.value);
          resetPage();
        }}
        placeholder="Địa chỉ IP..."
        className="h-9 w-48"
      />

      <Select
        value={resultFilter}
        onValueChange={(v) => {
          setResultFilter(v as ScanLogResult | "");
          resetPage();
        }}
      >
        <SelectTrigger className="h-9 w-52" aria-label="Kết quả">
          <SelectValue placeholder="Tất cả kết quả" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Tất cả</SelectItem>
          <SelectItem value="activated">Kích hoạt thành công</SelectItem>
          <SelectItem value="already_activated">Mã đã được kích hoạt</SelectItem>
          <SelectItem value="not_found">Không tìm thấy mã</SelectItem>
          <SelectItem value="viewed">Xem lại</SelectItem>
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
    </div>
  );

  const table = (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>IMEI Code</TableHead>
          <TableHead>Từ khóa</TableHead>
          <TableHead>Mã SP</TableHead>
          <TableHead>Kết quả</TableHead>
          <TableHead>Kênh</TableHead>
          <TableHead>Địa chỉ IP</TableHead>
          <TableHead>User Agent</TableHead>
          <TableHead>Ngày quét</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
              Đang tải...
            </TableCell>
          </TableRow>
        ) : rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
              Chưa có lượt quét nào.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => {
            const badge = RESULT_BADGE[row.result];
            return (
              <TableRow key={row.id}>
                <TableCell className="font-mono">{row.code_value || "—"}</TableCell>
                <TableCell className="font-mono">{row.keyword}</TableCell>
                <TableCell>{row.product_sku || "—"}</TableCell>
                <TableCell>
                  <Badge className={badge.className}>{badge.label}</Badge>
                </TableCell>
                <TableCell>{CHANNEL_LABEL[row.channel]}</TableCell>
                <TableCell>{row.ip_address || "—"}</TableCell>
                <TableCell className="max-w-[220px] truncate" title={row.user_agent ?? undefined}>
                  {row.user_agent || "—"}
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
        getKey={(it: ScanLogRow) => it.id}
        loading={isLoading}
        emptyText="Chưa có lượt quét nào."
        renderCard={(row: ScanLogRow) => {
          const badge = RESULT_BADGE[row.result];
          return (
            <div className="w-full rounded-lg border border-border bg-card p-3 text-left text-sm shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-mono font-medium text-foreground">
                  {row.code_value || "—"}
                </span>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
                >
                  {badge.label}
                </span>
              </div>
              <div className="mt-1 font-mono text-muted-foreground">{row.keyword}</div>
              <div className="text-muted-foreground">
                SP: <span>{row.product_sku || "—"}</span> · IP: <span>{row.ip_address || "—"}</span>
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
