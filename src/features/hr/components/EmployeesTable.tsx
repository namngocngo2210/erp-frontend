import { UserX } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/i18n";

import type { Employee, EmploymentStatus } from "../hr-types";

interface EmployeesTableProps {
  employees: Employee[];
  loading: boolean;
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

const COLUMN_COUNT = 6;

export function EmployeesTable({ employees, loading, onResign }: EmployeesTableProps) {
  const { t } = useI18n();
  const navigate = useNavigate();

  const headerClass = "h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground";

  return (
    <Table className="min-w-[720px] [&_td]:px-3 [&_th]:px-3">
      <TableHeader>
        <TableRow>
          <TableHead className={headerClass}>{t("hr.columns.code", "Mã NV")}</TableHead>
          <TableHead className={headerClass}>{t("hr.columns.fullName", "Họ tên")}</TableHead>
          <TableHead className={headerClass}>{t("hr.columns.department", "Phòng ban")}</TableHead>
          <TableHead className={headerClass}>{t("hr.columns.jobTitle", "Chức danh")}</TableHead>
          <TableHead className={headerClass}>{t("hr.columns.status", "Trạng thái")}</TableHead>
          <TableHead className={`${headerClass} text-right`}>
            {t("common.actions", "Hành động")}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading && employees.length === 0 ? (
          <TableRow>
            <TableCell colSpan={COLUMN_COUNT} className="py-8 text-center">
              <LogoSpinner label={t("common.loading", "Đang tải...")} className="mx-auto" />
            </TableCell>
          </TableRow>
        ) : employees.length === 0 ? (
          <TableRow>
            <TableCell colSpan={COLUMN_COUNT} className="py-8 text-center text-muted-foreground">
              {t("hr.list.empty", "Chưa có nhân viên nào.")}
            </TableCell>
          </TableRow>
        ) : (
          employees.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell className="font-medium text-foreground">
                {employee.employee_code}
              </TableCell>
              <TableCell className="font-medium">
                <button
                  type="button"
                  className="text-left text-primary hover:underline"
                  onClick={() => navigate(`/hr/employees/${employee.id}`)}
                >
                  {employee.full_name}
                </button>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {employee.department_name || "-"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {employee.job_title_display || "-"}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[employee.employment_status ?? "probation"]}>
                  {t(
                    `hr.status.${employee.employment_status ?? "probation"}`,
                    STATUS_FALLBACK[employee.employment_status ?? "probation"],
                  )}
                </Badge>
              </TableCell>
              <TableCell className="whitespace-nowrap text-right">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={employee.employment_status === "resigned"}
                  className="border-border bg-background text-destructive hover:bg-accent hover:text-destructive-foreground"
                  onClick={() => onResign(employee)}
                >
                  <UserX className="mr-1.5 h-4 w-4" />
                  {t("hr.actions.resign", "Dừng làm việc")}
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
