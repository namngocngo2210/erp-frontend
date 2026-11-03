import { useContext, useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AppShellContext } from "@/app/AppShellContext";
import { Button } from "@/components/ui/button";
import { can } from "@/lib/permissions";
import { downloadAttendanceExport } from "@/lib/api/hr-attendance";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { Input } from "@/components/ui/input";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { PaginationPages } from "@/components/ui/pagination";
import { ResponsiveList } from "@/components/ui/responsive-list";
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

import type { AttendanceDayRow, AttendanceSub } from "../attendance-types";
import { useAttendanceEvents, useHrDepartments } from "../queries";
import { AttendanceEventDetailDialog } from "../components/AttendanceEventDetailDialog";
import { AuthImage } from "../components/AuthImage";
import { formatTimeVi } from "@/lib/format";

const PAGE_SIZE = 50;
const COLUMN_COUNT = 6;
const ALL = "__all__";

function formatTime(iso: string): string {
  return formatTimeVi(iso);
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function AttendanceHistoryPage() {
  const { t } = useI18n();

  const [offset, setOffset] = useState(0);
  const [departmentId, setDepartmentId] = useState<string>(ALL);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<AttendanceDayRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [exportMonth, setExportMonth] = useState(currentMonth);
  const [exporting, setExporting] = useState(false);

  // Đọc context an toàn (null khi render ngoài shell, vd trong unit test).
  const shell = useContext(AppShellContext);
  const canExport = can(shell?.user, "employees:export");

  const { data: departments = [] } = useHrDepartments(true);

  const handleExport = async () => {
    if (!exportMonth || exporting) return;
    setExporting(true);
    try {
      const blob = await downloadAttendanceExport(exportMonth);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cham-cong-${exportMonth}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("hr.history.export.error", "Xuất Excel chấm công thất bại."));
    } finally {
      setExporting(false);
    }
  };

  const params = useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset,
      department: departmentId !== ALL ? Number(departmentId) : undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }),
    [offset, departmentId, dateFrom, dateTo],
  );

  const { data, isLoading } = useAttendanceEvents(params);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const headerClass = "h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground";

  const openDetail = (row: AttendanceDayRow) => {
    setSelected(row);
    setDetailOpen(true);
  };

  // Ô "Giờ vào"/"Giờ ra": giờ HH:mm + thumbnail ảnh chấm công (nếu có), ngược lại "—".
  const renderSubCell = (sub: AttendanceSub | null, alt: string) => {
    if (!sub) return <span className="text-muted-foreground">—</span>;
    return (
      <span className="inline-flex items-center whitespace-nowrap">
        {formatTime(sub.occurred_at)}
        {sub.photo_url && (
          <AuthImage
            src={sub.photo_url}
            alt={alt}
            className="ml-2 inline-block h-9 w-9 rounded object-cover"
          />
        )}
      </span>
    );
  };

  // Đổi bộ lọc → về trang đầu để tránh offset vượt quá tổng mới.
  const resetOffset = () => setOffset(0);

  const toolbar = (
    <div className="flex w-full flex-wrap items-center gap-2">
      <Select
        value={departmentId}
        onValueChange={(v) => {
          setDepartmentId(v);
          resetOffset();
        }}
      >
        <SelectTrigger className="w-50">
          <SelectValue placeholder={t("hr.history.filter.allDepartments", "Tất cả phòng ban")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>
            {t("hr.history.filter.allDepartments", "Tất cả phòng ban")}
          </SelectItem>
          {departments.map((d) => (
            <SelectItem key={d.id} value={String(d.id)}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-1">
        <label htmlFor="history-date-from" className="text-sm text-muted-foreground">
          {t("hr.history.filter.dateFrom", "Từ ngày")}
        </label>
        <Input
          id="history-date-from"
          type="date"
          className="w-40"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            resetOffset();
          }}
        />
      </div>
      <div className="flex items-center gap-1">
        <label htmlFor="history-date-to" className="text-sm text-muted-foreground">
          {t("hr.history.filter.dateTo", "Đến ngày")}
        </label>
        <Input
          id="history-date-to"
          type="date"
          className="w-40"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            resetOffset();
          }}
        />
      </div>
      {canExport && (
        <div className="ml-auto flex items-center gap-2">
          <Input
            type="month"
            className="w-40"
            value={exportMonth}
            onChange={(e) => setExportMonth(e.target.value)}
            aria-label={t("hr.history.export.month", "Tháng xuất Excel")}
          />
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {t("hr.history.export.button", "Xuất Excel")}
          </Button>
        </div>
      )}
    </div>
  );

  const table = (
    <Table className="min-w-[760px] [&_td]:px-3 [&_th]:px-3">
      <TableHeader>
        <TableRow>
          <TableHead className={headerClass}>{t("hr.history.col.code", "Mã NV")}</TableHead>
          <TableHead className={headerClass}>{t("hr.history.col.name", "Họ tên")}</TableHead>
          <TableHead className={headerClass}>
            {t("hr.history.col.department", "Phòng ban")}
          </TableHead>
          <TableHead className={headerClass}>{t("hr.history.col.date", "Ngày")}</TableHead>
          <TableHead className={headerClass}>{t("hr.history.col.checkIn", "Giờ vào")}</TableHead>
          <TableHead className={headerClass}>{t("hr.history.col.checkOut", "Giờ ra")}</TableHead>
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
              {t("hr.history.empty", "Chưa có dữ liệu chấm công.")}
            </TableCell>
          </TableRow>
        ) : (
          items.map((row) => (
            <TableRow
              key={`${row.employee_id}-${row.work_date}`}
              className="cursor-pointer"
              onClick={() => openDetail(row)}
            >
              <TableCell className="font-medium text-foreground">{row.employee_code}</TableCell>
              <TableCell className="text-foreground">{row.employee_name}</TableCell>
              <TableCell className="text-muted-foreground">{row.department_name}</TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {row.work_date}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {renderSubCell(row.check_in ?? null, t("hr.history.kind.check_in", "Vào"))}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {renderSubCell(row.check_out ?? null, t("hr.history.kind.check_out", "Ra"))}
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
          getKey={(row: AttendanceDayRow) => `${row.employee_id}-${row.work_date}`}
          loading={isLoading}
          loadingText={t("common.loading", "Đang tải...")}
          emptyText={t("hr.history.empty", "Chưa có dữ liệu chấm công.")}
          renderCard={(row: AttendanceDayRow) => (
            <button
              type="button"
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-left"
              onClick={() => openDetail(row)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{row.employee_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.employee_code}
                    {row.department_name ? ` · ${row.department_name}` : ""}
                  </p>
                </div>
                <span className="whitespace-nowrap text-xs font-medium text-foreground">
                  {row.work_date}
                </span>
              </div>
              <dl className="mt-2 space-y-1 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">
                    {t("hr.history.col.checkIn", "Giờ vào")}
                  </dt>
                  <dd className="text-right">
                    {renderSubCell(row.check_in ?? null, t("hr.history.kind.check_in", "Vào"))}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">
                    {t("hr.history.col.checkOut", "Giờ ra")}
                  </dt>
                  <dd className="text-right">
                    {renderSubCell(row.check_out ?? null, t("hr.history.kind.check_out", "Ra"))}
                  </dd>
                </div>
              </dl>
            </button>
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

      <AttendanceEventDetailDialog open={detailOpen} onOpenChange={setDetailOpen} row={selected} />
    </>
  );
}
