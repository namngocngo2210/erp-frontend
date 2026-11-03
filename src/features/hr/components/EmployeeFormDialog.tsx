import { useEffect, useState } from "react";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormDialogShell, FormGrid } from "@/components/ui/form-dialog-content";
import { useI18n } from "@/i18n";

import type { Employee, EmployeeCreatePayload, PositionKey } from "../hr-types";
import { POSITION_LABELS, POSITION_OPTIONS } from "../hr-types";
import { useHrDepartments } from "../queries";

type FormState = {
  full_name: string;
  username: string;
  employee_code: string;
  department_id: string;
  job_title: string;
  phone: string;
  personal_email: string;
  create_login: boolean;
  password: string;
};

const EMPTY_FORM: FormState = {
  full_name: "",
  username: "",
  employee_code: "",
  department_id: "",
  job_title: "",
  phone: "",
  personal_email: "",
  create_login: false,
  password: "",
};

function coerceJobTitle(value: string): string {
  // Legacy employees may carry free-text job titles (e.g. "Sale") that are not
  // one of the allowed choices; drop them so the Select shows the placeholder
  // and a stray legacy value is never resubmitted.
  return (POSITION_OPTIONS as string[]).includes(value) ? value : "";
}

function toFormState(employee: Employee): FormState {
  return {
    full_name: employee.full_name,
    username: employee.username,
    employee_code: employee.employee_code ?? "",
    department_id: employee.department != null ? String(employee.department) : "",
    job_title: coerceJobTitle(employee.job_title ?? ""),
    phone: employee.phone ?? "",
    personal_email: employee.personal_email ?? "",
    create_login: false,
    password: "",
  };
}

interface EmployeeFormDialogProps {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee | null;
  isPending: boolean;
  submitError?: string;
  onSubmit: (payload: Partial<EmployeeCreatePayload>) => void;
}

export function EmployeeFormDialog({
  mode,
  open,
  onOpenChange,
  employee,
  isPending,
  submitError,
  onSubmit,
}: EmployeeFormDialogProps) {
  const { t } = useI18n();
  const isCreate = mode === "create";
  const idPrefix = `employee-${mode}`;
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState("");
  const { data: departments = [] } = useHrDepartments(open);

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm(isCreate || !employee ? EMPTY_FORM : toFormState(employee));
  }, [open, isCreate, employee]);

  const labelClass = "mb-1 block text-sm font-medium text-muted-foreground";

  const handleSubmit = () => {
    if (isPending) return;
    const fullName = form.full_name.trim();
    if (!fullName) {
      setError(t("hr.form.errors.fullNameRequired", "Vui lòng nhập họ tên."));
      return;
    }
    if (isCreate && !form.username.trim()) {
      setError(t("hr.form.errors.usernameRequired", "Vui lòng nhập tên đăng nhập."));
      return;
    }

    const departmentId = form.department_id.trim();
    const payload: Partial<EmployeeCreatePayload> = {
      full_name: fullName,
      employee_code: form.employee_code.trim(),
      department_id: departmentId ? Number(departmentId) : null,
      job_title: form.job_title.trim(),
      phone: form.phone.trim(),
      personal_email: form.personal_email.trim(),
    };
    if (isCreate) {
      payload.username = form.username.trim();
      payload.create_login = form.create_login;
      if (form.create_login) payload.password = form.password;
    }
    onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogShell
        title={
          isCreate ? t("hr.create.title", "Thêm nhân viên") : t("hr.edit.title", "Sửa nhân viên")
        }
        description={
          isCreate
            ? t("hr.create.description", "Nhập thông tin nhân viên cần tạo.")
            : t("hr.edit.description", "Cập nhật thông tin nhân viên.")
        }
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel", "Hủy")}
            </Button>
            <Button type="button" disabled={isPending} onClick={handleSubmit}>
              {isPending
                ? t("common.saving", "Đang lưu...")
                : isCreate
                  ? t("common.create", "Tạo")
                  : t("common.update", "Cập nhật")}
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
              <label htmlFor={`${idPrefix}-full-name`} className={labelClass}>
                {t("hr.form.fullName", "Họ tên")}
              </label>
              <Input
                id={`${idPrefix}-full-name`}
                value={form.full_name}
                onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
              />
            </div>
            {isCreate && (
              <div>
                <label htmlFor={`${idPrefix}-username`} className={labelClass}>
                  {t("hr.form.username", "Tên đăng nhập")}
                </label>
                <Input
                  id={`${idPrefix}-username`}
                  value={form.username}
                  onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                />
              </div>
            )}
            <div>
              <label htmlFor={`${idPrefix}-code`} className={labelClass}>
                {t("hr.form.code", "Mã nhân viên")}
              </label>
              <Input
                id={`${idPrefix}-code`}
                value={form.employee_code}
                placeholder={isCreate ? t("hr.form.codeAutohint", "Để trống = tự sinh") : undefined}
                onChange={(e) => setForm((prev) => ({ ...prev, employee_code: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor={`${idPrefix}-department`} className={labelClass}>
                {t("hr.form.department", "Phòng ban")}
              </label>
              <Select
                value={form.department_id || "__none__"}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    department_id: value === "__none__" ? "" : value,
                  }))
                }
              >
                <SelectTrigger id={`${idPrefix}-department`}>
                  <SelectValue placeholder={t("hr.form.noDepartment", "-- Chọn --")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    {t("hr.form.noDepartment", "-- Chọn --")}
                  </SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor={`${idPrefix}-job-title`} className={labelClass}>
                {t("hr.form.position", "Chức vụ")}
              </label>
              <Select
                value={form.job_title || "__none__"}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    job_title: value === "__none__" ? "" : value,
                  }))
                }
              >
                <SelectTrigger id={`${idPrefix}-job-title`}>
                  <SelectValue placeholder={t("hr.form.selectPosition", "-- Chọn --")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    {t("hr.form.selectPosition", "-- Chọn --")}
                  </SelectItem>
                  {POSITION_OPTIONS.map((key: PositionKey) => (
                    <SelectItem key={key} value={key}>
                      {POSITION_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor={`${idPrefix}-phone`} className={labelClass}>
                {t("hr.form.phone", "Số điện thoại")}
              </label>
              <Input
                id={`${idPrefix}-phone`}
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor={`${idPrefix}-email`} className={labelClass}>
                {t("hr.form.personalEmail", "Email cá nhân")}
              </label>
              <Input
                id={`${idPrefix}-email`}
                type="email"
                value={form.personal_email}
                onChange={(e) => setForm((prev) => ({ ...prev, personal_email: e.target.value }))}
              />
            </div>
            {isCreate && (
              <>
                <div className="flex items-center gap-3 self-end">
                  <Switch
                    id={`${idPrefix}-create-login`}
                    checked={form.create_login}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({ ...prev, create_login: checked }))
                    }
                  />
                  <label
                    htmlFor={`${idPrefix}-create-login`}
                    className="text-sm font-medium text-muted-foreground"
                  >
                    {t("hr.form.createLogin", "Tạo tài khoản đăng nhập")}
                  </label>
                </div>
                {form.create_login && (
                  <div>
                    <label htmlFor={`${idPrefix}-password`} className={labelClass}>
                      {t("hr.form.password", "Mật khẩu")}
                    </label>
                    <Input
                      id={`${idPrefix}-password`}
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                    />
                  </div>
                )}
              </>
            )}
          </FormGrid>
          {(error || submitError) && (
            <p className="mt-3 text-xs text-action-danger">{error || submitError}</p>
          )}
          <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
        </form>
      </FormDialogShell>
    </Dialog>
  );
}
