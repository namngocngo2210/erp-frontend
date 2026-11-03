import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { DataTableShell } from "@/components/ui/data-table-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { QualityCallRow } from "@/lib/api/call-quality";

type Props = {
  rows: QualityCallRow[];
  passScore: number;
  onSelect: (scoreId: number) => void;
  toolbar?: React.ReactNode;
  /** Lần tải đầu — hiện hàng skeleton thay cho bảng rỗng. */
  loading?: boolean;
};

const BLOCK_ORDER = ["A", "B", "C", "D"] as const;
const BLOCK_SHORT: Record<string, string> = {
  A: "Mở đầu",
  B: "Khai thác",
  C: "Tư vấn",
  D: "Chốt",
};

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}p${String(seconds % 60).padStart(2, "0")}`;
}

export function CallQualityTable({ rows, passScore, onSelect, toolbar, loading }: Props) {
  return (
    <DataTableShell toolbar={toolbar} loading={loading}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">Ngày</TableHead>
            <TableHead className="w-36">Sale phụ trách</TableHead>
            <TableHead className="w-44">Khách hàng</TableHead>
            <TableHead className="w-36">SKU</TableHead>
            <TableHead className="w-20 text-right">Thời lượng</TableHead>
            <TableHead className="w-24 text-right">Tổng điểm</TableHead>
            {BLOCK_ORDER.map((code) => (
              <TableHead key={code} className="w-20 text-right">
                {BLOCK_SHORT[code]}
              </TableHead>
            ))}
            <TableHead className="w-32">Trạng thái đơn</TableHead>
            <TableHead>Nhận xét</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              className="cursor-pointer"
              onClick={() => onSelect(row.id)}
              title="Bấm để xem chi tiết điểm và trích dẫn"
            >
              <TableCell className="whitespace-nowrap">
                {row.call_date}
                {row.red_flags.length ? (
                  <AlertTriangle className="ml-1 inline h-3.5 w-3.5 text-action-danger" />
                ) : null}
              </TableCell>
              <TableCell className="max-w-[9rem] truncate" title={row.sale_name}>
                {row.sale_name || "—"}
              </TableCell>
              <TableCell className="max-w-[11rem]">
                <span className="block truncate" title={row.customer_name}>
                  {row.customer_name || "—"}
                </span>
                <span className="block text-xs tabular-nums text-muted-foreground">
                  {row.customer_phone || "—"}
                </span>
              </TableCell>
              <TableCell className="max-w-[9rem]">
                {row.skus.length ? (
                  <span className="block truncate text-xs" title={row.skus.join(", ")}>
                    {row.skus.join(", ")}
                  </span>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatDuration(row.duration_seconds)}
              </TableCell>
              <TableCell className="text-right">
                <Badge variant={row.total_score >= passScore ? "default" : "secondary"}>
                  <span className="tabular-nums">{row.total_score.toFixed(0)}</span>
                </Badge>
              </TableCell>
              {BLOCK_ORDER.map((code) => (
                <TableCell key={code} className="text-right text-xs tabular-nums">
                  {row.block_scores?.[code] != null ? row.block_scores[code].toFixed(0) : "—"}
                </TableCell>
              ))}
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                {row.sales_status_label || row.sales_status_code || "—"}
              </TableCell>
              <TableCell className="max-w-[420px] truncate text-xs text-muted-foreground">
                {row.summary}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTableShell>
  );
}
