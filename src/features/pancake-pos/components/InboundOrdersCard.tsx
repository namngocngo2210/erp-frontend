import { useState } from "react";
import { Link } from "react-router-dom";
import { Link2, Unlink } from "lucide-react";
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
import { useI18n } from "@/i18n";
import { resolvePancakePosInboundOrder } from "@/lib/api/pancakePos";
import { orderDetailPath } from "@/lib/routes";
import {
  pancakePosKeys,
  usePancakePosInboundOrders,
  usePancakePosWebhookStatus,
} from "@/features/pancake-pos/queries";
import {
  INBOUND_ATTENTION_FILTER,
  INBOUND_MATCH_STATUSES,
  INBOUND_TONE,
  asInboundStatus,
  canResolve,
  parseOrderId,
} from "@/features/pancake-pos/webhook-logic";

const PAGE_SIZE = 50;
const ALL = "unmatched,waiting,matched,ignored";

type Props = { canEdit: boolean };

/**
 * "Chờ khớp đơn" (two-way-sync §6b, B1): đơn Pancake chưa khớp đơn CRM (khớp nhiều đơn,
 * đơn CRM đã đẩy mã khác, hoặc quá N giờ không khớp). Khớp tay theo mã đơn CRM / bỏ qua.
 */
export function InboundOrdersCard({ canEdit }: Props) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState(INBOUND_ATTENTION_FILTER);
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const query = usePancakePosInboundOrders({ match_status: filter, q, offset, limit: PAGE_SIZE });
  const counts = usePancakePosWebhookStatus().data?.inbound_counts ?? {};
  const rows = query.data?.items ?? [];

  const resolve = async (id: number, action: "match" | "ignore") => {
    let body: { action: "match"; order_id: number } | { action: "ignore" } = { action: "ignore" };
    if (action === "match") {
      const orderId = parseOrderId(drafts[id] ?? "");
      if (orderId === null) {
        toast.error(t("pancakePos.inbound.badOrderId"));
        return;
      }
      body = { action: "match", order_id: orderId };
    }
    setBusy(id);
    try {
      await resolvePancakePosInboundOrder(id, body);
      toast.success(t("pancakePos.inbound.resolved"));
      await queryClient.invalidateQueries({ queryKey: pancakePosKeys.all });
    } catch (error) {
      toast.error((error as Error)?.message || t("pancakePos.inbound.resolveFailed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4 text-sky-600" />
            {t("pancakePos.inbound.title")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {t("pancakePos.inbound.description")}{" "}
            {t("pancakePos.inbound.counts")
              .replace("{unmatched}", String(counts.unmatched ?? 0))
              .replace("{waiting}", String(counts.waiting ?? 0))}
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
            <SelectTrigger className="w-44" aria-label={t("pancakePos.inbound.filter")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={INBOUND_ATTENTION_FILTER}>
                {t("pancakePos.inbound.attention")}
              </SelectItem>
              <SelectItem value={ALL}>{t("pancakePos.inbound.all")}</SelectItem>
              {INBOUND_MATCH_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`pancakePos.inbound.matchStatus.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="w-56"
            placeholder={t("pancakePos.inbound.search")}
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
                <TableHead>{t("pancakePos.inbound.pancakeId")}</TableHead>
                <TableHead>{t("pancakePos.inbound.source")}</TableHead>
                <TableHead>{t("pancakePos.inbound.tracking")}</TableHead>
                <TableHead>{t("pancakePos.inbound.status")}</TableHead>
                <TableHead>{t("pancakePos.inbound.reason")}</TableHead>
                <TableHead>{t("pancakePos.inbound.crmOrder")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {t("pancakePos.inbound.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const status = asInboundStatus(row.match_status);
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs">{row.pancake_order_id}</TableCell>
                      <TableCell className="text-xs">
                        {row.source_name || "—"}
                        <div className="text-muted-foreground">{row.account_name || ""}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.tracking_code || "—"}
                        <div className="text-muted-foreground">{row.partner_name || ""}</div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={INBOUND_TONE[status]}>
                          {t(`pancakePos.inbound.matchStatus.${status}`)}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="max-w-sm text-xs break-words">
                        {row.reason || "—"}
                        {row.candidates.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            <span className="text-muted-foreground">
                              {t("pancakePos.inbound.candidates")}
                            </span>
                            {row.candidates.map((id) => (
                              <Link
                                key={id}
                                to={orderDetailPath(id)}
                                className="text-sky-700 hover:underline"
                              >
                                #{id}
                              </Link>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.order_id ? (
                          <Link
                            to={orderDetailPath(row.order_id)}
                            className="font-medium text-sky-700 hover:underline"
                          >
                            #{row.order_id}
                          </Link>
                        ) : canEdit && canResolve(row.match_status) ? (
                          <div className="flex flex-wrap items-center gap-1">
                            <Input
                              className="h-8 w-28"
                              inputMode="numeric"
                              placeholder={t("pancakePos.inbound.orderIdPlaceholder")}
                              value={drafts[row.id] ?? ""}
                              onChange={(e) =>
                                setDrafts((prev) => ({ ...prev, [row.id]: e.target.value }))
                              }
                            />
                            <Button
                              type="button"
                              size="sm"
                              disabled={busy === row.id}
                              onClick={() => resolve(row.id, "match")}
                            >
                              <Link2 className="mr-1 h-4 w-4" />
                              {t("pancakePos.inbound.match")}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={busy === row.id}
                              onClick={() => resolve(row.id, "ignore")}
                            >
                              <Unlink className="mr-1 h-4 w-4" />
                              {t("pancakePos.inbound.ignore")}
                            </Button>
                          </div>
                        ) : (
                          "—"
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
    </Card>
  );
}
