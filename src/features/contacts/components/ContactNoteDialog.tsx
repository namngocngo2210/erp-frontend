import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useCreateContactActivity } from "../queries";

type ContactNoteDialogProps = {
  customerId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Dialog nhỏ ghi 1 activity kind=note thủ công — mở từ popover lịch sử hoặc nút "Ghi chú" nhanh ở bảng. */
export function ContactNoteDialog({ customerId, open, onOpenChange }: ContactNoteDialogProps) {
  const [note, setNote] = useState("");
  const createActivity = useCreateContactActivity();
  const trimmed = note.trim();

  // Reset nội dung mỗi lần dialog đóng để lần mở sau (kể cả khách khác) không dính chữ cũ.
  useEffect(() => {
    if (!open) setNote("");
  }, [open]);

  function handleSubmit() {
    if (!trimmed) return;
    createActivity.mutate(
      { customerId, payload: { kind: "note", note: trimmed } },
      {
        onSuccess: () => {
          toast.success("Đã lưu ghi chú.");
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Lưu ghi chú thất bại.");
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ghi chú liên hệ</DialogTitle>
          <DialogDescription>Ghi lại nội dung trao đổi với khách hàng.</DialogDescription>
        </DialogHeader>
        <Textarea
          autoFocus
          rows={4}
          placeholder="Nhập nội dung ghi chú..."
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={!trimmed || createActivity.isPending}>
            {createActivity.isPending ? "Đang lưu..." : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
