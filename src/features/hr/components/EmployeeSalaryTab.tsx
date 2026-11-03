import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { ResponsiveList } from "@/components/ui/responsive-list";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { useI18n } from "@/i18n";

import type { SalaryRecord, SalarySetPayload } from "../hr-types";
import { useSalaries, useSetSalary } from "../queries";

interface EmployeeSalaryTabProps {
  employeeId: number;
}

const COLUMN_COUNT = 5;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function EmployeeSalaryTab({ employeeId }: EmployeeSalaryTabProps) {
  const { t } = useI18n();
  const { data: salaries = [], isLoading } = useSalaries(employeeId);
  const setSalary = useSetSalary(employeeId);

  const [amount, setAmount] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(todayIso());
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const headerClass = "h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground";

  const resetForm = () => {
    setAmount("");
    setEffectiveFrom(todayIso());
    setReason("");
    setError("");
  };

  const handleSubmit = () => {
    if (setSalary.isPending) return;
    const numericAmount = Number(amount);
    if (!amount.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError(t("hr.salary.errors.amountRequired", "Vui lòng nhập mức lương hợp lệ."));
      return;
    }
    if (!effectiveFrom) {
      setError(t("hr.salary.errors.effectiveFromRequired", "Vui lòng chọn ngày hiệu lực."));
      return;
    }
    const payload: SalarySetPayload = {
      amount: numericAmount,
      effective_from: effectiveFrom,
      reason: reason.trim() || undefined,
    };
    setSalary.mutate(payload, {
      onSuccess: () => {
        toast.success(t("hr.salary.toast.saved", "Đã cập nhật mức lương."));
        resetForm();
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : t("hr.toast.saveFailed", "Lưu thất bại.")),
    });
  };

  const labelClass = "mb-1 block text-sm font-medium text-muted-foreground";

  return (
    <div className="space-y-6 p-4">
      <form
        className="grid grid-cols-1 gap-3 sm:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <div>
          <label htmlFor="salary-amount" className={labelClass}>
            {t("hr.salary.amount", "Mức lương")}
          </label>
          <Input
            id="salary-amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="salary-effective-from" className={labelClass}>
            {t("hr.salary.effectiveFrom", "Hiệu lực từ")}
          </label>
          <Input
            id="salary-effective-from"
            type="date"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="salary-reason" className={labelClass}>
            {t("hr.salary.reason", "Lý do")}
          </label>
          <Input id="salary-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={setSalary.isPending} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            {setSalary.isPending
              ? t("common.saving", "Đang lưu...")
              : t("hr.salary.add", "Thêm mức lương")}
          </Button>
        </div>
        {error && <p className="text-xs text-action-danger sm:col-span-4">{error}</p>}
      </form>

      <ResponsiveList
        items={salaries}
        getKey={(row: SalaryRecord) => row.id}
        loading={isLoading}
        loadingText={t("common.loading", "Đang tải...")}
        emptyText={t("hr.salary.empty", "Chưa có dữ liệu lương.")}
        renderCard={(row: SalaryRecord) => (
          <div className="rounded-lg border border-border bg-card px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold tabular-nums text-foreground">
                  {formatCurrency(row.amount)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {row.effective_from} → {row.effective_to || "-"}
                </p>
              </div>
              {row.is_current && (
                <Badge variant="default">{t("hr.salary.currentBadge", "Hiện tại")}</Badge>
              )}
            </div>
            {row.reason && (
              <dl className="mt-2 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{t("hr.salary.reason", "Lý do")}</dt>
                  <dd className="text-right">{row.reason}</dd>
                </div>
              </dl>
            )}
          </div>
        )}
        table={
          <Table className="min-w-[640px] [&_td]:px-3 [&_th]:px-3">
            <TableHeader>
              <TableRow>
                <TableHead className={headerClass}>
                  {t("hr.salary.effectiveFrom", "Hiệu lực từ")}
                </TableHead>
                <TableHead className={headerClass}>{t("hr.salary.effectiveTo", "Đến")}</TableHead>
                <TableHead className={`${headerClass} text-right`}>
                  {t("hr.salary.amount", "Mức lương")}
                </TableHead>
                <TableHead className={headerClass}>{t("hr.salary.current", "Hiện tại?")}</TableHead>
                <TableHead className={headerClass}>{t("hr.salary.reason", "Lý do")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && salaries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLUMN_COUNT} className="py-8 text-center">
                    <LogoSpinner label={t("common.loading", "Đang tải...")} className="mx-auto" />
                  </TableCell>
                </TableRow>
              ) : salaries.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={COLUMN_COUNT}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {t("hr.salary.empty", "Chưa có dữ liệu lương.")}
                  </TableCell>
                </TableRow>
              ) : (
                salaries.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.effective_from}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.effective_to || "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(row.amount)}
                    </TableCell>
                    <TableCell>
                      {row.is_current ? (
                        <Badge variant="default">{t("hr.salary.currentBadge", "Hiện tại")}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.reason || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        }
      />
    </div>
  );
}
