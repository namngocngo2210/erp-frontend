import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormDialogShell } from "@/components/ui/form-dialog-content";
import { Input } from "@/components/ui/input";
import { datetimeLocalToIso, isoToDatetimeLocal } from "@/lib/datetime-local";
import { useSetOperationStage } from "../queries";

type OperationStageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: number | null;
  customerName: string;
  /** Bước sale vừa chọn trong ô ở cột Tác nghiệp. */
  stageId: number | null;
  stageName: string;
  /** Giờ hẹn đang có — dùng làm giá trị gợi ý ban đầu. */
  currentDueAt: string | null;
};

/**
 * Hỏi giờ hẹn TRƯỚC KHI đổi bước tác nghiệp. Chọn bước ở ô trên bảng chưa ghi gì cả:
 * chỉ khi bấm Xác nhận mới bắn ĐÚNG MỘT request mang cả `stage_id` lẫn `due_at` — đóng
 * dialog là không có gì thay đổi, không để lại bước mới thiếu hạn.
 *
 * Tách riêng với `OperationDueDialog` (chỉ sửa giờ của bước hiện tại) vì khác mutation
 * và cần nói rõ đang chuyển sang bước nào.
 */
export function OperationStageDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  stageId,
  stageName,
  currentDueAt,
}: OperationStageDialogProps) {
  const [dueAt, setDueAt] = useState("");
  const setStage = useSetOperationStage();

  useEffect(() => {
    if (open) setDueAt(isoToDatetimeLocal(currentDueAt));
  }, [open, currentDueAt]);

  const handleSubmit = () => {
    if (!customerId || !stageId) return;
    const iso = datetimeLocalToIso(dueAt);
    if (!iso) {
      toast.error("Vui lòng chọn giờ hẹn hợp lệ.");
      return;
    }
    setStage.mutate(
      { customerId, stage_id: stageId, due_at: iso },
      {
        onSuccess: () => {
          toast.success(`Đã chuyển sang bước ${stageName}.`);
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Đổi tác nghiệp thất bại.");
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogShell
        title={`Chuyển sang bước ${stageName}`}
        description={customerName ? `Khách hàng: ${customerName}` : undefined}
        onSubmit={(e) => {
          e.preventDefault();
          if (!setStage.isPending) handleSubmit();
        }}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={setStage.isPending}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={!dueAt || setStage.isPending}>
              {setStage.isPending ? "Đang lưu..." : "Xác nhận"}
            </Button>
          </>
        }
      >
        <div className="space-y-1.5">
          <label htmlFor="operation-stage-due-at" className="text-sm font-medium text-foreground">
            Giờ hẹn
          </label>
          <Input
            id="operation-stage-due-at"
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
        </div>
      </FormDialogShell>
    </Dialog>
  );
}
