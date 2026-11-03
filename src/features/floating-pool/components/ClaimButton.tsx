import { useState } from "react";
import { Hand } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ClaimButtonProps = {
  customerName: string;
  phone: string;
  quotaExhausted: boolean;
  pending: boolean;
  onConfirm: () => void;
};

export function ClaimButton({
  customerName,
  phone,
  quotaExhausted,
  pending,
  onConfirm,
}: ClaimButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="sm"
        disabled={quotaExhausted || pending}
        title={quotaExhausted ? "Đã dùng hết lượt nhặt hôm nay" : undefined}
        onClick={() => setOpen(true)}
      >
        <Hand className="mr-1 h-4 w-4" />
        Nhặt số
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nhặt số về chăm sóc?</DialogTitle>
            <DialogDescription>
              Đơn của khách <span className="font-medium">{customerName}</span> ({phone}) sẽ được
              chuyển về bạn. Nhớ chăm sóc trước khi bị thả nổi lại.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Huỷ
            </Button>
            <Button
              disabled={pending}
              onClick={() => {
                setOpen(false);
                onConfirm();
              }}
            >
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
