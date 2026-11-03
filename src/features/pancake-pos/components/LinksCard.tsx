import { useState } from "react";
import { RotateCcw } from "lucide-react";
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
import { retryPancakePosLink, type PancakePosLinkStatus } from "@/lib/api/pancakePos";
import { pancakePosKeys, usePancakePosLinks } from "@/features/pancake-pos/queries";

const PAGE_SIZE = 50;
const ALL = "all";
const STATUSES: PancakePosLinkStatus[] = ["error", "conflict", "pending", "skipped", "synced"];
const RETRYABLE = new Set<PancakePosLinkStatus>(["error", "conflict", "pending", "skipped"]);
const TONE: Record<PancakePosLinkStatus, "danger" | "warning" | "info" | "neutral" | "success"> = {
  error: "danger",
  conflict: "warning",
  pending: "info",
  skipped: "neutral",
  synced: "success",
};

/** Liên kết SKU CRM ↔ mẫu mã Pancake; mặc định lọc lỗi để người vận hành xử lý. */
export function LinksCard({ canEdit }: { canEdit: boolean }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<PancakePosLinkStatus | typeof ALL>("error");
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState<number | null>(null);
  const query = usePancakePosLinks({
    status: status === ALL ? "" : status,
    q,
    offset,
    limit: PAGE_SIZE,
  });
  const links = query.data?.items ?? [];

  const retry = async (id: number) => {
    setBusy(id);
    try {
      await retryPancakePosLink(id);
      toast.success(t("pancakePos.links.retried"));
      await queryClient.invalidateQueries({ queryKey: pancakePosKeys.all });
    } catch (error) {
      toast.error((error as Error)?.message || t("pancakePos.links.retryFailed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">{t("pancakePos.links.title")}</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as PancakePosLinkStatus | typeof ALL);
              setOffset(0);
            }}
          >
            <SelectTrigger className="w-44" aria-label={t("pancakePos.links.status")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("pancakePos.links.allStatuses")}</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`pancakePos.linkStatus.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="w-56"
            placeholder={t("pancakePos.links.search")}
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
                <TableHead>{t("pancakePos.links.sku")}</TableHead>
                <TableHead>{t("pancakePos.links.group")}</TableHead>
                <TableHead>{t("pancakePos.links.pancakeId")}</TableHead>
                <TableHead>{t("pancakePos.links.status")}</TableHead>
                <TableHead>{t("pancakePos.links.error")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {t("pancakePos.links.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                links.map((link) => {
                  const linkStatus = link.status ?? "pending";
                  return (
                    <TableRow key={link.id}>
                      <TableCell>
                        <div className="font-medium">{link.sku}</div>
                        <div className="text-xs text-muted-foreground">{link.name}</div>
                      </TableCell>
                      <TableCell>{link.group_key}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {link.pancake_variation_id ?? "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={TONE[linkStatus]}>
                          {t(`pancakePos.linkStatus.${linkStatus}`)}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="max-w-md text-xs break-words">
                        {link.last_error || "—"}
                      </TableCell>
                      <TableCell>
                        {canEdit && RETRYABLE.has(linkStatus) && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={busy === link.id}
                            onClick={() => retry(link.id)}
                          >
                            <RotateCcw className="mr-1 h-4 w-4" />
                            {t("pancakePos.links.retry")}
                          </Button>
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
