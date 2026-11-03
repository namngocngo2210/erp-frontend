import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DataTableShell } from "@/components/ui/data-table-shell";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PaginationPages } from "@/components/ui/pagination";
import { ResponsiveList } from "@/components/ui/responsive-list";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/i18n";

import { EmployeeCard } from "../components/EmployeeCard";
import { EmployeeFormDialog } from "../components/EmployeeFormDialog";
import { EmployeesTable } from "../components/EmployeesTable";
import {
  getStoredEmployeeFilters,
  HR_FILTER_ALL,
  setStoredEmployeeFilters,
} from "../hr-employees-storage";
import type { Employee, EmployeeCreatePayload, EmploymentState } from "../hr-types";
import { useCreateEmployee, useEmployees, useHrDepartments, useResignEmployee } from "../queries";

const PAGE_SIZE = 50;
const STATE_ALL = HR_FILTER_ALL;
type StateFilter = typeof STATE_ALL | EmploymentState;

export default function EmployeesPage() {
  const { t } = useI18n();

  const [q, setQ] = useState("");
  const [stateFilter, setStateFilter] = useState<StateFilter>(
    () => getStoredEmployeeFilters().state as StateFilter,
  );
  const [departmentFilter, setDepartmentFilter] = useState<string>(
    () => getStoredEmployeeFilters().department,
  );
  const [offset, setOffset] = useState(0);

  // Nhớ bộ lọc qua các lần vào trang (không lưu ô tìm kiếm — chỉ dropdown).
  useEffect(() => {
    setStoredEmployeeFilters({ department: departmentFilter, state: stateFilter });
  }, [departmentFilter, stateFilter]);

  const { data: departments } = useHrDepartments();

  const params = useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset,
      q: q.trim() || undefined,
      state: stateFilter === STATE_ALL ? undefined : stateFilter,
      department: departmentFilter === STATE_ALL ? undefined : Number(departmentFilter),
    }),
    [offset, q, stateFilter, departmentFilter],
  );
  const { data, isLoading } = useEmployees(params);

  const employees = data?.items ?? [];
  const total = data?.total ?? 0;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const createMutation = useCreateEmployee();
  const resignMutation = useResignEmployee();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [resigning, setResigning] = useState<Employee | null>(null);

  const openCreate = () => {
    createMutation.reset();
    setDialogOpen(true);
  };

  const handleSearchChange = (value: string) => {
    setQ(value);
    setOffset(0);
  };

  const handleStateChange = (value: string) => {
    setStateFilter(value as StateFilter);
    setOffset(0);
  };

  const handleDepartmentChange = (value: string) => {
    setDepartmentFilter(value);
    setOffset(0);
  };

  const handleSubmit = (payload: Partial<EmployeeCreatePayload>) => {
    createMutation.mutate(payload as EmployeeCreatePayload, {
      onSuccess: () => {
        toast.success(t("hr.toast.created", "Đã tạo nhân viên."));
        setDialogOpen(false);
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : t("hr.toast.saveFailed", "Lưu thất bại.")),
    });
  };

  const handleResign = () => {
    if (!resigning) return;
    resignMutation.mutate(resigning.id, {
      onSuccess: () => {
        toast.success(t("hr.toast.resigned", "Đã cho dừng làm việc."));
        setResigning(null);
      },
      onError: (err) =>
        toast.error(
          err instanceof Error ? err.message : t("hr.toast.resignFailed", "Thao tác thất bại."),
        ),
    });
  };

  const toolbar = (
    <div className="flex w-full flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1 md:max-w-72">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("hr.search.placeholder", "Tìm theo tên, mã NV...")}
          value={q}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-8"
        />
      </div>
      <Select value={departmentFilter} onValueChange={handleDepartmentChange}>
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder={t("hr.filter.allDepartments", "Tất cả phòng ban")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={STATE_ALL}>
            {t("hr.filter.allDepartments", "Tất cả phòng ban")}
          </SelectItem>
          {(departments ?? []).map((d) => (
            <SelectItem key={d.id} value={String(d.id)}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={stateFilter} onValueChange={handleStateChange}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder={t("hr.filter.allStates", "Tất cả tình trạng")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={STATE_ALL}>{t("hr.filter.allStates", "Tất cả tình trạng")}</SelectItem>
          <SelectItem value="working">{t("hr.filter.working", "Đang làm việc")}</SelectItem>
          <SelectItem value="resigned">{t("hr.filter.resigned", "Đã nghỉ việc")}</SelectItem>
        </SelectContent>
      </Select>
      <Button
        className="ml-auto bg-primary text-primary-foreground hover:bg-primary/90"
        onClick={openCreate}
      >
        <Plus className="mr-2 h-4 w-4" />
        {t("hr.actions.create", "Thêm nhân viên")}
      </Button>
    </div>
  );

  return (
    <>
      <DataTableShell loading={isLoading && employees.length === 0} toolbar={toolbar}>
        <ResponsiveList
          items={employees}
          getKey={(e) => e.id}
          table={
            <EmployeesTable employees={employees} loading={isLoading} onResign={setResigning} />
          }
          renderCard={(e) => <EmployeeCard employee={e} onResign={setResigning} />}
          loading={isLoading}
          loadingText={t("common.loading", "Đang tải...")}
          emptyText={t("hr.list.empty", "Chưa có nhân viên nào.")}
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

      <EmployeeFormDialog
        mode="create"
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employee={null}
        isPending={createMutation.isPending}
        submitError={(createMutation.error as Error | null)?.message}
        onSubmit={handleSubmit}
      />

      <Dialog open={!!resigning} onOpenChange={(open) => !open && setResigning(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("hr.confirm.resign.title", "Dừng làm việc")}</DialogTitle>
            <DialogDescription>
              {t(
                "hr.confirm.resign.message",
                'Cho nhân viên "{name}" dừng làm việc? Các tài khoản đăng nhập liên kết sẽ bị vô hiệu hoá.',
              ).replace("{name}", resigning?.full_name ?? "")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResigning(null)}>
              {t("common.cancel", "Hủy")}
            </Button>
            <Button
              variant="destructive"
              disabled={resignMutation.isPending}
              onClick={handleResign}
            >
              {t("hr.actions.resign", "Dừng làm việc")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
