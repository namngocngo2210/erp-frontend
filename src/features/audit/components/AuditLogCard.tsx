import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n";
import type { AuditLog } from "@/lib/api/audit-logs";

interface AuditLogCardProps {
  log: AuditLog;
  actionTypeLabels: Record<string, string>;
  entityTypeLabels: Record<string, string>;
  sourceLabels: Record<string, string>;
}

export function AuditLogCard({
  log,
  actionTypeLabels,
  entityTypeLabels,
  sourceLabels,
}: AuditLogCardProps) {
  const { t } = useI18n();

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {log.user || t("audit.table.system", "Hệ thống")}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(log.timestamp).toLocaleString()}
          </p>
        </div>
        <Badge variant="outline">{actionTypeLabels[log.action_type] || log.action_type}</Badge>
      </div>

      <dl className="mt-2 space-y-1 text-xs">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{t("audit.table.entity", "Đối tượng")}</dt>
          <dd className="text-right">
            {entityTypeLabels[log.entity_type] || log.entity_type}
            {log.entity_id && ` (#${log.entity_id})`}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{t("audit.table.source", "Nguồn")}</dt>
          <dd className="text-right">{sourceLabels[log.source] || log.source}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{t("audit.table.duration", "Thời gian xử lý")}</dt>
          <dd className="text-right">
            {log.duration_ms ? `${log.duration_ms}ms` : t("audit.table.na", "N/A")}
          </dd>
        </div>
      </dl>
    </div>
  );
}
