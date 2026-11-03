import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { Tabs } from "@/components/ui/tabs";
import { useI18n } from "@/i18n";

import { EmployeeContractsTab } from "../components/EmployeeContractsTab";
import { EmployeeProfileForm } from "../components/EmployeeProfileForm";
import { EmployeeSalaryTab } from "../components/EmployeeSalaryTab";
import { useEmployee } from "../queries";

export default function EmployeeDetailPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { id } = useParams();
  const employeeId = Number(id);
  const { data: employee, isLoading } = useEmployee(employeeId);
  const [active, setActive] = useState("info");

  const tabs = [
    {
      key: "info",
      label: t("hr.detail.tabs.info", "Thông tin"),
      content: employee ? (
        <EmployeeProfileForm employee={employee} />
      ) : isLoading ? (
        <div className="flex justify-center py-12">
          <LogoSpinner label={t("common.loading", "Đang tải...")} />
        </div>
      ) : (
        <div className="p-8 text-center text-muted-foreground">
          {t("hr.detail.notFound", "Không tìm thấy nhân viên.")}
        </div>
      ),
    },
    {
      key: "contracts",
      label: t("hr.detail.tabs.contracts", "Hợp đồng"),
      content: <EmployeeContractsTab employeeId={employeeId} />,
    },
    {
      key: "salary",
      label: t("hr.detail.tabs.salary", "Lương"),
      content: <EmployeeSalaryTab employeeId={employeeId} />,
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={t("common.back", "Quay lại")}
          onClick={() => navigate("/hr/employees")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            {employee?.full_name ?? t("hr.detail.title", "Chi tiết nhân viên")}
          </h1>
          {employee?.employee_code && (
            <p className="text-sm text-muted-foreground">{employee.employee_code}</p>
          )}
        </div>
      </div>

      <Card className="min-h-0 flex-1 overflow-hidden">
        <CardContent className="h-full min-h-0 p-0">
          <Tabs tabs={tabs} active={active} onChange={setActive} className="h-full" />
        </CardContent>
      </Card>
    </div>
  );
}
