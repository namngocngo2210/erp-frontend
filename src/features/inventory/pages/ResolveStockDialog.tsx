import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReclassifyStock } from "@/features/inventory/queries";
import type { ReclassifyAction, ReclassifyFromState } from "@/features/inventory/types";

export type ResolveStockTarget = {
  warehouse: number;
  warehouse_name: string;
  product: number;
  product_sku: string;
  product_name: string;
  warranty: number;
  defect: number;
};

const FROM_STATE_LABELS: Record<ReclassifyFromState, string> = {
  warranty: "Bảo hành",
  defect: "Lỗi",
};

const ACTION_LABELS: Record<ReclassifyAction, string> = {
  to_sellable: "Chuyển về bán được",
  send_back: "Gửi lại khách",
  scrap: "Huỷ",
};

const ACTIONS: ReclassifyAction[] = ["to_sellable", "send_back", "scrap"];

type Props = {
  open: boolean;
  onClose: () => void;
  target: ResolveStockTarget;
};

export function ResolveStockDialog({ open, onClose, target }: Props) {
  const availableStates: ReclassifyFromState[] = [];
  if (target.warranty > 0) availableStates.push("warranty");
  if (target.defect > 0) availableStates.push("defect");

  const defaultFromState = availableStates[0] ?? "warranty";
  const maxQty = (state: ReclassifyFromState) =>
    state === "warranty" ? target.warranty : target.defect;

  const [fromState, setFromState] = useState<ReclassifyFromState>(defaultFromState);
  const [action, setAction] = useState<ReclassifyAction>("to_sellable");
  const [quantity, setQuantity] = useState<number>(maxQty(defaultFromState));
  const [note, setNote] = useState("");

  const mutation = useReclassifyStock();

  function handleFromStateChange(val: string) {
    const state = val as ReclassifyFromState;
    setFromState(state);
    setQuantity(maxQty(state));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const max = maxQty(fromState);
    if (quantity < 1) {
      toast.error("Số lượng phải ít nhất là 1");
      return;
    }
    if (quantity > max) {
      toast.error(`Số lượng vượt quá tồn kho (${max})`);
      return;
    }
    try {
      await mutation.mutateAsync({
        warehouse_id: target.warehouse,
        product_id: target.product,
        quantity,
        from_state: fromState,
        action,
        note: note.trim() || undefined,
      });
      toast.success("Đã xử lý");
      onClose();
    } catch {
      toast.error("Xử lý thất bại. Vui lòng thử lại.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Xử lý hàng tồn</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          {target.product_sku}
          <br />
          Kho: {target.warehouse_name}
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 pt-2">
          {/* Trạng thái nguồn */}
          <div className="space-y-1">
            <label htmlFor="from-state" className="text-sm font-medium">
              Trạng thái nguồn
            </label>
            <Select value={fromState} onValueChange={handleFromStateChange}>
              <SelectTrigger id="from-state">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableStates.map((s) => (
                  <SelectItem key={s} value={s}>
                    {FROM_STATE_LABELS[s]} ({maxQty(s)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Hành động */}
          <div className="space-y-1">
            <label htmlFor="action" className="text-sm font-medium">
              Hành động
            </label>
            <Select value={action} onValueChange={(v) => setAction(v as ReclassifyAction)}>
              <SelectTrigger id="action">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {ACTION_LABELS[a]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Số lượng */}
          <div className="space-y-1">
            <label htmlFor="quantity" className="text-sm font-medium">
              Số lượng{" "}
              <span className="text-muted-foreground text-xs">(tối đa {maxQty(fromState)})</span>
            </label>
            <input
              id="quantity"
              type="number"
              min={1}
              max={maxQty(fromState)}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              required
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-hidden focus:border-primary"
            />
          </div>

          {/* Ghi chú */}
          <div className="space-y-1">
            <label htmlFor="note" className="text-sm font-medium">
              Ghi chú (tuỳ chọn)
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Nhập ghi chú..."
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-hidden focus:border-primary resize-none"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Huỷ
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Đang xử lý…" : "Xác nhận"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
