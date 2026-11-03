import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormDialogShell } from "@/components/ui/form-dialog-content";
import { Input } from "@/components/ui/input";

import { useAdjustReturnEntry } from "../returns-queries";
import type { AdjustReturnTarget } from "../returns-types";

/**
 * Điều chỉnh SỐ LƯỢNG dòng hàng của đơn hoàn ĐÃ GHI SỔ (Lịch sử nhập xuất).
 * Hạ số khi thực nhận thiếu; 0 = SP không về (gỡ dòng). Hạ hết mọi dòng về 0
 * thì phải dùng Huỷ (còn hoàn tác trạng thái đơn) — BE cũng chặn.
 */
export function AdjustReturnDialog({
  target,
  onOpenChange,
}: {
  target: AdjustReturnTarget | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const adjust = useAdjustReturnEntry();

  // Mỗi lần mở cho 1 đơn khác → nạp lại số lượng hiện tại của đơn đó.
  useEffect(() => {
    if (!target) return;
    setQuantities(Object.fromEntries(target.lines.map((l) => [l.product_id, String(l.qty)])));
  }, [target]);

  if (!target) return null;

  function lineLabel(sku: string | null, productId: number) {
    return sku || `#${productId}`;
  }

  // Không kẹp trần ở SL đã ghi sổ: tăng (nhận thêm hàng về sau) là hợp lệ —
  // guard BE chặn vượt phần đã trừ tồn của đơn nguồn.
  function setQty(productId: number, raw: string) {
    const trimmed = raw.trim();
    let next = trimmed;
    if (trimmed !== "") {
      const value = Number(trimmed);
      if (!Number.isFinite(value)) return;
      next = String(Math.max(Math.trunc(value), 0));
    }
    setQuantities((prev) => ({ ...prev, [productId]: next }));
  }

  async function handleSave() {
    if (!target) return;
    const lines = target.lines.map((l) => ({
      product_id: l.product_id,
      quantity: Math.trunc(Number(quantities[l.product_id]) || 0),
    }));
    if (lines.every((l) => l.quantity === 0)) {
      toast.error("Mọi dòng đều về 0 — dùng Huỷ đơn hoàn thay vì điều chỉnh.");
      return;
    }
    try {
      await adjust.mutateAsync({ id: target.return_id, lines });
      toast.success("Đã điều chỉnh số lượng — tồn kho đã cập nhật.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Điều chỉnh thất bại.");
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !adjust.isPending && onOpenChange(o)}>
      <FormDialogShell
        title={`Điều chỉnh SL hoàn — ${target.label}`}
        // Nội dung chỉ vài dòng hàng — thu về khổ nhỏ trên desktop thay vì khổ form
        // 1480px mặc định; mobile vẫn full-screen theo chuẩn responsive.
        className="sm:h-auto sm:max-h-[85dvh] sm:w-full sm:max-w-md"
        footer={
          <>
            <Button
              variant="outline"
              disabled={adjust.isPending}
              onClick={() => onOpenChange(false)}
            >
              Đóng
            </Button>
            <Button onClick={handleSave} disabled={adjust.isPending}>
              {adjust.isPending ? "Đang lưu..." : "Lưu điều chỉnh"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Sửa số thực nhận của từng dòng; 0 = sản phẩm không về kho (gỡ khỏi phiếu). Tồn kho được
            điều chỉnh ngay khi lưu.
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table data-slot="table" className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2 text-right">SL đã ghi sổ</th>
                  <th className="px-3 py-2 text-right">SL thực nhận</th>
                </tr>
              </thead>
              <tbody>
                {target.lines.map((l) => (
                  <tr key={l.product_id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{lineLabel(l.sku, l.product_id)}</td>
                    <td className="px-3 py-2 text-right">{l.qty}</td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={0}
                        value={quantities[l.product_id] ?? String(l.qty)}
                        aria-label={`Số lượng ${lineLabel(l.sku, l.product_id)}`}
                        className="ml-auto h-8 w-20 text-right"
                        onChange={(e) => setQty(l.product_id, e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </FormDialogShell>
    </Dialog>
  );
}
