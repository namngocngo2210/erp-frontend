import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/i18n";

import type { CustomerFormData, GenderOption } from "../customer-types";

interface CustomerFormDialogProps {
  mode: "create" | "edit";
  idPrefix: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: CustomerFormData;
  setFormData: React.Dispatch<React.SetStateAction<CustomerFormData>>;
  formErrors: Record<string, string>;
  isPending: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export function CustomerFormDialog({
  mode,
  idPrefix,
  open,
  onOpenChange,
  formData,
  setFormData,
  formErrors,
  isPending,
  onSubmit,
  onCancel,
}: CustomerFormDialogProps) {
  const { t } = useI18n();
  const isCreate = mode === "create";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isCreate
              ? t("customers.dialog.createTitle", "Thêm khách hàng mới")
              : t("customers.dialog.editTitle", "Chỉnh sửa khách hàng")}
          </DialogTitle>
          <DialogDescription>
            {isCreate
              ? t("customers.dialog.createDescription", "Nhập thông tin khách hàng cần tạo.")
              : t("customers.dialog.editDescription", "Cập nhật thông tin khách hàng.")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-4 sm:items-center sm:gap-4">
            <label
              htmlFor={`${idPrefix}-full-name`}
              className="text-left text-sm font-medium text-muted-foreground sm:text-right"
            >
              {t("customers.form.name", "Tên")}
            </label>
            <div className="col-span-1 sm:col-span-3">
              <Input
                id={`${idPrefix}-full-name`}
                value={formData.full_name}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, full_name: event.target.value }))
                }
                className={formErrors.full_name ? "border-action-danger" : ""}
              />
              {formErrors.full_name && (
                <p className="mt-1 text-xs text-action-danger">{formErrors.full_name}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-4 sm:items-center sm:gap-4">
            <label
              htmlFor={`${idPrefix}-phone`}
              className="text-left text-sm font-medium text-muted-foreground sm:text-right"
            >
              {t("customers.form.phone", "Số điện thoại")}
            </label>
            <div className="col-span-1 sm:col-span-3">
              <Input
                id={`${idPrefix}-phone`}
                value={formData.phone_raw}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, phone_raw: event.target.value }))
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-4 sm:items-center sm:gap-4">
            <label
              htmlFor={`${idPrefix}-gender`}
              className="text-left text-sm font-medium text-muted-foreground sm:text-right"
            >
              {t("customers.form.gender", "Giới tính")}
            </label>
            <div className="col-span-1 sm:col-span-3">
              <Select
                value={formData.gender}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, gender: value as GenderOption }))
                }
              >
                <SelectTrigger id={`${idPrefix}-gender`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("common.empty", "Trống")}</SelectItem>
                  <SelectItem value="male">{t("gender.male", "Nam")}</SelectItem>
                  <SelectItem value="female">{t("gender.female", "Nữ")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t("common.cancel", "Hủy")}
          </Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {isCreate
              ? isPending
                ? t("common.creating", "Đang tạo")
                : t("common.create", "Tạo")
              : isPending
                ? t("common.updating", "Đang cập nhật")
                : t("common.update", "Cập nhật")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
