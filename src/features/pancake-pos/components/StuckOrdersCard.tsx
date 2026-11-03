import { useState } from "react";
import { Link } from "react-router-dom";
import { Hourglass } from "lucide-react";

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
import { Tabs } from "@/components/ui/tabs";
import { useI18n } from "@/i18n";
import type { PancakeStuckGroup } from "@/lib/api/pancakePos";
import { orderDetailPath } from "@/lib/routes";
import { ageTone, formatAge, warehouseTotals } from "@/features/pancake-pos/delivery-logic";
import { usePancakeStuckReport } from "@/features/pancake-pos/queries";

type GroupKey = "not_sent" | "not_delivered";

/**
 * "Đơn treo" (two-way-sync §5, MR D): đơn Pancake chưa gửi quá N giờ (Mới → Chờ chuyển
 * hàng) và đơn đã gửi quá M ngày chưa giao. Ngưỡng ở sysconfig; beat gửi Lark mỗi ngày.
 */
export function StuckOrdersCard() {
  const { t } = useI18n();
  const [active, setActive] = useState<GroupKey>("not_sent");
  const query = usePancakeStuckReport();
  const data = query.data;
  const hours = data?.not_sent_hours ?? 0;
  const days = data?.not_delivered_days ?? 0;

  const renderGroup = (group: PancakeStuckGroup | undefined, thresholdHours: number) => {
    const items = group?.items ?? [];
    const totals = warehouseTotals(group, t("pancakePos.delivery.unknownWarehouse"));
    return (
      <div className="space-y-2 pt-2">
        {totals.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 text-xs">
            <span className="text-muted-foreground">{t("pancakePos.stuck.byWarehouse")}</span>
            {totals.map((w) => (
              <StatusBadge key={w.name} tone="info">
                {w.name}: {w.count}
              </StatusBadge>
            ))}
          </div>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("pancakePos.stuck.pancakeId")}</TableHead>
                <TableHead>{t("pancakePos.stuck.crmOrder")}</TableHead>
                <TableHead>{t("pancakePos.stuck.status")}</TableHead>
                <TableHead>{t("pancakePos.stuck.warehouse")}</TableHead>
                <TableHead>{t("pancakePos.stuck.carrier")}</TableHead>
                <TableHead>{t("pancakePos.stuck.age")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {query.isError ? t("pancakePos.stuck.loadFailed") : t("pancakePos.stuck.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => (
                  <TableRow key={row.pancake_order_id}>
                    <TableCell className="font-mono text-xs">{row.pancake_order_id}</TableCell>
                    <TableCell>
                      {row.order_id ? (
                        <Link
                          to={orderDetailPath(row.order_id)}
                          className="font-medium text-sky-700 hover:underline"
                        >
                          {row.order_code || `#${row.order_id}`}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {row.status_name || "—"}
                      {row.dvvc_status && (
                        <div className="text-muted-foreground">{row.dvvc_status}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{row.warehouse_name || "—"}</TableCell>
                    <TableCell className="text-xs">
                      {row.partner_name || "—"}
                      {row.tracking_code && (
                        <div className="font-mono text-muted-foreground">{row.tracking_code}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={ageTone(row.age_hours, thresholdHours)}>
                        {formatAge(row.age_hours, {
                          hour: t("pancakePos.delivery.hour"),
                          day: t("pancakePos.delivery.day"),
                        })}
                      </StatusBadge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {group && group.count > items.length && (
          <p className="text-xs text-muted-foreground">
            {t("pancakePos.stuck.truncated")
              .replace("{shown}", String(items.length))
              .replace("{total}", String(group.count))}
          </p>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <Hourglass className="h-4 w-4 text-sky-600" />
          {t("pancakePos.stuck.title")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t("pancakePos.stuck.description")
            .replace("{hours}", String(hours))
            .replace("{days}", String(days))}
        </p>
      </CardHeader>
      <CardContent>
        <Tabs
          active={active}
          onChange={(key) => setActive(key as GroupKey)}
          tabs={[
            {
              key: "not_sent",
              label: t("pancakePos.stuck.notSent")
                .replace("{hours}", String(hours))
                .replace("{count}", String(data?.not_sent.count ?? 0)),
              content: renderGroup(data?.not_sent, hours),
            },
            {
              key: "not_delivered",
              label: t("pancakePos.stuck.notDelivered")
                .replace("{days}", String(days))
                .replace("{count}", String(data?.not_delivered.count ?? 0)),
              content: renderGroup(data?.not_delivered, days * 24),
            },
          ]}
        />
      </CardContent>
    </Card>
  );
}
