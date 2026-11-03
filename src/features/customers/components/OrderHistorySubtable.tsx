import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/i18n";
import { orderDetailPath } from "@/lib/routes";
import type { OrderRow } from "@/features/orders/order-types";
import { formatDateTimeVi } from "@/lib/format";

/** Bảng con lịch sử đơn — tái dùng cách render CRM của modal cũ. */
export function OrderHistorySubtable({ orders }: { orders: OrderRow[] }) {
  const { t } = useI18n();
  if (orders.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        {t("customers.profile.noOrders", "Chưa có đơn hàng nào.")}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("customers.profile.shippingCode", "Mã vận đơn")}</TableHead>
            <TableHead>{t("common.createdAt", "Tạo lúc")}</TableHead>
            <TableHead>{t("customers.profile.deliveryStatus", "Trạng thái giao")}</TableHead>
            <TableHead>{t("customers.profile.salesStatus", "Sale")}</TableHead>
            <TableHead>{t("customers.profile.classification", "Phân loại")}</TableHead>
            <TableHead>{t("customers.profile.notClosedReason", "Lý do không chốt")}</TableHead>
            <TableHead>{t("customers.profile.bombReason", "Lý do bom")}</TableHead>
            <TableHead>{t("customers.profile.potential", "Tiềm năng")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>
                {order.shipping_code ? (
                  <a
                    href={orderDetailPath(order.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {order.shipping_code}
                  </a>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>{order.created_at ? formatDateTimeVi(order.created_at) : "-"}</TableCell>
              <TableCell>{order.status != null ? t(`status.${order.status}`, "-") : "-"}</TableCell>
              <TableCell>
                {order.crm?.sales_status_label || order.crm?.sales_status_code || "-"}
              </TableCell>
              <TableCell>
                {order.crm?.customer_classification_label ||
                  order.crm?.customer_classification_code ||
                  "-"}
              </TableCell>
              <TableCell>
                {order.crm?.not_closed_reason_label || order.crm?.not_closed_reason_code || "-"}
              </TableCell>
              <TableCell>{order.crm?.bomb_reason_text || "-"}</TableCell>
              <TableCell>
                {order.crm?.potential_level_label || order.crm?.potential_level || "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
