import { Loader2 } from "lucide-react";

import { TableCell } from "@/components/ui/table";
import { type AdsSpendMetricsBase, fmtInt } from "@/features/ads/useAdsPlatformReport";

/**
 * Ô "Chi phí" 3 trạng thái (loading / lỗi / số) dùng chung cho bảng account
 * của 2 trang chi tiêu FB/Google Ads. Markup giữ nguyên từ 2 page cũ.
 */
export function AdsSpendCell({ metrics }: { metrics?: AdsSpendMetricsBase }) {
  if (metrics?.loading) {
    return (
      <TableCell className="text-right text-xs text-muted-foreground">
        <Loader2 className="ml-auto h-4 w-4 animate-spin" />
      </TableCell>
    );
  }
  if (metrics?.error) {
    return (
      <TableCell className="text-right text-xs text-destructive" title={metrics.error}>
        Lỗi
      </TableCell>
    );
  }
  return <TableCell className="text-right">{fmtInt(metrics?.spend ?? 0)}</TableCell>;
}
