import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationPages } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/i18n";
import { listChannels } from "@/lib/api/channels";
import {
  retryLeadOrder,
  type PancakeLead,
  type PancakeLeadsParams,
  type PancakePushStatus,
} from "@/lib/api/pancake";
import { orderDetailPath } from "@/lib/routes";
import { formatDateTime } from "@/lib/utils";
import { pancakeKeys, usePancakeLeads, usePancakePages } from "@/features/pancake/queries";

const PAGE_SIZE = 50;
const STATUSES: PancakePushStatus[] = [
  "pending",
  "ok",
  "failed",
  "skipped_no_mapping",
  "order_created",
  "order_failed",
  "order_exists",
];
const STATUS_VARIANT: Record<
  PancakePushStatus,
  "secondary" | "success" | "destructive" | "warning" | "info"
> = {
  pending: "secondary",
  ok: "success",
  failed: "destructive",
  skipped_no_mapping: "warning",
  order_created: "success",
  order_failed: "destructive",
  order_exists: "info",
};
/** Lead đủ điều kiện tạo lại đơn: chưa có order và trạng thái là một trong các bước còn dở. */
const RETRYABLE_STATUSES = new Set<PancakePushStatus>([
  "pending",
  "failed",
  "skipped_no_mapping",
  "order_failed",
]);

const fmt = (value: string | null) => (value ? formatDateTime(value) : "—");

/**
 * Sales → Lead Pancake (quyền `pancake-leads:view`). 8 cột theo chỉ định của chủ dự
 * án (2026-09-16) + cột Đẩy Foxia của ta. Phân trang server, lọc đổi là về trang 1.
 */
export default function PancakeLeadsPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    page: "",
    channel: "",
    push_status: "",
    q: "",
    date_from: "",
    date_to: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [busyLead, setBusyLead] = useState<number | null>(null);

  const params = useMemo<PancakeLeadsParams>(
    () => ({
      page: filters.page ? Number(filters.page) : "",
      channel: filters.channel ? Number(filters.channel) : "",
      push_status: filters.push_status as PancakePushStatus | "",
      q: filters.q.trim(),
      date_from: filters.date_from,
      date_to: filters.date_to,
      limit: PAGE_SIZE,
      offset: (currentPage - 1) * PAGE_SIZE,
    }),
    [filters, currentPage],
  );
  const leadsQuery = usePancakeLeads(params);
  const pagesQuery = usePancakePages();
  const channelsQuery = useQuery({
    queryKey: ["channels", "for-pancake-leads"],
    queryFn: listChannels,
  });

  const data = leadsQuery.data;
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const setFilter = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleRetry = async (lead: PancakeLead) => {
    setBusyLead(lead.id);
    try {
      await retryLeadOrder(lead.id);
      toast.success(t("pancake.leads.retryQueued"));
    } catch (error) {
      toast.error((error as Error)?.message || t("pancake.leads.retryFailed"));
    } finally {
      setBusyLead(null);
      // Kể cả tạo lại thất bại, BE có thể đã cập nhật push_status/error — refetch
      // để dòng lead không đứng hình ở trạng thái cũ (giống patchPage ở trang Cài đặt).
      await queryClient.invalidateQueries({ queryKey: pancakeKeys.all });
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title={t("pancake.leads.title")} description={t("pancake.leads.description")} />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-2 pt-4">
          <Select value={filters.page} onValueChange={(value) => setFilter("page", value)}>
            <SelectTrigger aria-label={t("pancake.leads.filter.page")} className="h-9">
              <SelectValue
                placeholder={`${t("pancake.leads.filter.page")}: ${t("pancake.leads.filter.all")}`}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{`${t("pancake.leads.filter.page")}: ${t("pancake.leads.filter.all")}`}</SelectItem>
              {(pagesQuery.data ?? []).map((page) => (
                <SelectItem key={page.id} value={String(page.id)}>
                  {page.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.channel} onValueChange={(value) => setFilter("channel", value)}>
            <SelectTrigger aria-label={t("pancake.leads.filter.channel")} className="h-9">
              <SelectValue
                placeholder={`${t("pancake.leads.filter.channel")}: ${t("pancake.leads.filter.all")}`}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{`${t("pancake.leads.filter.channel")}: ${t("pancake.leads.filter.all")}`}</SelectItem>
              {(channelsQuery.data ?? []).map((channel) => (
                <SelectItem key={channel.id} value={String(channel.id)}>
                  {channel.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.push_status}
            onValueChange={(value) => setFilter("push_status", value)}
          >
            <SelectTrigger aria-label={t("pancake.leads.filter.status")} className="h-9">
              <SelectValue
                placeholder={`${t("pancake.leads.filter.status")}: ${t("pancake.leads.filter.all")}`}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{`${t("pancake.leads.filter.status")}: ${t("pancake.leads.filter.all")}`}</SelectItem>
              {STATUSES.map((status) => (
                <SelectItem key={status} value={String(status)}>
                  {t(`pancake.leads.status.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            aria-label={t("pancake.leads.filter.q")}
            placeholder={t("pancake.leads.filter.q")}
            className="w-48"
            value={filters.q}
            onChange={(e) => setFilter("q", e.target.value)}
          />
          <Input
            aria-label={t("pancake.leads.filter.from")}
            type="date"
            className="w-40"
            value={filters.date_from}
            onChange={(e) => setFilter("date_from", e.target.value)}
          />
          <Input
            aria-label={t("pancake.leads.filter.to")}
            type="date"
            className="w-40"
            value={filters.date_to}
            onChange={(e) => setFilter("date_to", e.target.value)}
          />
          <span className="ml-auto text-sm text-muted-foreground">
            {t("pancake.leads.total").replace("{total}", String(total))}
          </span>
        </CardContent>
      </Card>

      <Card data-main-content>
        <CardContent className="pt-4">
          {data && data.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("pancake.leads.empty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("pancake.leads.col.page")}</TableHead>
                  <TableHead>{t("pancake.leads.col.customer")}</TableHead>
                  <TableHead>{t("pancake.leads.col.convCreated")}</TableHead>
                  <TableHead>{t("pancake.leads.col.phone")}</TableHead>
                  <TableHead>{t("pancake.leads.col.tags")}</TableHead>
                  <TableHead>{t("pancake.leads.col.created")}</TableHead>
                  <TableHead>{t("pancake.leads.col.phoneGiven")}</TableHead>
                  <TableHead>{t("pancake.leads.col.assignee")}</TableHead>
                  <TableHead>{t("pancake.leads.col.order")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.items ?? []).map((lead) => {
                  const canRetry =
                    lead.order_id === null && RETRYABLE_STATUSES.has(lead.push_status);
                  return (
                    <TableRow key={lead.id}>
                      <TableCell className="max-w-[14rem]">
                        <span className="text-sm">{`[${lead.pancake_page_id}] ${lead.page_name}`}</span>
                        <div className="text-xs text-muted-foreground">{lead.channel_name}</div>
                      </TableCell>
                      <TableCell>{lead.customer_name || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {fmt(lead.conversation_inserted_at)}
                      </TableCell>
                      <TableCell className="font-mono">{lead.phone}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {lead.tags.map((tag) => (
                            <Badge key={tag} variant="outline">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{fmt(lead.created_at)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {fmt(lead.phone_given_at)}
                      </TableCell>
                      <TableCell>{lead.assignee_name || "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          {lead.order_id !== null && (
                            <Link
                              to={orderDetailPath(lead.order_id)}
                              className="font-mono text-sm underline"
                            >
                              {`#${lead.order_id}`}
                            </Link>
                          )}
                          <Badge
                            variant={STATUS_VARIANT[lead.push_status]}
                            title={lead.error || undefined}
                          >
                            {t(`pancake.leads.status.${lead.push_status}`)}
                          </Badge>
                          {canRetry && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyLead === lead.id}
                              onClick={() => handleRetry(lead)}
                            >
                              {t("pancake.leads.retryOrder")}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {totalPages > 1 && (
            <div className="mt-4 flex justify-end">
              <PaginationPages
                page={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                disabled={leadsQuery.isFetching}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
