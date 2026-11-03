import { useState } from "react";
import { Link } from "react-router-dom";
import { RotateCcw, Send, Split } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { useConfirm } from "@/hooks/use-confirm";
import { useI18n } from "@/i18n";
import { retryPancakePosOrderLink, type PancakePosStatus } from "@/lib/api/pancakePos";
import { orderDetailPath } from "@/lib/routes";
import { OrderRoutingDialog } from "@/features/pancake-pos/components/OrderRoutingDialog";
import {
  ALL_FILTER,
  ATTENTION_FILTER,
  ORDER_LINK_STATUSES,
  ORDER_LINK_TONE,
  actionsFor,
  asOrderLinkStatus,
} from "@/features/pancake-pos/order-push-logic";
import { pancakePosKeys, usePancakePosOrderLinks } from "@/features/pancake-pos/queries";

const PAGE_SIZE = 50;

type Props = { status: PancakePosStatus | undefined; canEdit: boolean };

/**
 * Đẩy đơn CRM → Pancake (two-way-sync A2): danh sách liên kết đơn, mặc định lọc các
 * dòng cần người xử lý (cần chọn cách xuất / lỗi / trùng). Thử lại, "Vẫn đẩy" đơn bị
 * luật chống trùng chặn, dialog chọn một kho hoặc tách kiện.
 */
export function OrderPushCard({ status, canEdit }: Props) {
  const { t } = useI18n();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>(ATTENTION_FILTER);
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState<number | null>(null);
  const [routingOrder, setRoutingOrder] = useState<number | null>(null);
  const query = usePancakePosOrderLinks({
    status: filter === ALL_FILTER ? "" : filter,
    q,
    offset,
    limit: PAGE_SIZE,
  });
  const links = query.data?.items ?? [];
  const enabled = Boolean(status?.enabled && status?.push_orders_enabled);
  const counts = status?.order_link_counts ?? {};
  const attention =
    (counts.needs_routing ?? 0) + (counts.error ?? 0) + (counts.skipped_duplicate ?? 0);

  const retry = async (id: number, force: boolean) => {
    if (
      force &&
      !(await confirm({
        title: t("pancakePos.orders.forceTitle"),
        description: t("pancakePos.orders.forceDescription"),
        confirmText: t("pancakePos.orders.force"),
      }))
    ) {
      return;
    }
    setBusy(id);
    try {
      await retryPancakePosOrderLink(id, force);
      toast.success(t("pancakePos.orders.retried"));
      await queryClient.invalidateQueries({ queryKey: pancakePosKeys.all });
    } catch (error) {
      toast.error((error as Error)?.message || t("pancakePos.orders.retryFailed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4 text-sky-600" />
            {t("pancakePos.orders.title")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {enabled ? t("pancakePos.orders.enabled") : t("pancakePos.orders.disabled")}
            {" · "}
            {t("pancakePos.orders.attention").replace("{count}", String(attention))}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            value={filter}
            onValueChange={(value) => {
              setFilter(value);
              setOffset(0);
            }}
          >
            <SelectTrigger className="w-52" aria-label={t("pancakePos.orders.status")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ATTENTION_FILTER}>
                {t("pancakePos.orders.needsAttention")}
              </SelectItem>
              <SelectItem value={ALL_FILTER}>{t("pancakePos.orders.allStatuses")}</SelectItem>
              {ORDER_LINK_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`pancakePos.orderStatus.${s}`)} ({counts[s] ?? 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="w-56"
            placeholder={t("pancakePos.orders.search")}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOffset(0);
            }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("pancakePos.orders.order")}</TableHead>
                <TableHead>{t("pancakePos.orders.warehouse")}</TableHead>
                <TableHead>{t("pancakePos.orders.pancakeId")}</TableHead>
                <TableHead>{t("pancakePos.orders.status")}</TableHead>
                <TableHead>{t("pancakePos.orders.error")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {t("pancakePos.orders.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                links.map((link) => {
                  const linkStatus = asOrderLinkStatus(link.status);
                  const actions = actionsFor(link);
                  return (
                    <TableRow key={link.id}>
                      <TableCell>
                        <Link
                          to={orderDetailPath(link.order_id)}
                          className="font-medium text-sky-700 hover:underline"
                        >
                          #{link.order_id}
                        </Link>
                        {link.part_no > 1 && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            {t("pancakePos.orders.part").replace("{n}", String(link.part_no))}
                          </span>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {link.order_name || "—"} · {link.order_source || "—"}
                        </div>
                      </TableCell>
                      <TableCell>{link.warehouse_name || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {link.pancake_order_id ?? "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={ORDER_LINK_TONE[linkStatus]}>
                          {t(`pancakePos.orderStatus.${linkStatus}`)}
                        </StatusBadge>
                        {link.needs_lookup && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {t("pancakePos.orders.needsLookup")}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-md text-xs break-words">
                        {link.last_error || "—"}
                      </TableCell>
                      <TableCell>
                        {canEdit && enabled && (
                          <div className="flex flex-wrap justify-end gap-1">
                            {actions.route && (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => setRoutingOrder(link.order_id)}
                              >
                                <Split className="mr-1 h-4 w-4" />
                                {t("pancakePos.orders.route")}
                              </Button>
                            )}
                            {actions.retry && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={busy === link.id}
                                onClick={() => retry(link.id, false)}
                              >
                                <RotateCcw className="mr-1 h-4 w-4" />
                                {t("pancakePos.orders.retry")}
                              </Button>
                            )}
                            {actions.force && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={busy === link.id}
                                onClick={() => retry(link.id, true)}
                              >
                                <Send className="mr-1 h-4 w-4" />
                                {t("pancakePos.orders.force")}
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        <TablePagination
          total={query.data?.total ?? 0}
          pageSize={PAGE_SIZE}
          offset={offset}
          onOffsetChange={setOffset}
        />
      </CardContent>
      <OrderRoutingDialog orderId={routingOrder} onClose={() => setRoutingOrder(null)} />
    </Card>
  );
}
