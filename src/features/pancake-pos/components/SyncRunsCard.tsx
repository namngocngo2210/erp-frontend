import { useState } from "react";
import { Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { TablePagination } from "@/components/ui/table-pagination";
import { useI18n } from "@/i18n";
import type { PancakePosSyncRun } from "@/lib/api/pancakePos";
import { formatDateTime } from "@/lib/utils";
import { RunReportDialog } from "@/features/pancake-pos/components/RunReportDialog";
import { runState, type RunState } from "@/features/pancake-pos/sync-logic";

export const RUNS_PAGE_SIZE = 20;

const COUNT_KEYS = [
  "created",
  "updated",
  "linked",
  "skipped",
  "hidden",
  "conflicts",
  "errors",
] as const;

const STATE_TONE: Record<RunState, "info" | "danger" | "warning" | "success"> = {
  running: "info",
  failed: "danger",
  warning: "warning",
  done: "success",
};

type Props = {
  runs: PancakePosSyncRun[];
  total: number;
  offset: number;
  onOffsetChange: (offset: number) => void;
};

/** Bảng lượt chạy (full / chạy thử / tăng dần) + mở báo cáo. */
export function SyncRunsCard({ runs, total, offset, onOffsetChange }: Props) {
  const { t } = useI18n();
  const [openRun, setOpenRun] = useState<number | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("pancakePos.runs.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("pancakePos.runs.time")}</TableHead>
                <TableHead>{t("pancakePos.runs.mode")}</TableHead>
                <TableHead>{t("pancakePos.runs.state")}</TableHead>
                {COUNT_KEYS.map((key) => (
                  <TableHead key={key} className="text-right">
                    {t(`pancakePos.count.${key}`)}
                  </TableHead>
                ))}
                <TableHead>{t("pancakePos.runs.by")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={COUNT_KEYS.length + 5}
                    className="text-center text-muted-foreground"
                  >
                    {t("pancakePos.runs.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                runs.map((run) => {
                  const state = runState(run);
                  return (
                    <TableRow key={run.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(run.started_at)}
                      </TableCell>
                      <TableCell>{t(`pancakePos.mode.${run.mode}`)}</TableCell>
                      <TableCell>
                        <StatusBadge tone={STATE_TONE[state]} title={run.fatal || undefined}>
                          {t(`pancakePos.state.${state}`)}
                        </StatusBadge>
                      </TableCell>
                      {COUNT_KEYS.map((key) => (
                        <TableCell key={key} className="text-right tabular-nums">
                          {run[key] ?? 0}
                        </TableCell>
                      ))}
                      <TableCell>{run.triggered_by?.name ?? t("pancakePos.runs.system")}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setOpenRun(run.id)}
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
        <TablePagination
          total={total}
          pageSize={RUNS_PAGE_SIZE}
          offset={offset}
          onOffsetChange={onOffsetChange}
        />
      </CardContent>
      <RunReportDialog runId={openRun} onClose={() => setOpenRun(null)} />
    </Card>
  );
}
