import { useContext, useMemo, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { AppShellContext } from "@/app/AppShellContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { PaginationPages } from "@/components/ui/pagination";
import { ResponsiveList } from "@/components/ui/responsive-list";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { can } from "@/lib/permissions";
import { useI18n } from "@/i18n";

import { LeaveRequestFormDialog } from "../components/LeaveRequestFormDialog";
import type { LeaveCreatePayload, LeaveRequest, LeaveStatusKey, LeaveTypeKey } from "../hr-types";
import {
  useApproveLeave,
  useCreateLeaveRequest,
  useLeaveRequests,
  useRejectLeave,
} from "../queries";

const PAGE_SIZE = 50;
const COLUMN_COUNT = 6;

const TYPE_FALLBACK: Record<LeaveTypeKey, string> = {
  annual: "Phép năm",
  sick: "Nghỉ ốm",
  unpaid: "Không lương",
  other: "Khác",
};

const STATUS_FALLBACK: Record<LeaveStatusKey, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  cancelled: "Đã hủy",
};

const STATUS_VARIANT: Record<LeaveStatusKey, "default" | "secondary" | "outline" | "destructive"> =
  {
    pending: "outline",
    approved: "default",
    rejected: "destructive",
    cancelled: "secondary",
  };

export default function LeaveRequestsPage() {
  const { t } = useI18n();
  // Đọc context an toàn (null khi render ngoài shell, vd trong unit test).
  const shell = useContext(AppShellContext);
  const canApprove = can(shell?.user, "employees:approve");

  const [offset, setOffset] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);

  const params = useMemo(() => ({ limit: PAGE_SIZE, offset }), [offset]);
  const { data, isLoading } = useLeaveRequests(params);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const createMutation = useCreateLeaveRequest();
  const approveMutation = useApproveLeave();
  const rejectMutation = useRejectLeave();

  const headerClass = "h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground";

  const handleCreate = (payload: LeaveCreatePayload) => {
    createMutation.mutate(payload, {
      onSuccess: () => {
        toast.success(t("hr.leave.toast.created", "Đã tạo đơn nghỉ phép."));
        setDialogOpen(false);
      },
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : t("hr.leave.toast.failed", "Thao tác thất bại."),
        ),
    });
  };

  const handleApprove = (id: number) => {
    approveMutation.mutate(id, {
      onSuccess: () => toast.success(t("hr.leave.toast.approved", "Đã duyệt đơn.")),
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : t("hr.leave.toast.failed", "Thao tác thất bại."),
        ),
    });
  };

  const handleReject = (id: number) => {
    rejectMutation.mutate(id, {
      onSuccess: () => toast.success(t("hr.leave.toast.rejected", "Đã từ chối đơn.")),
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : t("hr.leave.toast.failed", "Thao tác thất bại."),
        ),
    });
  };

  // Nút Duyệt/Từ chối dùng chung cho bảng desktop và card mobile.
  const renderApprovalActions = (row: LeaveRequest) => (
    <>
      <Button
        title={t("hr.leave.action.approve", "Duyệt")}
        aria-label={t("hr.leave.action.approve", "Duyệt")}
        size="icon-sm"
        variant="outline"
        className="border-border bg-background text-primary hover:bg-accent"
        disabled={approveMutation.isPending}
        onClick={() => handleApprove(row.id)}
      >
        <Check className="h-4 w-4" />
      </Button>
      <Button
        title={t("hr.leave.action.reject", "Từ chối")}
        aria-label={t("hr.leave.action.reject", "Từ chối")}
        size="icon-sm"
        variant="outline"
        className="ml-1 border-border bg-background text-destructive hover:bg-accent"
        disabled={rejectMutation.isPending}
        onClick={() => handleReject(row.id)}
      >
        <X className="h-4 w-4" />
      </Button>
    </>
  );

  const toolbar = (
    <div className="flex w-full flex-wrap items-center gap-2">
      <Button
        className="ml-auto bg-primary text-primary-foreground hover:bg-primary/90"
        onClick={() => setDialogOpen(true)}
      >
        <Plus className="mr-2 h-4 w-4" />
        {t("hr.leave.create", "Tạo đơn")}
      </Button>
    </div>
  );

  const table = (
    <Table className="min-w-[760px] [&_td]:px-3 [&_th]:px-3">
      <TableHeader>
        <TableRow>
          <TableHead className={headerClass}>{t("hr.leave.col.employee", "Nhân viên")}</TableHead>
          <TableHead className={headerClass}>{t("hr.leave.col.type", "Loại")}</TableHead>
          <TableHead className={headerClass}>{t("hr.leave.col.range", "Từ - Đến")}</TableHead>
          <TableHead className={headerClass}>{t("hr.leave.col.days", "Số ngày")}</TableHead>
          <TableHead className={headerClass}>{t("hr.leave.col.status", "Trạng thái")}</TableHead>
          <TableHead className={`${headerClass} text-right`}>
            {t("common.actions", "Hành động")}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading && items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={COLUMN_COUNT} className="py-8 text-center">
              <LogoSpinner label={t("common.loading", "Đang tải...")} className="mx-auto" />
            </TableCell>
          </TableRow>
        ) : items.length === 0 ? (
          <TableRow>
            <TableCell colSpan={COLUMN_COUNT} className="py-8 text-center text-muted-foreground">
              {t("hr.leave.empty", "Chưa có đơn nghỉ phép nào.")}
            </TableCell>
          </TableRow>
        ) : (
          items.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium text-foreground">#{row.employee}</TableCell>
              <TableCell className="text-muted-foreground">
                {t(`hr.leave.type.${row.leave_type}`, TYPE_FALLBACK[row.leave_type])}
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {row.start_date} → {row.end_date}
              </TableCell>
              <TableCell className="text-muted-foreground">{row.days}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[row.status ?? "pending"]}>
                  {t(
                    `hr.leave.status.${row.status ?? "pending"}`,
                    STATUS_FALLBACK[row.status ?? "pending"],
                  )}
                </Badge>
              </TableCell>
              <TableCell className="whitespace-nowrap text-right">
                {canApprove && row.status === "pending" ? (
                  renderApprovalActions(row)
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <>
      <DataTableShell loading={isLoading && items.length === 0} toolbar={toolbar}>
        <ResponsiveList
          items={items}
          table={table}
          getKey={(row: LeaveRequest) => row.id}
          loading={isLoading}
          loadingText={t("common.loading", "Đang tải...")}
          emptyText={t("hr.leave.empty", "Chưa có đơn nghỉ phép nào.")}
          renderCard={(row: LeaveRequest) => (
            <div className="rounded-lg border border-border bg-card px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">#{row.employee}</p>
                  <p className="text-xs text-muted-foreground">
                    {t(`hr.leave.type.${row.leave_type}`, TYPE_FALLBACK[row.leave_type])}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[row.status ?? "pending"]}>
                  {t(
                    `hr.leave.status.${row.status ?? "pending"}`,
                    STATUS_FALLBACK[row.status ?? "pending"],
                  )}
                </Badge>
              </div>
              <dl className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{t("hr.leave.col.range", "Từ - Đến")}</dt>
                  <dd className="text-right">
                    {row.start_date} → {row.end_date}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{t("hr.leave.col.days", "Số ngày")}</dt>
                  <dd className="text-right">{row.days}</dd>
                </div>
              </dl>
              {canApprove && row.status === "pending" && (
                <div className="mt-3 flex justify-end">{renderApprovalActions(row)}</div>
              )}
            </div>
          )}
        />

        {total > PAGE_SIZE && (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2 px-3 pb-3">
            <PaginationPages
              page={currentPage}
              totalPages={totalPages}
              disabled={isLoading}
              onPageChange={(page) => setOffset((page - 1) * PAGE_SIZE)}
            />
          </div>
        )}
      </DataTableShell>

      <LeaveRequestFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        isPending={createMutation.isPending}
        onSubmit={handleCreate}
      />
    </>
  );
}
