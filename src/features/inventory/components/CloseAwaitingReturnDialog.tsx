import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormDialogShell } from "@/components/ui/form-dialog-content";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CLOSE_REASONS, type AwaitingReturnRow } from "@/lib/api/awaiting-return";

/**
 * Đóng sổ một đơn huỷ chờ hàng về — dùng khi hàng KHÔNG bao giờ quay lại kho
 * (khách giữ hàng, thất lạc, huỷ tại chỗ).
 *
 * Đóng KHÔNG ghi bút toán kho: hàng không về nghĩa là tồn hiện tại đã đúng. Thao tác
 * này chỉ ghi nhận quyết định và đưa đơn ra khỏi danh sách chờ.
 */
export function CloseAwaitingReturnDialog({
  target,
  pending,
  onOpenChange,
  onConfirm,
}: {
  target: AwaitingReturnRow | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (input: { reason: string; note: string }) => void;
}) {
  const [reason, setReason] = useState<string>(CLOSE_REASONS[0].value);
  const [note, setNote] = useState("");

  // Mở cho đơn khác → về lại lựa chọn mặc định, không mang ghi chú của đơn trước.
  useEffect(() => {
    if (!target) return;
    setReason(CLOSE_REASONS[0].value);
    setNote("");
  }, [target]);

  if (!target) return null;

  // Lý do "Khác" không nói lên điều gì nếu thiếu giải thích — chặn ngay ở nút.
  const blocked = reason === "other" && !note.trim();

  return (
    <Dialog open onOpenChange={(open) => !pending && onOpenChange(open)}>
      <FormDialogShell
        title={`Đóng đơn chờ hàng về — ${target.shipping_code || target.order_code}`}
        className="sm:h-auto sm:max-h-[85dvh] sm:w-full sm:max-w-md"
        footer={
          <>
            <Button variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
              Huỷ
            </Button>
            <Button
              disabled={blocked || pending}
              onClick={() => onConfirm({ reason, note: note.trim() })}
            >
              {pending ? "Đang đóng..." : "Xác nhận"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger aria-label="Lý do đóng">
              <SelectValue placeholder="Chọn lý do" />
            </SelectTrigger>
            <SelectContent>
              {CLOSE_REASONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Textarea
            value={note}
            aria-label="Ghi chú"
            placeholder="Ghi chú (bắt buộc khi chọn Khác)"
            onChange={(event) => setNote(event.target.value)}
          />

          <p className="text-sm text-muted-foreground">
            Đóng đơn không cộng tồn — hàng coi như đã rời kho vĩnh viễn.
          </p>
        </div>
      </FormDialogShell>
    </Dialog>
  );
}
