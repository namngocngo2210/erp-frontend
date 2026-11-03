import { useMemo } from "react";
import { toast } from "sonner";

import { SearchableSelect } from "@/components/ui/searchable-select";
import { useI18n } from "@/i18n";

import { useDepartmentOrg, useEmployees, useSetDepartmentHead } from "../queries";

const NONE = "__none__";

type Props = {
  departmentId: number;
};

/**
 * Chọn trưởng phòng cho một phòng ban — chỉ nhân sự đang làm việc thuộc phòng đó.
 * Tự nạp dữ liệu qua React Query (dedupe theo key) nên không cần truyền props.
 */
export function DepartmentHeadField({ departmentId }: Props) {
  const { t } = useI18n();
  const { data: org } = useDepartmentOrg();
  const { data: employees } = useEmployees({
    limit: 200,
    offset: 0,
    department: departmentId,
    state: "working",
  });
  const setHead = useSetDepartmentHead();

  const head = org?.find((o) => o.department_id === departmentId)?.head ?? null;

  const options = useMemo(() => {
    const list = (employees?.items ?? []).map((e) => ({
      value: String(e.id),
      label: `${e.full_name} (${e.employee_code})`,
    }));
    return [{ value: NONE, label: t("departments.head.none", "— Chưa gán —") }, ...list];
  }, [employees, t]);

  const handleChange = (value: string) => {
    const employeeId = value === NONE ? null : Number(value);
    setHead.mutate(
      { departmentId, employeeId },
      {
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : t("hr.toast.saveFailed", "Lưu thất bại."),
          ),
      },
    );
  };

  return (
    <SearchableSelect
      options={options}
      value={head ? String(head.id) : NONE}
      onChange={handleChange}
      placeholder={t("departments.head.placeholder", "Chọn trưởng phòng")}
      selectedLabel={head ? `${head.full_name} (${head.employee_code})` : undefined}
    />
  );
}
