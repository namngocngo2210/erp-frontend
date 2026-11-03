import { Link } from "react-router-dom";
import { GitCompareArrows } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
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
import { usePancakeMismatchReport } from "@/features/pancake-pos/queries";

/**
 * "Lệch KiotViet ↔ Pancake" (two-way-sync §5, MR D): `Order.status` (KiotViet) mâu thuẫn
 * rõ với trạng thái Pancake. Chỉ báo cáo — không có thao tác sửa (KiotViet vẫn là nguồn).
 */
export function MismatchCard() {
  const { t } = useI18n();
  const query = usePancakeMismatchReport();
  const items = query.data?.items ?? [];

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <GitCompareArrows className="h-4 w-4 text-sky-600" />
          {t("pancakePos.mismatch.title")}
          {query.data && (
            <StatusBadge tone={query.data.count > 0 ? "danger" : "success"}>
              {query.data.count}
            </StatusBadge>
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t("pancakePos.mismatch.description").replace(
            "{days}",
            String(query.data?.window_days ?? "—"),
          )}
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("pancakePos.mismatch.crmOrder")}</TableHead>
                <TableHead>{t("pancakePos.mismatch.crmStatus")}</TableHead>
                <TableHead>{t("pancakePos.mismatch.pancakeStatus")}</TableHead>
                <TableHead>{t("pancakePos.mismatch.rule")}</TableHead>
                <TableHead>{t("pancakePos.mismatch.pancakeIds")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {query.isError
                      ? t("pancakePos.mismatch.loadFailed")
                      : t("pancakePos.mismatch.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => (
                  <TableRow key={`${row.order_id}:${row.rule}`}>
                    <TableCell>
                      <Link
                        to={orderDetailPath(row.order_id)}
                        className="font-medium text-sky-700 hover:underline"
                      >
                        {row.order_code || `#${row.order_id}`}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs">
                      {row.crm_status_label || String(row.crm_status)}
                      {row.delivery_business_status_code && (
                        <div className="text-muted-foreground">
                          {row.delivery_business_status_code}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {row.partner_delivery_status || "—"}
                      {row.partner_dvvc_delivery_status && (
                        <div className="text-muted-foreground">
                          {row.partner_dvvc_delivery_status}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone="danger">{row.rule_label || row.rule}</StatusBadge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.pancake_order_ids.join(", ") || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
