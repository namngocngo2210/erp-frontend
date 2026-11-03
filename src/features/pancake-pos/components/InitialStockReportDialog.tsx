import { useState } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/i18n";
import { diffsToCsv, filterDiffs } from "@/features/pancake-pos/initial-stock-logic";
import { useInitialStockRun } from "@/features/pancake-pos/queries";

/** Hiển thị tối đa N dòng lệch trên màn hình; CSV tải đủ. */
const MAX_ROWS = 300;

const TOTAL_KEYS = [
  "lines",
  "skus",
  "to_write",
  "unchanged",
  "unknown_on_pancake",
  "negative",
  "missing_link",
  "batches",
  "split_batches",
  "written",
  "failed",
] as const;

function downloadCsv(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

type Props = { runId: number | null; onClose: () => void };

/** Báo cáo lượt tồn đầu kỳ: tổng, bảng lệch CRM vs Pancake (tải CSV), âm → 0, thiếu liên kết, lỗi lô. */
export function InitialStockReportDialog({ runId, onClose }: Props) {
  const { t } = useI18n();
  const query = useInitialStockRun(runId);
  const report = query.data?.report ?? {};
  const [filter, setFilter] = useState("");
  const diffs = filterDiffs(report.diffs ?? [], filter);

  return (
    <Dialog open={runId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="panel">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle>
            {t("pancakePos.report.title").replace("{id}", String(runId ?? ""))}
            {report.dry_run ? ` · ${t("pancakePos.mode.initial_stock_dry")}` : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3 text-sm">
          {report.fatal && (
            <p className="text-destructive">
              {t("pancakePos.report.fatal").replace("{error}", report.fatal)}
            </p>
          )}
          {(report.warehouses ?? []).length > 0 && (
            <p className="text-muted-foreground">
              {(report.warehouses ?? [])
                .map(
                  (w) =>
                    `${w.warehouse_name} → ${w.pancake_warehouse_name || w.pancake_warehouse_id}`,
                )
                .join(" · ")}
              {report.scope?.skus?.length ? ` · SKU: ${report.scope.skus.join(", ")}` : ""}
            </p>
          )}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-5">
            {TOTAL_KEYS.map((key) => (
              <div key={key}>
                <dt className="text-xs text-muted-foreground">
                  {t(`pancakePos.stock.total.${key}`)}
                </dt>
                <dd className="font-medium tabular-nums">{report.totals?.[key] ?? 0}</dd>
              </div>
            ))}
          </dl>
          <section className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium">
                {t("pancakePos.stock.diffs").replace("{count}", String(report.diffs?.length ?? 0))}
              </h3>
              <div className="flex items-center gap-2">
                <Input
                  className="h-8 w-48"
                  placeholder={t("pancakePos.stock.filter")}
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!report.diffs?.length}
                  onClick={() =>
                    downloadCsv(diffsToCsv(report.diffs ?? []), `pancake-ton-dau-ky-${runId}.csv`)
                  }
                >
                  <Download className="mr-1 h-4 w-4" />
                  CSV
                </Button>
              </div>
            </div>
            {diffs.length === 0 ? (
              <p className="text-muted-foreground">{t("pancakePos.report.none")}</p>
            ) : (
              <div className="max-h-96 overflow-auto rounded border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>{t("pancakePos.stock.col.warehouse")}</TableHead>
                      <TableHead className="text-right">{t("pancakePos.stock.col.crm")}</TableHead>
                      <TableHead className="text-right">{t("pancakePos.stock.col.push")}</TableHead>
                      <TableHead className="text-right">
                        {t("pancakePos.stock.col.pancake")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("pancakePos.stock.col.delta")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {diffs.slice(0, MAX_ROWS).map((d) => (
                      <TableRow key={`${d.product_id}-${d.warehouse_id}`}>
                        <TableCell className="font-mono text-xs">{d.sku}</TableCell>
                        <TableCell>{d.warehouse_name}</TableCell>
                        <TableCell
                          className={`text-right tabular-nums ${d.crm_qty < 0 ? "text-destructive" : ""}`}
                        >
                          {d.crm_qty}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{d.push_qty}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {d.pancake_qty ?? "?"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {d.delta === null ? "?" : d.delta > 0 ? `+${d.delta}` : d.delta}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {diffs.length > MAX_ROWS && (
              <p className="text-xs text-muted-foreground">
                {t("pancakePos.stock.truncated").replace("{count}", String(MAX_ROWS))}
              </p>
            )}
          </section>
          <IssueList
            title={t("pancakePos.stock.negatives")}
            none={t("pancakePos.report.none")}
            items={(report.negatives ?? []).map(
              (n) => `${n.sku} @ ${n.warehouse_name}: ${n.crm_qty} → 0`,
            )}
          />
          <IssueList
            title={t("pancakePos.stock.missingLinks")}
            none={t("pancakePos.report.none")}
            items={(report.missing_links ?? []).map(
              (m) =>
                `${m.sku}: ${m.quantity} (${Object.entries(m.warehouses)
                  .map(([name, qty]) => `${name} ${qty}`)
                  .join(", ")})`,
            )}
          />
          <IssueList
            title={t("pancakePos.stock.lineErrors")}
            none={t("pancakePos.report.none")}
            items={(report.line_errors ?? []).map(
              (e) => `${e.sku} @ ${e.warehouse_name} (${e.push_qty}): ${e.message}`,
            )}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function IssueList({ title, none, items }: { title: string; none: string; items: string[] }) {
  return (
    <section>
      <h3 className="mb-1 font-medium">
        {title} ({items.length})
      </h3>
      {items.length === 0 ? (
        <p className="text-muted-foreground">{none}</p>
      ) : (
        <ul className="max-h-48 list-inside list-disc overflow-y-auto">
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
