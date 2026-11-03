import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/i18n";
import { formatCurrency } from "@/lib/format";
import { formatDateTime } from "@/lib/utils";
import type { TimelineOrder } from "@/lib/api/customer-profile";

/** Dòng thời gian mua hàng — MỌI đơn, kể cả đơn huỷ và đơn hoàn.
 *
 * Đơn không thành công hiện mờ đi kèm nhãn trạng thái thay vì bị lọc bỏ: một
 * khách huỷ năm đơn liên tiếp mà nhìn giống khách chưa từng đặt gì là kiểu nói
 * dối nguy hiểm nhất mà màn hình này có thể mắc.
 */
export function ProfileTimeline({
  orders,
  truncated,
}: {
  orders: TimelineOrder[];
  truncated: boolean;
}) {
  const { t } = useI18n();

  if (orders.length === 0) {
    return (
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Dòng thời gian mua hàng</h3>
        <p className="text-sm text-muted-foreground">Khách chưa có đơn nào.</p>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-2">
        <h3 className="text-sm font-semibold">Dòng thời gian mua hàng</h3>
        <span className="text-xs text-muted-foreground">{orders.length} đơn</span>
      </div>

      {truncated && (
        <p className="text-xs text-action-warning">
          Chỉ hiện {orders.length} đơn gần nhất — khách này có nhiều đơn hơn số đang hiển thị.
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ngày</TableHead>
              <TableHead>Mã đơn</TableHead>
              <TableHead>Sản phẩm chính</TableHead>
              <TableHead>Kênh</TableHead>
              <TableHead className="text-right">Giá trị</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.order_id} className={order.is_gtc ? undefined : "opacity-60"}>
                <TableCell className="whitespace-nowrap">
                  {formatDateTime(order.created_at)}
                </TableCell>
                <TableCell className="whitespace-nowrap">{order.order_code || "—"}</TableCell>
                <TableCell>{order.primary_sku || "—"}</TableCell>
                <TableCell>{order.channel_name || "—"}</TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums">
                  {formatCurrency(order.total_after_discount, { style: "suffix" })}
                </TableCell>
                <TableCell>
                  <Badge variant={order.is_gtc ? "success" : "outline"}>
                    {t(`status.${order.status}`)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
