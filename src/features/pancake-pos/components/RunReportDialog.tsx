import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/i18n";
import { usePancakePosRun } from "@/features/pancake-pos/queries";
import { sortedReasons } from "@/features/pancake-pos/sync-logic";

type Props = { runId: number | null; onClose: () => void };

/** Báo cáo một lượt: tổng quan, lý do loại, xung đột/lỗi, payload mẫu (dry-run). */
export function RunReportDialog({ runId, onClose }: Props) {
  const { t } = useI18n();
  const query = usePancakePosRun(runId);
  const run = query.data;
  const report = run?.report ?? {};

  return (
    <Dialog open={runId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="panel">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle>
            {t("pancakePos.report.title").replace("{id}", String(runId ?? ""))}
          </DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3 text-sm">
          {report.fatal && (
            <p className="text-destructive">
              {t("pancakePos.report.fatal").replace("{error}", report.fatal)}
            </p>
          )}
          <p>
            {t("pancakePos.report.overview")
              .replace("{candidates}", String(report.candidates ?? 0))
              .replace("{eligible}", String(report.eligible ?? 0))
              .replace("{groups}", String(report.groups ?? 0))
              .replace("{variations}", String(report.pancake_variations ?? 0))}
          </p>
          <section>
            <h3 className="mb-1 font-medium">{t("pancakePos.report.ineligible")}</h3>
            {sortedReasons(report.ineligible).length === 0 ? (
              <p className="text-muted-foreground">{t("pancakePos.report.none")}</p>
            ) : (
              <ul className="list-inside list-disc">
                {sortedReasons(report.ineligible).map(([reason, count]) => (
                  <li key={reason}>
                    <code>{reason}</code>: {count}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <IssueList
            title={t("pancakePos.report.conflicts")}
            none={t("pancakePos.report.none")}
            items={(report.conflicts ?? []).map((c) => `${c.group_key}/${c.sku}: ${c.message}`)}
          />
          <IssueList
            title={t("pancakePos.report.errors")}
            none={t("pancakePos.report.none")}
            items={(report.errors ?? []).map(
              (e) => `${e.group_key} [${e.skus.join(", ")}]: ${e.message}`,
            )}
          />
          <section>
            <h3 className="mb-1 font-medium">
              {t("pancakePos.report.samples").replace(
                "{count}",
                String(report.samples?.length ?? 0),
              )}
            </h3>
            {(report.samples ?? []).map((sample, index) => (
              <details key={`${sample.group_key}-${index}`} className="rounded border px-2 py-1">
                <summary className="cursor-pointer">
                  {sample.group_key} · {sample.action}
                  {sample.pancake_product_id ? ` · ${sample.pancake_product_id}` : ""}
                </summary>
                <pre className="mt-1 max-h-72 overflow-auto rounded bg-muted p-2 text-xs">
                  {JSON.stringify(sample.request ?? sample.variation_ids, null, 2)}
                </pre>
              </details>
            ))}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function IssueList({ title, items, none }: { title: string; items: string[]; none: string }) {
  return (
    <section>
      <h3 className="mb-1 font-medium">{title}</h3>
      {items.length === 0 ? (
        <p className="text-muted-foreground">{none}</p>
      ) : (
        <ul className="list-inside list-disc space-y-0.5">
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
