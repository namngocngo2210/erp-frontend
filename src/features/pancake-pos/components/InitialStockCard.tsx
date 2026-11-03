import { useState } from "react";
import { Boxes, Eye, FlaskConical, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from "@/hooks/use-confirm";
import { useI18n } from "@/i18n";
import { startInitialStock, type PancakePosStatus } from "@/lib/api/pancakePos";
import { formatDateTime } from "@/lib/utils";
import { InitialStockReportDialog } from "@/features/pancake-pos/components/InitialStockReportDialog";
import {
  applyBlockReason,
  dryRunBlockReason,
  minutesLeft,
} from "@/features/pancake-pos/initial-stock-logic";
import {
  INITIAL_STOCK_RUN_MODES,
  pancakePosKeys,
  useInitialStockStatus,
  usePancakePosRuns,
  useWarehouseLinks,
} from "@/features/pancake-pos/queries";
import { MAX_SKUS, parseSkuList, runState } from "@/features/pancake-pos/sync-logic";

const RECENT_RUNS = 5;
const STATE_TONE = {
  running: "info",
  failed: "danger",
  warning: "warning",
  done: "success",
} as const;

type Props = { status: PancakePosStatus | undefined; canEdit: boolean };

/**
 * Đẩy tồn đầu kỳ Hàng hoá CRM → Pancake (two-way-sync §7 A1): chạy thử (so sánh CRM vs
 * Pancake) → xem bảng lệch → ghi thật theo ĐÚNG lượt chạy thử gần nhất (≤ 30 phút).
 */
export function InitialStockCard({ status, canEdit }: Props) {
  const { t } = useI18n();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [polling, setPolling] = useState(false);
  const stockQuery = useInitialStockStatus(polling);
  const runsQuery = usePancakePosRuns(0, RECENT_RUNS, polling, INITIAL_STOCK_RUN_MODES);
  const linksQuery = useWarehouseLinks();
  const [selected, setSelected] = useState<number[]>([]);
  const [skuText, setSkuText] = useState("");
  const [busy, setBusy] = useState(false);
  const [openRun, setOpenRun] = useState<number | null>(null);

  const stock = stockQuery.data;
  const running =
    Boolean(stock?.active_run_id) || (runsQuery.data?.items ?? []).some((r) => !r.finished_at);
  if (running !== polling) setPolling(running);

  const linked = (linksQuery.data ?? []).filter((row) => row.pancake_warehouse_id);
  const dry = stock?.latest_dry_run ?? null;
  const dryBlock = dryRunBlockReason(status, stock);
  const applyBlock = applyBlockReason(status, stock);

  const refresh = () => queryClient.invalidateQueries({ queryKey: pancakePosKeys.all });

  const runDry = async () => {
    const skus = parseSkuList(skuText);
    if (skus.length > MAX_SKUS) {
      toast.error(t("pancakePos.sync.tooManySkus").replace("{max}", String(MAX_SKUS)));
      return;
    }
    setBusy(true);
    try {
      const { run_id } = await startInitialStock({
        mode: "dry_run",
        warehouse_ids: selected.length ? selected : undefined,
        skus: skus.length ? skus : undefined,
      });
      toast.success(t("pancakePos.sync.queued").replace("{id}", String(run_id)));
    } catch (error) {
      toast.error((error as Error)?.message || t("pancakePos.sync.failed"));
    } finally {
      setBusy(false);
      await refresh();
    }
  };

  const apply = async () => {
    if (!dry) return;
    const ok = await confirm({
      title: t("pancakePos.stock.confirmTitle"),
      description: t("pancakePos.stock.confirmDescription")
        .replace("{id}", String(dry.id))
        .replace("{count}", String(dry.updated ?? 0)),
      confirmText: t("pancakePos.stock.apply"),
    });
    if (!ok) return;
    setBusy(true);
    try {
      const { run_id } = await startInitialStock({ mode: "apply", dry_run_id: dry.id });
      toast.success(t("pancakePos.sync.queued").replace("{id}", String(run_id)));
    } catch (error) {
      toast.error((error as Error)?.message || t("pancakePos.sync.failed"));
    } finally {
      setBusy(false);
      await refresh();
    }
  };

  const toggle = (id: number, checked: boolean) =>
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Boxes className="h-4 w-4 text-sky-600" />
          {t("pancakePos.stock.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-xs text-muted-foreground">{t("pancakePos.stock.hint")}</p>
        <div className="grid gap-3 md:grid-cols-[16rem_1fr]">
          <fieldset className="grid gap-1">
            <legend className="text-xs text-muted-foreground">
              {t("pancakePos.stock.warehouses")}
            </legend>
            {linked.length === 0 ? (
              <span className="text-xs text-muted-foreground">
                {t("pancakePos.stock.block.noWarehouses")}
              </span>
            ) : (
              linked.map((row) => (
                <label key={row.warehouse_id} className="flex items-center gap-2">
                  <Checkbox
                    checked={selected.includes(row.warehouse_id)}
                    onCheckedChange={(checked) => toggle(row.warehouse_id, checked === true)}
                  />
                  {row.name} → {row.pancake_warehouse_name || row.pancake_warehouse_id}
                </label>
              ))
            )}
          </fieldset>
          <label className="grid gap-1">
            <span className="text-xs text-muted-foreground">{t("pancakePos.stock.skus")}</span>
            <Textarea rows={2} value={skuText} onChange={(e) => setSkuText(e.target.value)} />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={runDry}
            disabled={!canEdit || busy || dryBlock !== null}
            title={dryBlock ? t(dryBlock) : undefined}
          >
            <FlaskConical className="mr-1 h-4 w-4" />
            {t("pancakePos.stock.dryRun")}
          </Button>
          <Button
            type="button"
            onClick={apply}
            disabled={!canEdit || busy || applyBlock !== null}
            title={applyBlock ? t(applyBlock) : undefined}
          >
            <UploadCloud className="mr-1 h-4 w-4" />
            {t("pancakePos.stock.apply")}
          </Button>
          {canEdit && (dryBlock ?? applyBlock) && (
            <span className="text-xs text-muted-foreground">
              {t((dryBlock ?? applyBlock) as string)}
            </span>
          )}
          {!applyBlock && dry && (
            <span className="text-xs text-sky-700">
              {t("pancakePos.stock.applyWindow")
                .replace("{id}", String(dry.id))
                .replace("{minutes}", String(minutesLeft(stock?.apply_deadline)))}
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("pancakePos.runs.time")}</TableHead>
                <TableHead>{t("pancakePos.runs.mode")}</TableHead>
                <TableHead>{t("pancakePos.runs.state")}</TableHead>
                <TableHead className="text-right">{t("pancakePos.stock.count.toWrite")}</TableHead>
                <TableHead className="text-right">
                  {t("pancakePos.stock.count.missingLink")}
                </TableHead>
                <TableHead className="text-right">{t("pancakePos.count.errors")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(runsQuery.data?.items ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {t("pancakePos.runs.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                (runsQuery.data?.items ?? []).map((run) => {
                  const state = runState(run);
                  return (
                    <TableRow key={run.id}>
                      <TableCell className="whitespace-nowrap">
                        #{run.id} · {formatDateTime(run.started_at)}
                      </TableCell>
                      <TableCell>{t(`pancakePos.mode.${run.mode}`)}</TableCell>
                      <TableCell>
                        <StatusBadge tone={STATE_TONE[state]}>
                          {t(`pancakePos.state.${state}`)}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{run.updated ?? 0}</TableCell>
                      <TableCell className="text-right tabular-nums">{run.skipped ?? 0}</TableCell>
                      <TableCell className="text-right tabular-nums">{run.errors ?? 0}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setOpenRun(run.id)}
                          disabled={!run.finished_at}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          {t("pancakePos.runs.view")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <InitialStockReportDialog runId={openRun} onClose={() => setOpenRun(null)} />
    </Card>
  );
}
