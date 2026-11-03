import { Truck } from "lucide-react";

import { useFlowSummary, type FlowFilters } from "../issue-history-queries";
import { formatNumber } from "@/lib/format";

type Tile = { label: string; value: string };

/** Hàng tile số tổng của TAB ĐANG MỞ + chip phân loại ĐVVC (chỉ tab Xuất) —
 * cùng bộ lọc với bảng bên dưới nên số tile luôn khớp footer. */
export function FlowSummaryTiles({ filters, tab }: { filters: FlowFilters; tab: string }) {
  const { data } = useFlowSummary(filters);
  // Guard cả shape: BE cũ (rolling deploy) hoặc mock thiếu field thì ẩn tile
  // thay vì crash cả trang.
  if (!data?.issue || !data.return) return null;

  const fmt = (n: number) => formatNumber(n);
  const tiles: Tile[] =
    tab === "return"
      ? [
          { label: "Tổng SL nhập về", value: fmt(data.return.total_quantity) },
          { label: "Hoàn theo đơn", value: fmt(data.return.return_quantity) },
          { label: "Chuyển kho đến", value: fmt(data.return.transfer_quantity) },
          { label: "Nhóm đơn hoàn", value: fmt(data.return.return_count) },
        ]
      : [
          { label: "Tổng SL xuất", value: fmt(data.issue.total_quantity) },
          { label: "Xuất theo đơn", value: fmt(data.issue.sale_quantity) },
          { label: "Phiếu xuất kho", value: fmt(data.issue.doc_quantity) },
          { label: "Chuyển kho đi", value: fmt(data.issue.transfer_quantity) },
          { label: "Đơn đã xuất", value: fmt(data.issue.order_count) },
        ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-xl border border-border bg-card p-4">
            <div className="text-xl font-semibold tabular-nums text-foreground">{tile.value}</div>
            <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
              {tile.label}
            </div>
          </div>
        ))}
      </div>

      {tab !== "return" && data.carriers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Truck className="size-3.5" />
            Theo ĐVVC
          </span>
          {data.carriers.map((c) => (
            <span
              key={c.label}
              className="inline-flex items-baseline gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-sm"
            >
              <span className="font-medium">{c.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {fmt(c.order_count)} đơn · {fmt(c.quantity)} sp
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
