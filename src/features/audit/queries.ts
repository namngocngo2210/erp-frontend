import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getAuditLogs, type AuditLogsParams } from "@/lib/api/audit-logs";

export const auditKeys = {
  all: ["audit"] as const,
  logs: (params: AuditLogsParams) => ["audit", "logs", params] as const,
};

/**
 * Fetches audit logs with optional filters, server-side paginated
 * ({items,total,limit,offset}). enabled=false by default so the query only
 * fires when the user explicitly presses "Áp dụng" (which sets the enabled
 * flag via the component). keepPreviousData giữ trang cũ hiển thị khi lật trang.
 */
export function useAuditLogs(params: AuditLogsParams, enabled: boolean) {
  return useQuery({
    queryKey: auditKeys.logs(params),
    queryFn: () => getAuditLogs(params),
    enabled,
    placeholderData: keepPreviousData,
  });
}
