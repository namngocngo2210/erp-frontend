import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import {
  MOVEMENT_TYPE_LABELS,
  STATE_LABELS,
  type StockMovementRow,
} from "@/features/inventory/types";
import { formatDateTimeVi } from "@/lib/format";

interface Props {
  rows: StockMovementRow[];
  isLoading: boolean;
  colSpan: number;
}

function formatTime(iso: string): string {
  return formatDateTimeVi(iso);
}

function qtyText(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function ReferenceCell({ row }: { row: StockMovementRow }) {
  if (!row.reference_label) return <span className="text-muted-foreground">—</span>;
  if (row.reference_type === "order" && row.reference_id != null) {
    return (
      <Link className="text-primary hover:underline" to={`/sales/orders/${row.reference_id}`}>
        {row.reference_label}
      </Link>
    );
  }
  return <span>{row.reference_label}</span>;
}

export function StockMovementHistory({ rows, isLoading, colSpan }: Props) {
  if (isLoading) {
    return (
      <tr>
        <td colSpan={colSpan} className="bg-muted/30 px-6 py-3 text-sm">
          <LogoSpinner size={22} label="Đang tải..." className="mx-auto" />
        </td>
      </tr>
    );
  }
  if (rows.length === 0) {
    return (
      <tr>
        <td colSpan={colSpan} className="bg-muted/30 px-6 py-3 text-sm text-muted-foreground">
          Chưa có giao dịch.
        </td>
      </tr>
    );
  }
  return (
    <tr>
      <td colSpan={colSpan} className="bg-muted/30 px-6 py-3">
        <table data-slot="table" className="w-full text-xs">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="px-2 py-1">Thời gian</th>
              <th className="px-2 py-1">Mã hoá đơn</th>
              <th className="px-2 py-1">Loại giao dịch</th>
              <th className="px-2 py-1 text-right">Số lượng</th>
              <th className="px-2 py-1 text-right">Tồn cuối</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-t border-border/60 transition-colors hover:bg-muted/50"
              >
                <td className="px-2 py-1 whitespace-nowrap">{formatTime(row.created_at)}</td>
                <td className="px-2 py-1">
                  <ReferenceCell row={row} />
                </td>
                <td className="px-2 py-1">
                  <span>{MOVEMENT_TYPE_LABELS[row.movement_type] ?? row.movement_type}</span>
                  <Badge variant="outline" className="ml-2">
                    {STATE_LABELS[row.state]}
                  </Badge>
                </td>
                <td
                  className={`px-2 py-1 text-right font-medium ${
                    row.qty_delta > 0 ? "text-action-success" : "text-destructive"
                  }`}
                >
                  {qtyText(row.qty_delta)}
                </td>
                <td className="px-2 py-1 text-right">{row.balance_after}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </td>
    </tr>
  );
}
