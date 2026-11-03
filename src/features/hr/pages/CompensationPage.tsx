import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { downloadPayrollExport, type CompensationRow } from "@/lib/api/hr-compensation";
import { getApiErrorMessage } from "@/lib/errors";
import { useI18n } from "@/i18n";

import { useCompensations, useUpdateCompensation } from "../queries";

type Draft = {
  base_salary: string;
  standard_workdays: string;
  attendance_bonus: string;
  responsibility_allowance: string;
  kpi_rate: string;
  lunch_per_meal: string;
  other_allowance: string;
  social_insurance: string;
  note: string;
};

/** Số của backend về dạng canonical ("24.0", "0.20000") khác chuỗi người dùng gõ
 * ("24", "0.2"). So dirty theo GIÁ TRỊ SỐ, không theo chuỗi — nếu không, lưu xong
 * dòng vẫn "chưa lưu" vĩnh viễn. Ô trống ⇔ 0 (payload gửi "0"). */
const NUMBER_FIELDS: (keyof Draft)[] = [
  "base_salary",
  "standard_workdays",
  "attendance_bonus",
  "responsibility_allowance",
  "kpi_rate",
  "lunch_per_meal",
  "other_allowance",
  "social_insurance",
];

function sameFieldValue(field: keyof Draft, a: string, b: string): boolean {
  if (!NUMBER_FIELDS.includes(field)) return a === b;
  const na = a.trim() === "" ? 0 : Number(a);
  const nb = b.trim() === "" ? 0 : Number(b);
  if (Number.isNaN(na) || Number.isNaN(nb)) return a.trim() === b.trim();
  return na === nb;
}

function isDirty(draft: Draft, row: CompensationRow): boolean {
  const server = toDraft(row);
  return (Object.keys(server) as (keyof Draft)[]).some(
    (field) => !sameFieldValue(field, draft[field] ?? "", server[field] ?? ""),
  );
}

function toDraft(row: CompensationRow): Draft {
  return {
    base_salary: row.base_salary ?? "",
    standard_workdays: row.standard_workdays ?? "",
    attendance_bonus: row.attendance_bonus ?? "",
    responsibility_allowance: row.responsibility_allowance ?? "",
    kpi_rate: row.kpi_rate ?? "",
    lunch_per_meal: row.lunch_per_meal ?? "",
    other_allowance: row.other_allowance ?? "",
    social_insurance: row.social_insurance ?? "",
    note: row.note ?? "",
  };
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function CompensationPage() {
  const { t } = useI18n();
  const { data: rows = [], isLoading, isError, error } = useCompensations();
  const updateMutation = useUpdateCompensation();

  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [exportMonth, setExportMonth] = useState(currentMonth);
  const [exporting, setExporting] = useState(false);

  // Đồng bộ draft khi data về; giữ draft đang sửa dở (chỉ seed dòng chưa có).
  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const row of rows) {
        if (!(row.employee_id in next)) next[row.employee_id] = toDraft(row);
      }
      return next;
    });
  }, [rows]);

  const dirtyIds = useMemo(() => {
    const ids = new Set<number>();
    for (const row of rows) {
      const draft = drafts[row.employee_id];
      if (draft && isDirty(draft, row)) ids.add(row.employee_id);
    }
    return ids;
  }, [rows, drafts]);

  const setField = (employeeId: number, field: keyof Draft, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [employeeId]: { ...prev[employeeId], [field]: value },
    }));
  };

  const saveRow = async (employeeId: number) => {
    const draft = drafts[employeeId];
    if (!draft) return;
    setSavingId(employeeId);
    try {
      const saved = await updateMutation.mutateAsync({
        employeeId,
        payload: {
          base_salary: draft.base_salary || null,
          standard_workdays: draft.standard_workdays || "26",
          attendance_bonus: draft.attendance_bonus || "0",
          responsibility_allowance: draft.responsibility_allowance || "0",
          kpi_rate: draft.kpi_rate || null,
          lunch_per_meal: draft.lunch_per_meal || "0",
          other_allowance: draft.other_allowance || "0",
          social_insurance: draft.social_insurance || null,
          note: draft.note,
        },
      });
      // Seed lại draft theo bản ghi server trả về (số đã chuẩn hoá) — ô nhập hiển thị
      // đúng cái đã lưu và dòng hết trạng thái "chưa lưu".
      setDrafts((prev) => ({ ...prev, [employeeId]: toDraft(saved) }));
      toast.success(t("hr.comp.toast.saved", "Đã lưu cơ chế lương."));
    } catch (err) {
      toast.error(
        getApiErrorMessage(err, t("hr.comp.toast.saveError", "Lưu cơ chế lương thất bại.")),
      );
    } finally {
      setSavingId(null);
    }
  };

  const handleExport = async () => {
    if (!exportMonth || exporting) return;
    setExporting(true);
    try {
      const blob = await downloadPayrollExport(exportMonth);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bang-luong-${exportMonth}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(
        getApiErrorMessage(err, t("hr.comp.toast.exportError", "Xuất bảng lương thất bại.")),
      );
    } finally {
      setExporting(false);
    }
  };

  const headerClass = "h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground";

  const numberField = (row: CompensationRow, field: keyof Draft, width = "w-[110px]") => (
    <Input
      type="number"
      className={`h-8 ${width} text-right`}
      value={drafts[row.employee_id]?.[field] ?? ""}
      onChange={(e) => setField(row.employee_id, field, e.target.value)}
    />
  );

  const toolbar = (
    <div className="flex w-full flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">
        {t(
          "hr.comp.hint",
          "Sửa lương cơ bản tại đây sẽ ghi vào lịch sử lương của nhân sự. Số công/bữa trưa tự tính từ chấm công khi xuất.",
        )}
      </span>
      <div className="ml-auto flex items-center gap-2">
        <Input
          type="month"
          className="w-[160px]"
          value={exportMonth}
          onChange={(e) => setExportMonth(e.target.value)}
          aria-label={t("hr.comp.export.month", "Tháng xuất bảng lương")}
        />
        <Button onClick={handleExport} disabled={exporting}>
          {exporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {t("hr.comp.export.button", "Xuất bảng lương")}
        </Button>
      </div>
    </div>
  );

  return (
    <DataTableShell loading={isLoading && rows.length === 0} toolbar={toolbar}>
      <div className="overflow-x-auto">
        <Table className="min-w-[1180px] [&_td]:px-2 [&_th]:px-2">
          <TableHeader>
            <TableRow>
              <TableHead className={headerClass}>{t("hr.comp.col.code", "Mã NV")}</TableHead>
              {/* Họ tên dính trái khi cuộn ngang (Mã NV cuộn dưới) — cột định danh. */}
              <TableHead className={`${headerClass} sticky-col sticky-col-edge`}>
                {t("hr.comp.col.name", "Họ tên")}
              </TableHead>
              <TableHead className={headerClass}>{t("hr.comp.col.dept", "Phòng ban")}</TableHead>
              <TableHead className={`${headerClass} text-right`}>
                {t("hr.comp.col.baseSalary", "Lương cơ bản")}
              </TableHead>
              <TableHead className={headerClass}>
                {t("hr.comp.col.standard", "Công chuẩn")}
              </TableHead>
              <TableHead className={headerClass}>
                {t("hr.comp.col.attendanceBonus", "Chuyên cần")}
              </TableHead>
              <TableHead className={headerClass}>
                {t("hr.comp.col.responsibility", "PC trách nhiệm")}
              </TableHead>
              <TableHead className={headerClass}>{t("hr.comp.col.kpi", "Tỉ lệ KPI")}</TableHead>
              <TableHead className={headerClass}>{t("hr.comp.col.lunch", "Ăn trưa/bữa")}</TableHead>
              <TableHead className={headerClass}>{t("hr.comp.col.other", "PC khác")}</TableHead>
              <TableHead className={headerClass}>{t("hr.comp.col.insurance", "BHXH")}</TableHead>
              <TableHead className={headerClass}>{t("hr.comp.col.note", "Ghi chú")}</TableHead>
              <TableHead className={headerClass} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.employee_id}>
                <TableCell className="whitespace-nowrap">{row.employee_code}</TableCell>
                <TableCell className="sticky-col sticky-col-edge whitespace-nowrap font-medium">
                  {row.full_name}
                </TableCell>
                <TableCell className="whitespace-nowrap">{row.department || "—"}</TableCell>
                <TableCell>{numberField(row, "base_salary", "w-[120px]")}</TableCell>
                <TableCell>{numberField(row, "standard_workdays", "w-[80px]")}</TableCell>
                <TableCell>{numberField(row, "attendance_bonus")}</TableCell>
                <TableCell>{numberField(row, "responsibility_allowance")}</TableCell>
                <TableCell>{numberField(row, "kpi_rate", "w-[90px]")}</TableCell>
                <TableCell>{numberField(row, "lunch_per_meal", "w-[90px]")}</TableCell>
                <TableCell>{numberField(row, "other_allowance")}</TableCell>
                <TableCell>{numberField(row, "social_insurance")}</TableCell>
                <TableCell>
                  <Input
                    className="h-8 w-[160px]"
                    value={drafts[row.employee_id]?.note ?? ""}
                    onChange={(e) => setField(row.employee_id, "note", e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!dirtyIds.has(row.employee_id) || savingId === row.employee_id}
                    onClick={() => saveRow(row.employee_id)}
                  >
                    {savingId === row.employee_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                {/* Lỗi tải (403 thiếu quyền / mạng) KHÔNG được hiện thành "Chưa có nhân sự"
                    — người dùng sẽ tưởng dữ liệu rỗng. */}
                <TableCell
                  colSpan={13}
                  className={`py-8 text-center ${isError ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {isError
                    ? getApiErrorMessage(
                        error,
                        t("hr.comp.loadError", "Không tải được cơ chế lương."),
                      )
                    : t("hr.comp.empty", "Chưa có nhân sự.")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </DataTableShell>
  );
}
