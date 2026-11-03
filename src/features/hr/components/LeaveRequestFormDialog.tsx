import { useEffect, useState } from "react";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormDialogShell, FormGrid } from "@/components/ui/form-dialog-content";
import { useI18n } from "@/i18n";

import type { LeaveCreatePayload, LeaveTypeKey } from "../hr-types";

const LEAVE_TYPES: LeaveTypeKey[] = ["annual", "sick", "unpaid", "other"];

const LEAVE_TYPE_FALLBACK: Record<LeaveTypeKey, string> = {
  annual: "Phép năm",
  sick: "Nghỉ ốm",
  unpaid: "Không lương",
  other: "Khác",
};

interface LeaveRequestFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onSubmit: (payload: LeaveCreatePayload) => void;
}

export function LeaveRequestFormDialog({
  open,
  onOpenChange,
  isPending,
  onSubmit,
}: LeaveRequestFormDialogProps) {
  const { t } = useI18n();
  const labelClass = "mb-1 block text-sm font-medium text-muted-foreground";

  const [employeeId, setEmployeeId] = useState("");
  const [leaveType, setLeaveType] = useState<LeaveTypeKey>("annual");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setEmployeeId("");
    setLeaveType("annual");
    setStartDate("");
    setEndDate("");
    setReason("");
    setError("");
  }, [open]);

  const typeLabel = (key: LeaveTypeKey) => t(`hr.leave.type.${key}`, LEAVE_TYPE_FALLBACK[key]);

  const handleSubmit = () => {
    if (isPending) return;
    const empId = Number(employeeId.trim());
    if (!employeeId.trim() || !Number.isFinite(empId) || empId <= 0) {
      setError(t("hr.leave.errors.employeeRequired", "Vui lòng nhập mã nhân viên."));
      return;
    }
    if (!startDate || !endDate) {
      setError(t("hr.leave.errors.dateRequired", "Vui lòng chọn ngày bắt đầu và kết thúc."));
      return;
    }
    onSubmit({
      employee_id: empId,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      reason: reason.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogShell
        title={t("hr.leave.create.title", "Tạo đơn nghỉ phép")}
        description={t("hr.leave.create.description", "Nhập thông tin đơn nghỉ phép.")}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel", "Hủy")}
            </Button>
            <Button type="button" disabled={isPending} onClick={handleSubmit}>
              {isPending ? t("common.saving", "Đang lưu...") : t("common.create", "Tạo")}
            </Button>
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <FormGrid>
            <div>
              <label htmlFor="leave-employee" className={labelClass}>
                {t("hr.leave.field.employee", "Nhân viên (ID)")}
              </label>
              <Input
                id="leave-employee"
                type="number"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="leave-type" className={labelClass}>
                {t("hr.leave.field.type", "Loại nghỉ")}
              </label>
              <Select value={leaveType} onValueChange={(v) => setLeaveType(v as LeaveTypeKey)}>
                <SelectTrigger id="leave-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPES.map((key) => (
                    <SelectItem key={key} value={key}>
                      {typeLabel(key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="leave-start" className={labelClass}>
                {t("hr.leave.field.startDate", "Từ ngày")}
              </label>
              <Input
                id="leave-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="leave-end" className={labelClass}>
                {t("hr.leave.field.endDate", "Đến ngày")}
              </label>
              <Input
                id="leave-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="leave-reason" className={labelClass}>
                {t("hr.leave.field.reason", "Lý do")}
              </label>
              <Input id="leave-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          </FormGrid>
          {error && <p className="mt-3 text-xs text-action-danger">{error}</p>}
          <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
        </form>
      </FormDialogShell>
    </Dialog>
  );
}
