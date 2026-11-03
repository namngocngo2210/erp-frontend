import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormDialogShell, FormGrid } from "@/components/ui/form-dialog-content";
import { Input } from "@/components/ui/input";

import { useSplitBatch } from "@/features/warranty-codes/queries";
import type { WarrantyCodeBatch } from "@/features/warranty-codes/types";

const labelClass = "mb-1 block text-sm font-medium text-muted-foreground";

type Props = {
  batch: WarrantyCodeBatch | null;
  onOpenChange: (open: boolean) => void;
};

/** Dialog "Tách" — cắt 1 lô "reserved" thành 2 lô con tại 1 điểm cắt (số thứ tự). */
export function SplitBatchDialog({ batch, onOpenChange }: Props) {
  const [cut, setCut] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setCut("");
    setError("");
  }, [batch?.id]);

  const splitMutation = useSplitBatch();

  const handleSubmit = () => {
    if (!batch || splitMutation.isPending) return;
    const n = Number(cut);
    if (!Number.isInteger(n) || n < batch.start_seq || n >= batch.end_seq) {
      setError(`Nhập số trong khoảng ${batch.start_seq} đến ${batch.end_seq - 1}.`);
      return;
    }
    setError("");
    splitMutation.mutate(
      { id: batch.id, cutSeq: n },
      {
        onSuccess: (result) => {
          toast.success(
            `Đã tách lô ${result.parent.batch_code} (${result.parent.quantity} mã) và ${result.child.batch_code} (${result.child.quantity} mã).`,
          );
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Tách lô thất bại.");
        },
      },
    );
  };

  return (
    <Dialog open={batch != null} onOpenChange={onOpenChange}>
      <FormDialogShell
        title="Tách lô mã"
        // Chỉ 1 field — thu về khổ nhỏ trên desktop thay vì khổ form 1480px mặc định;
        // mobile vẫn full-screen theo chuẩn responsive.
        className="sm:h-auto sm:max-h-[85dvh] sm:w-full sm:max-w-lg"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="button" disabled={splitMutation.isPending} onClick={handleSubmit}>
              {splitMutation.isPending ? "Đang tách..." : "Tách lô"}
            </Button>
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          {batch && (
            <div className="mb-4 rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <div>
                <span className="text-muted-foreground">Lô: </span>
                {batch.batch_code}
              </div>
              <div>
                Dải: {batch.start_serial} → {batch.end_serial}
              </div>
            </div>
          )}

          <FormGrid columns={2}>
            <div>
              <label className={labelClass}>Cắt tại số thứ tự (mã cuối của lô đầu)</label>
              <Input
                type="number"
                min={batch?.start_seq}
                max={batch ? batch.end_seq - 1 : undefined}
                value={cut}
                onChange={(e) => setCut(e.target.value)}
              />
            </div>
          </FormGrid>
          {error && <p className="mt-3 text-xs text-action-danger">{error}</p>}
          <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
        </form>
      </FormDialogShell>
    </Dialog>
  );
}
