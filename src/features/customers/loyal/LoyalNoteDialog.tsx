import type { Dispatch, SetStateAction } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n";
import type { LoyalCustomer, StaffUserOption } from "@/lib/api/customers";
import { staffLabel, type LoyalNoteForm } from "./loyal-format";

type Props = {
  editing: LoyalCustomer | null;
  form: LoyalNoteForm;
  setForm: Dispatch<SetStateAction<LoyalNoteForm>>;
  staffUsers: StaffUserOption[];
  canAssignSale: boolean;
  canEditNote: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
};

export function LoyalNoteDialog({
  editing,
  form,
  setForm,
  staffUsers,
  canAssignSale,
  canEditNote,
  saving,
  onClose,
  onSave,
}: Props) {
  const { t } = useI18n();
  return (
    <Dialog open={editing !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-120">
        <DialogHeader>
          <DialogTitle>{t("loyalCustomers.dialog.editTitle", "Hành động & ghi chú")}</DialogTitle>
          <DialogDescription>
            {editing ? `${editing.full_name || "-"} - ${editing.phone || "-"}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <label htmlFor="loyal-sale-staff" className="text-sm font-medium text-muted-foreground">
              {t("loyalCustomers.columns.saleStaff", "Sale phụ trách")}
            </label>
            <Select
              value={form.sale_staff_id || "__none__"}
              onValueChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  sale_staff_id: value === "__none__" ? "" : value,
                }))
              }
              disabled={!canAssignSale}
            >
              <SelectTrigger id="loyal-sale-staff">
                <SelectValue>
                  {form.sale_staff_id
                    ? staffLabel(
                        staffUsers.find((staff) => String(staff.id) === form.sale_staff_id) ?? {
                          id: Number(form.sale_staff_id),
                          username: form.sale_staff_id,
                        },
                      )
                    : t("common.none", "Chưa chọn")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t("common.none", "Chưa chọn")}</SelectItem>
                {staffUsers.map((staff) => (
                  <SelectItem key={staff.id} value={String(staff.id)}>
                    {staffLabel(staff)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <label
              htmlFor="loyal-last-care-call"
              className="text-sm font-medium text-muted-foreground"
            >
              {t("loyalCustomers.columns.lastCareCall", "Ngày gọi chăm sóc gần nhất")}
            </label>
            <Input
              id="loyal-last-care-call"
              type="date"
              value={form.last_care_call_at}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, last_care_call_at: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-1.5">
            <label
              htmlFor="loyal-sale-action"
              className="text-sm font-medium text-muted-foreground"
            >
              {t("loyalCustomers.columns.saleAction", "Hành động sale cần làm ngay")}
            </label>
            <Textarea
              id="loyal-sale-action"
              rows={3}
              value={form.sale_action}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, sale_action: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-1.5">
            <label
              htmlFor="loyal-special-note"
              className="text-sm font-medium text-muted-foreground"
            >
              {t("loyalCustomers.columns.specialNote", "Ghi chú đặc biệt")}
            </label>
            <Textarea
              id="loyal-special-note"
              rows={3}
              value={form.special_note}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, special_note: event.target.value }))
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel", "Hủy")}
          </Button>
          <Button onClick={onSave} disabled={saving || !canEditNote}>
            {saving ? t("common.updating", "Đang cập nhật") : t("common.save", "Lưu")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
