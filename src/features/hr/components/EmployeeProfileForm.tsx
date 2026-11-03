import { useEffect, useState } from "react";
import { Link2, Save, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/i18n";

import {
  MARITAL_STATUS_LABELS,
  POSITION_LEVEL_LABELS,
  WORK_TYPE_LABELS,
  type Employee,
  type EmployeeAccount,
  type EmployeeUpdatePayload,
} from "../hr-types";
import {
  useHrDepartments,
  useUpdateEmployee,
  useAddEmployeeAccount,
  useUnlinkEmployeeAccount,
  useLinkEmployeeAccount,
} from "../queries";
import type { CreateAdminUserPayload } from "@/lib/api/users";
import { EmployeeAccountCreateDialog } from "./EmployeeAccountCreateDialog";
import { EmployeeAccountAssignDialog } from "./EmployeeAccountAssignDialog";

const NONE = "__none__";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "active", label: "Đang làm" },
  { value: "probation", label: "Thử việc" },
  { value: "on_leave", label: "Nghỉ phép" },
  { value: "resigned", label: "Đã nghỉ" },
];

const GENDER_OPTIONS: { value: string; label: string }[] = [
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
  { value: "other", label: "Khác" },
];

// Các field nằm trong form (ánh xạ trực tiếp tên field model).
type FormState = {
  full_name: string;
  department_id: string;
  position_level: string;
  position_title: string;
  work_type: string;
  lark_account: string;
  employment_status: string;
  hire_date: string;
  official_date: string;
  resign_date: string;
  resign_reason: string;
  phone: string;
  personal_email: string;
  dob: string;
  gender: string;
  marital_status: string;
  id_number: string;
  id_issued_date: string;
  id_issued_place: string;
  permanent_address: string;
  address: string;
  education_level: string;
  major: string;
  school: string;
  tax_code: string;
  social_insurance_no: string;
  bank_account_no: string;
  bank_name: string;
  emergency_contact_name: string;
  emergency_contact_relation: string;
  emergency_contact_phone: string;
  emergency_contact_address: string;
  facebook_url: string;
  vehicle_info: string;
};

function toState(e: Employee): FormState {
  return {
    full_name: e.full_name ?? "",
    department_id: e.department != null ? String(e.department) : "",
    position_level: e.position_level ?? "",
    position_title: e.position_title ?? "",
    work_type: e.work_type ?? "",
    lark_account: e.lark_account ?? "",
    employment_status: e.employment_status ?? "probation",
    hire_date: e.hire_date ?? "",
    official_date: e.official_date ?? "",
    resign_date: e.resign_date ?? "",
    resign_reason: e.resign_reason ?? "",
    phone: e.phone ?? "",
    personal_email: e.personal_email ?? "",
    dob: e.dob ?? "",
    gender: e.gender ?? "",
    marital_status: e.marital_status ?? "",
    id_number: e.id_number ?? "",
    id_issued_date: e.id_issued_date ?? "",
    id_issued_place: e.id_issued_place ?? "",
    permanent_address: e.permanent_address ?? "",
    address: e.address ?? "",
    education_level: e.education_level ?? "",
    major: e.major ?? "",
    school: e.school ?? "",
    tax_code: e.tax_code ?? "",
    social_insurance_no: e.social_insurance_no ?? "",
    bank_account_no: e.bank_account_no ?? "",
    bank_name: e.bank_name ?? "",
    emergency_contact_name: e.emergency_contact_name ?? "",
    emergency_contact_relation: e.emergency_contact_relation ?? "",
    emergency_contact_phone: e.emergency_contact_phone ?? "",
    emergency_contact_address: e.emergency_contact_address ?? "",
    facebook_url: e.facebook_url ?? "",
    vehicle_info: e.vehicle_info ?? "",
  };
}

function toPayload(f: FormState): EmployeeUpdatePayload {
  const date = (v: string) => (v ? v : null);
  return {
    full_name: f.full_name.trim(),
    department_id: f.department_id ? Number(f.department_id) : null,
    position_level: f.position_level as EmployeeUpdatePayload["position_level"],
    position_title: f.position_title.trim(),
    work_type: f.work_type as EmployeeUpdatePayload["work_type"],
    lark_account: f.lark_account.trim(),
    employment_status: f.employment_status as EmployeeUpdatePayload["employment_status"],
    hire_date: date(f.hire_date),
    official_date: date(f.official_date),
    resign_date: date(f.resign_date),
    resign_reason: f.resign_reason.trim(),
    phone: f.phone.trim(),
    personal_email: f.personal_email.trim(),
    dob: date(f.dob),
    gender: f.gender,
    marital_status: f.marital_status as EmployeeUpdatePayload["marital_status"],
    id_number: f.id_number.trim(),
    id_issued_date: date(f.id_issued_date),
    id_issued_place: f.id_issued_place.trim(),
    permanent_address: f.permanent_address.trim(),
    address: f.address.trim(),
    education_level: f.education_level.trim(),
    major: f.major.trim(),
    school: f.school.trim(),
    tax_code: f.tax_code.trim(),
    social_insurance_no: f.social_insurance_no.trim(),
    bank_account_no: f.bank_account_no.trim(),
    bank_name: f.bank_name.trim(),
    emergency_contact_name: f.emergency_contact_name.trim(),
    emergency_contact_relation: f.emergency_contact_relation.trim(),
    emergency_contact_phone: f.emergency_contact_phone.trim(),
    emergency_contact_address: f.emergency_contact_address.trim(),
    facebook_url: f.facebook_url.trim(),
    vehicle_info: f.vehicle_info.trim(),
  };
}

const labelClass = "mb-1 block text-sm font-medium text-muted-foreground";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className={labelClass}>{label}</span>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-primary">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export function EmployeeProfileForm({ employee }: { employee: Employee }) {
  const { t } = useI18n();
  const [form, setForm] = useState<FormState>(() => toState(employee));
  const { data: departments = [] } = useHrDepartments(true);
  const updateMutation = useUpdateEmployee();
  const addAccount = useAddEmployeeAccount(employee.id);
  const unlinkAccount = useUnlinkEmployeeAccount(employee.id);
  const linkAccount = useLinkEmployeeAccount(employee.id);
  const [openAddAccount, setOpenAddAccount] = useState(false);
  const [openAssignAccount, setOpenAssignAccount] = useState(false);
  const [accountToRemove, setAccountToRemove] = useState<EmployeeAccount | null>(null);

  const handleAddAccount = async (payload: CreateAdminUserPayload) => {
    try {
      await addAccount.mutateAsync(payload);
      toast.success(t("hr.account.added", "Đã thêm tài khoản."));
    } catch {
      toast.error(t("hr.account.addFailed", "Thêm tài khoản thất bại."));
    }
  };

  const handleAssignAccount = async (userId: number) => {
    try {
      await linkAccount.mutateAsync(userId);
      toast.success(t("hr.account.assigned", "Đã gán tài khoản."));
    } catch {
      toast.error(t("hr.account.assignFailed", "Gán tài khoản thất bại."));
    }
  };

  const handleConfirmRemove = async () => {
    if (!accountToRemove) return;
    try {
      await unlinkAccount.mutateAsync(accountToRemove.account_id);
      toast.success(t("hr.account.removed", "Đã gỡ tài khoản."));
    } catch {
      toast.error(t("hr.account.removeFailed", "Gỡ tài khoản thất bại."));
    } finally {
      setAccountToRemove(null);
    }
  };

  useEffect(() => {
    setForm(toState(employee));
  }, [employee]);

  const set = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const text = (key: keyof FormState, label: string, type = "text") => (
    <Field label={label}>
      <Input type={type} value={form[key]} onChange={(e) => set(key, e.target.value)} />
    </Field>
  );

  const date = (key: keyof FormState, label: string) => text(key, label, "date");

  const optionSelect = (
    key: keyof FormState,
    label: string,
    options: { value: string; label: string }[],
    allowNone = true,
  ) => (
    <Field label={label}>
      <Select
        value={form[key] || (allowNone ? NONE : form[key])}
        onValueChange={(v) => set(key, v === NONE ? "" : v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="-- Chọn --" />
        </SelectTrigger>
        <SelectContent>
          {allowNone && <SelectItem value={NONE}>-- Chọn --</SelectItem>}
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );

  const enumOptions = (labels: Record<string, string>) =>
    Object.entries(labels).map(([value, label]) => ({ value, label }));

  const handleSave = () => {
    if (updateMutation.isPending) return;
    updateMutation.mutate(
      { id: employee.id, payload: toPayload(form) },
      {
        onSuccess: () => toast.success(t("hr.toast.updated", "Đã cập nhật nhân viên.")),
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : t("hr.toast.saveFailed", "Lưu thất bại."),
          ),
      },
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
        <Section title={t("hr.section.work", "Công việc")}>
          <Field label={t("hr.field.department", "Phòng ban")}>
            <Select
              value={form.department_id || NONE}
              onValueChange={(v) => set("department_id", v === NONE ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="-- Chọn --" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>-- Chọn --</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {optionSelect(
            "position_level",
            t("hr.field.positionLevel", "Chức danh"),
            enumOptions(POSITION_LEVEL_LABELS),
          )}
          {text("position_title", t("hr.field.positionTitle", "Vị trí cụ thể"))}
          {optionSelect(
            "work_type",
            t("hr.field.workType", "Hình thức làm việc"),
            enumOptions(WORK_TYPE_LABELS),
          )}
          {optionSelect(
            "employment_status",
            t("hr.field.status", "Trạng thái"),
            STATUS_OPTIONS,
            false,
          )}
          {date("hire_date", t("hr.detail.hireDate", "Ngày vào làm"))}
          {date("official_date", t("hr.field.officialDate", "Ngày chính thức"))}
          {date("resign_date", t("hr.field.resignDate", "Ngày nghỉ việc"))}
          {text("resign_reason", t("hr.field.resignReason", "Lý do nghỉ"))}
          {text("lark_account", t("hr.field.larkAccount", "TK Lark"))}
        </Section>

        <Section title={t("hr.section.personal", "Cá nhân")}>
          {text("full_name", t("hr.field.fullName", "Họ tên"))}
          {optionSelect("gender", t("hr.field.gender", "Giới tính"), GENDER_OPTIONS)}
          {date("dob", t("hr.field.dob", "Ngày sinh"))}
          {optionSelect(
            "marital_status",
            t("hr.field.marital", "Tình trạng hôn nhân"),
            enumOptions(MARITAL_STATUS_LABELS),
          )}
          {text("phone", t("hr.field.phone", "Điện thoại"))}
          {text("personal_email", t("hr.detail.email", "Email cá nhân"), "email")}
          {text("facebook_url", t("hr.field.facebook", "Facebook"))}
          {text("vehicle_info", t("hr.field.vehicle", "Đăng ký xe"))}
        </Section>

        <Section title={t("hr.section.idDoc", "Giấy tờ tuỳ thân")}>
          {text("id_number", t("hr.field.idNumber", "CMND/CCCD"))}
          {date("id_issued_date", t("hr.field.idIssuedDate", "Ngày cấp"))}
          {text("id_issued_place", t("hr.field.idIssuedPlace", "Nơi cấp"))}
          {text("permanent_address", t("hr.field.permanentAddr", "Hộ khẩu thường trú"))}
          {text("address", t("hr.field.address", "Địa chỉ liên hệ"))}
        </Section>

        <Section title={t("hr.section.education", "Học vấn")}>
          {text("education_level", t("hr.field.education", "Trình độ"))}
          {text("major", t("hr.field.major", "Chuyên ngành"))}
          {text("school", t("hr.field.school", "Trường"))}
        </Section>

        <Section title={t("hr.section.finance", "Thuế / BHXH / Ngân hàng")}>
          {text("tax_code", t("hr.field.taxCode", "MST TNCN"))}
          {text("social_insurance_no", t("hr.field.social", "Số sổ BHXH"))}
          {text("bank_account_no", t("hr.field.bankAcc", "Số tài khoản"))}
          {text("bank_name", t("hr.field.bankName", "Ngân hàng"))}
        </Section>

        <Section title={t("hr.section.emergency", "Liên hệ khẩn cấp")}>
          {text("emergency_contact_name", t("hr.field.ecName", "Họ tên"))}
          {text("emergency_contact_relation", t("hr.field.ecRelation", "Mối quan hệ"))}
          {text("emergency_contact_phone", t("hr.field.ecPhone", "Điện thoại"))}
          {text("emergency_contact_address", t("hr.field.ecAddress", "Địa chỉ"))}
        </Section>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-primary">
            {t("hr.section.children", "Con cái")}
          </h3>
          {employee.children.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("common.none", "Không có")}</p>
          ) : (
            <ul className="list-inside list-disc text-sm text-foreground">
              {employee.children.map((c) => (
                <li key={c.id}>
                  {c.name || "-"}
                  {c.birth_year ? ` (${c.birth_year})` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-primary">
              {t("hr.section.accounts", "Tài khoản đăng nhập")}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpenAssignAccount(true)}>
                <Link2 className="mr-1 h-4 w-4" />
                {t("hr.account.assign", "Gán tài khoản")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setOpenAddAccount(true)}>
                <UserPlus className="mr-1 h-4 w-4" />
                {t("hr.account.add", "Thêm tài khoản")}
              </Button>
            </div>
          </div>
          {employee.accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("hr.detail.noAccount", "Chưa gắn tài khoản")}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {employee.accounts.map((acc) => (
                <div
                  key={acc.account_id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{acc.username}</span>
                    {acc.is_primary && (
                      <Badge variant="secondary">{t("hr.account.primary", "Chính")}</Badge>
                    )}
                    {!acc.is_active && (
                      <Badge variant="outline">{t("common.inactive", "Ngừng")}</Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("hr.account.remove", "Gỡ tài khoản")}
                    onClick={() => setAccountToRemove(acc)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <EmployeeAccountCreateDialog
          open={openAddAccount}
          onOpenChange={setOpenAddAccount}
          onSubmit={handleAddAccount}
        />

        <EmployeeAccountAssignDialog
          open={openAssignAccount}
          onOpenChange={setOpenAssignAccount}
          onSubmit={handleAssignAccount}
        />

        <Dialog
          open={accountToRemove !== null}
          onOpenChange={(o) => !o && setAccountToRemove(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("hr.account.removeTitle", "Gỡ tài khoản?")}</DialogTitle>
              <DialogDescription>
                {t(
                  "hr.account.removeDesc",
                  "Tài khoản sẽ được gỡ khỏi nhân sự này. Tài khoản đăng nhập vẫn được giữ lại.",
                )}
                {accountToRemove && (
                  <span className="mt-2 block font-medium">{accountToRemove.username}</span>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAccountToRemove(null)}>
                {t("common.cancel", "Hủy")}
              </Button>
              <Button onClick={handleConfirmRemove}>{t("common.confirm", "Xác nhận")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex justify-end gap-2 border-t border-border bg-card px-4 py-3">
        <Button disabled={updateMutation.isPending} onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          {updateMutation.isPending ? t("common.saving", "Đang lưu...") : t("common.save", "Lưu")}
        </Button>
      </div>
    </div>
  );
}
