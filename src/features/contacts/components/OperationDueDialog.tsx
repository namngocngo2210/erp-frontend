import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormDialogShell } from "@/components/ui/form-dialog-content";
import { Input } from "@/components/ui/input";
import { datetimeLocalToIso, isoToDatetimeLocal } from "@/lib/datetime-local";
import { useEditOperationDue } from "../queries";

type OperationDueDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: number | null;
  customerName: string;
  currentDueAt: string | null;
};

/**
 * Dialog nhỏ sửa giờ hẹn tác nghiệp (Task S2-3) — riêng với OperationResultDialog
 * vì chỉ có 1 field. Chỉ mở được từ nút Pencil ở OperationCell (đã tự gate
 * `allow_edit_due`), nhưng vẫn để BE là nguồn sự thật (400 khi bước hiện tại
 * không cho sửa) — lỗi hiển thị qua toast.
 */
export function OperationDueDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  currentDueAt,
}: OperationDueDialogProps) {
  const [dueAt, setDueAt] = useState("");
  const editDue = useEditOperationDue();

  useEffect(() => {
    if (open) setDueAt(isoToDatetimeLocal(currentDueAt));
  }, [open, currentDueAt]);

  const handleSubmit = () => {
    if (!customerId) return;
    const iso = datetimeLocalToIso(dueAt);
    if (!iso) {
      toast.error("Vui lòng chọn giờ hẹn hợp lệ.");
      return;
    }
    editDue.mutate(
      { customerId, due_at: iso },
      {
        onSuccess: () => {
          toast.success("Đã cập nhật giờ hẹn.");
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Sửa giờ hẹn thất bại.");
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogShell
        title="Sửa giờ hẹn"
        description={customerName ? `Khách hàng: ${customerName}` : undefined}
        onSubmit={(e) => {
          e.preventDefault();
          if (!editDue.isPending) handleSubmit();
        }}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={editDue.isPending}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={!dueAt || editDue.isPending}>
              {editDue.isPending ? "Đang lưu..." : "Lưu"}
            </Button>
          </>
        }
      >
        <div className="space-y-1.5">
          <label htmlFor="operation-due-at" className="text-sm font-medium text-foreground">
            Giờ hẹn mới
          </label>
          <Input
            id="operation-due-at"
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
        </div>
      </FormDialogShell>
    </Dialog>
  );
}
