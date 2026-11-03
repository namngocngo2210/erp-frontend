import type { ReactNode } from "react";
import { ChevronDown, ChevronRight, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatRate } from "@/features/inventory/stock-run-rate";

export type StockPivotRow = {
  key: string;
  warehouse: number;
  warehouse_name: string;
  product: number;
  product_sku: string;
  product_name: string;
  sellable: number;
  warranty: number;
  defect: number;
  total: number;
  rr3: number;
  rr7: number;
};

interface StockCardProps {
  row: StockPivotRow;
  onResolve?: (row: StockPivotRow) => void;
  onToggleHistory?: (row: StockPivotRow) => void;
  expanded?: boolean;
  children?: ReactNode;
}

function qtyClass(value: number, variant?: "warranty" | "defect"): string {
  if (value < 0) return "font-semibold text-destructive";
  if (value === 0) return "text-muted-foreground";
  if (variant === "warranty") return "font-medium text-action-warning";
  if (variant === "defect") return "font-medium text-action-danger";
  return "";
}

export function StockCard({ row, onResolve, onToggleHistory, expanded, children }: StockCardProps) {
  const canResolve = onResolve != null && (row.warranty > 0 || row.defect > 0);

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{row.product_sku}</p>
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {row.warehouse_name}
        </span>
      </div>

      <dl className="mt-2 grid grid-cols-4 gap-1 text-center text-xs">
        <div>
          <dt className="text-muted-foreground">Bán được</dt>
          <dd className={qtyClass(row.sellable)}>{row.sellable}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Bảo hành</dt>
          <dd className={qtyClass(row.warranty, "warranty")}>{row.warranty}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Lỗi</dt>
          <dd className={qtyClass(row.defect, "defect")}>{row.defect}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Tổng</dt>
          <dd className={qtyClass(row.total)}>{row.total}</dd>
        </div>
      </dl>

      <dl className="mt-1 grid grid-cols-2 gap-1 text-center text-xs">
        <div>
          <dt className="text-muted-foreground">RR3</dt>
          <dd className={row.rr3 > 0 ? "" : "text-muted-foreground"}>{formatRate(row.rr3)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">RR7</dt>
          <dd className={row.rr7 > 0 ? "" : "text-muted-foreground"}>{formatRate(row.rr7)}</dd>
        </div>
      </dl>

      <div className="mt-3 flex items-center justify-between gap-2">
        {onToggleHistory ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-primary"
            onClick={() => onToggleHistory(row)}
          >
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Lịch sử
          </button>
        ) : (
          <span />
        )}
        {onResolve && canResolve && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => onResolve(row)}
          >
            <Wrench className="mr-1 h-3 w-3" />
            Xử lý
          </Button>
        )}
      </div>
      {expanded && children}
    </div>
  );
}
