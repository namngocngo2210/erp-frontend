import { useState } from "react";
import { Eye, RotateCcw, Webhook } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

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
import { useConfirm } from "@/hooks/use-confirm";
import { useI18n } from "@/i18n";
import { formatDateTimeVi } from "@/lib/format";
import {
  configurePancakePosWebhook,
  retryPancakePosWebhookErrors,
  type PancakePosWebhookConfigureResult,
} from "@/lib/api/pancakePos";
import { pancakePosKeys, usePancakePosWebhookStatus } from "@/features/pancake-pos/queries";
import {
  WEBHOOK_EVENT_STATUSES,
  asEventTypeKey,
  summarizeCounts,
} from "@/features/pancake-pos/webhook-logic";

type Props = { canEdit: boolean };

/**
 * Webhook Pancake → CRM (two-way-sync §5.1, B1): cấu hình phía CRM, số sự kiện 24h theo
 * loại × trạng thái, lỗi gần nhất + xử lý lại; xem trước / ghi cấu hình webhook lên shop
 * Pancake (ghi thật cần PANCAKE_POS_ENABLED — BE kiểm).
 */
export function WebhookCard({ canEdit }: Props) {
  const { t } = useI18n();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const query = usePancakePosWebhookStatus();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<PancakePosWebhookConfigureResult | null>(null);
  const data = query.data;
  const config = data?.config;
  const rows = summarizeCounts(data?.counts_24h ?? []);
  const onOff = (v: boolean | undefined) =>
    t(v ? "pancakePos.webhook.on" : "pancakePos.webhook.off");

  const configure = async (dryRun: boolean) => {
    if (
      !dryRun &&
      !(await confirm({
        title: t("pancakePos.webhook.applyTitle"),
        description: t("pancakePos.webhook.applyDescription"),
        confirmText: t("pancakePos.webhook.apply"),
      }))
    ) {
      return;
    }
    setBusy(true);
    try {
      const result = await configurePancakePosWebhook(dryRun);
      setPreview(result);
      if (!dryRun) toast.success(t("pancakePos.webhook.applied"));
    } catch (error) {
      toast.error((error as Error)?.message || t("pancakePos.webhook.configFailed"));
    } finally {
      setBusy(false);
    }
  };

  const retryErrors = async () => {
    setBusy(true);
    try {
      const { count } = await retryPancakePosWebhookErrors();
      toast.success(t("pancakePos.webhook.retried").replace("{count}", String(count)));
      await queryClient.invalidateQueries({ queryKey: pancakePosKeys.webhook });
    } catch (error) {
      toast.error((error as Error)?.message || t("pancakePos.webhook.retryFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Webhook className="h-4 w-4 text-sky-600" />
            {t("pancakePos.webhook.title")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{t("pancakePos.webhook.description")}</p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => configure(true)}
            >
              <Eye className="mr-1 h-4 w-4" />
              {t("pancakePos.webhook.preview")}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={busy || !config?.secret_set || !config?.url}
              onClick={() => configure(false)}
            >
              <Webhook className="mr-1 h-4 w-4" />
              {t("pancakePos.webhook.apply")}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <dl className="grid gap-1 sm:grid-cols-[6rem_1fr]">
          <dt className="text-muted-foreground">{t("pancakePos.webhook.url")}</dt>
          <dd className="font-mono text-xs break-all">
            {config?.url || t("pancakePos.webhook.urlMissing")}
          </dd>
          <dt className="text-muted-foreground">{t("pancakePos.webhook.secret")}</dt>
          <dd className={config?.secret_set ? "" : "text-red-600"}>
            {config?.secret_set
              ? t("pancakePos.webhook.secretSet").replace("{header}", config.header)
              : t("pancakePos.webhook.secretMissing")}
          </dd>
        </dl>
        <p className="text-xs text-muted-foreground">
          {t("pancakePos.webhook.flags")
            .replace("{create}", onOff(config?.create_orders))
            .replace("{dispatch}", onOff(config?.dispatch_enabled))
            .replace("{hours}", String(config?.unmatched_hours ?? "—"))}
          {" · "}
          {data?.last_received_at
            ? t("pancakePos.webhook.lastReceived").replace(
                "{time}",
                formatDateTimeVi(data.last_received_at),
              )
            : t("pancakePos.webhook.never")}
        </p>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("pancakePos.webhook.type")}</TableHead>
                {WEBHOOK_EVENT_STATUSES.map((s) => (
                  <TableHead key={s} className="text-right">
                    {t(`pancakePos.webhook.status.${s}`)}
                  </TableHead>
                ))}
                <TableHead className="text-right">{t("pancakePos.webhook.total")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.eventType}>
                  <TableCell>
                    {t(`pancakePos.webhook.eventType.${asEventTypeKey(row.eventType)}`)}
                  </TableCell>
                  {WEBHOOK_EVENT_STATUSES.map((s) => (
                    <TableCell
                      key={s}
                      className={`text-right tabular-nums ${s === "error" && row.byStatus.error ? "text-red-600" : ""}`}
                    >
                      {row.byStatus[s]}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-medium tabular-nums">{row.total}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {data?.last_error && (
          <div className="space-y-1 rounded-md border border-red-200 bg-red-50 p-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-red-700">
                {t("pancakePos.webhook.lastError").replace("{count}", String(data.error_count))}
              </span>
              {canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={retryErrors}
                >
                  <RotateCcw className="mr-1 h-4 w-4" />
                  {t("pancakePos.webhook.retryErrors")}
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone="danger">#{data.last_error.id}</StatusBadge>
              <span className="font-mono">
                {data.last_error.event_type} {data.last_error.record_id}
              </span>
            </div>
            <div className="break-words text-red-700">{data.last_error.error}</div>
          </div>
        )}
        {preview && (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">{t("pancakePos.webhook.body")}</div>
            <pre className="max-h-64 overflow-auto rounded-md bg-muted p-2 text-xs">
              {JSON.stringify(preview.response ?? preview.body, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
