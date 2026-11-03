import { UserX } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";

import type { Employee, EmploymentStatus } from "../hr-types";

interface EmployeeCardProps {
  employee: Employee;
  onResign: (employee: Employee) => void;
}

const STATUS_VARIANT: Record<EmploymentStatus, "default" | "secondary" | "outline"> = {
  active: "default",
  probation: "outline",
  on_leave: "secondary",
  resigned: "secondary",
};

const STATUS_FALLBACK: Record<EmploymentStatus, string> = {
  active: "Đang làm",
  probation: "Thử việc",
  on_leave: "Nghỉ phép",
  resigned: "Đã nghỉ",
};

export function EmployeeCard({ employee, onResign }: EmployeeCardProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const resigned = employee.employment_status === "resigned";

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <button
            type="button"
            className="text-left text-sm font-semibold text-foreground hover:underline"
            onClick={() => navigate(`/hr/employees/${employee.id}`)}
          >
            {employee.full_name}
          </button>
          <p className="text-xs text-muted-foreground">{employee.employee_code}</p>
        </div>
        <Badge variant={STATUS_VARIANT[employee.employment_status ?? "probation"]}>
          {t(
            `hr.status.${employee.employment_status ?? "probation"}`,
            STATUS_FALLBACK[employee.employment_status ?? "probation"],
          )}
        </Badge>
      </div>

      <dl className="mt-2 space-y-1 text-xs">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{t("hr.columns.department", "Phòng ban")}</dt>
          <dd className="text-right">{employee.department_name || "-"}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{t("hr.columns.jobTitle", "Chức danh")}</dt>
          <dd className="text-right">{employee.job_title_display || "-"}</dd>
        </div>
      </dl>

      <div className="mt-3 flex justify-end gap-1">
        <Button
          size="sm"
          variant="outline"
          disabled={resigned}
          className="border-border bg-background text-destructive hover:bg-accent hover:text-destructive-foreground"
          onClick={() => onResign(employee)}
        >
          <UserX className="mr-1.5 h-4 w-4" />
          {t("hr.actions.resign", "Dừng làm việc")}
        </Button>
      </div>
    </div>
  );
}
