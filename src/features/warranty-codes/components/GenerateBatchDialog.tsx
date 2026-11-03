import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormDialogShell } from "@/components/ui/form-dialog-content";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";

import { useProductSearch } from "@/features/products/queries";
import { useCreateBatch } from "@/features/warranty-codes/queries";
import { formatNumber } from "@/lib/format";

const labelClass = "mb-1 block text-sm font-medium text-muted-foreground";

const fmt = (n: number) => formatNumber(n);

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Dialog "Tạo lô" — tạo lô mã bảo hành mới: "Từ số" (tuỳ chọn) + số lượng (không
 * giới hạn) + sản phẩm gán sẵn (tuỳ chọn). Bỏ trống "Từ số" = nối tiếp toàn hệ
 * thống như trước; có nhập = sinh đúng khoảng số mong muốn (backend chặn trùng dải).
 */
export function GenerateBatchDialog({ open, onOpenChange }: Props) {
  const [startSeq, setStartSeq] = useState("");
  const [quantity, setQuantity] = useState("");
  const [productId, setProductId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setStartSeq("");
    setQuantity("");
    setProductId(null);
    setError("");
  }, [open]);

  const startNum = startSeq.trim() === "" ? null : Number(startSeq);
  const qtyNum = Number(quantity);
  const rangePreview =
    startNum != null &&
    Number.isInteger(startNum) &&
    startNum >= 1 &&
    Number.isInteger(qtyNum) &&
    qtyNum >= 1
      ? `${fmt(startNum)} → ${fmt(startNum + qtyNum - 1)}`
      : null;

  const searchProducts = useProductSearch();
  const searchProductOptions = async (q: string) => {
    const list = await searchProducts(q);
    return list.map((p) => ({ value: String(p.id), label: p.sku }));
  };

  const createMutation = useCreateBatch();

  const handleSubmit = () => {
    if (createMutation.isPending) return;
    if (startNum != null && (!Number.isInteger(startNum) || startNum < 1)) {
      setError("Số bắt đầu phải là số nguyên từ 1 trở lên (hoặc bỏ trống để nối tiếp).");
      return;
    }
    if (!Number.isInteger(qtyNum) || qtyNum < 1) {
      setError("Số lượng phải là số nguyên từ 1 trở lên.");
      return;
    }
    setError("");
    createMutation.mutate(
      { quantity: qtyNum, start_seq: startNum, product_id: productId },
      {
        onSuccess: (batch) => {
          const range = `${batch.start_serial} – ${batch.end_serial}`;
          toast.success(
            batch.is_generating
              ? `Đã tạo lô ${batch.batch_code} (${range}). Đang sinh ${fmt(batch.quantity)} mã chạy nền.`
              : `Đã tạo lô ${batch.batch_code} (${range}, ${fmt(batch.quantity)} mã).`,
          );
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Tạo lô thất bại.");
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogShell
        title="Tạo lô mã bảo hành"
        // Chỉ 2 field — thu về khổ nhỏ trên desktop thay vì khổ form 1480px mặc định;
        // mobile vẫn full-screen theo chuẩn responsive.
        className="sm:h-auto sm:max-h-[85dvh] sm:w-full sm:max-w-lg"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="button" disabled={createMutation.isPending} onClick={handleSubmit}>
              {createMutation.isPending ? "Đang tạo..." : "Tạo lô"}
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
          <div className="space-y-4">
            <div>
              <label htmlFor="wc-batch-start" className={labelClass}>
                Từ số
              </label>
              <Input
                id="wc-batch-start"
                type="number"
                min={1}
                step={1}
                value={startSeq}
                onChange={(e) => setStartSeq(e.target.value)}
                placeholder="Bỏ trống = nối tiếp số hiện có"
              />
            </div>
            <div>
              <label htmlFor="wc-batch-qty" className={labelClass}>
                Số lượng
              </label>
              <Input
                id="wc-batch-qty"
                type="number"
                min={1}
                step={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Sản phẩm</label>
              <SearchableSelect
                onSearch={searchProductOptions}
                value={productId != null ? String(productId) : ""}
                onChange={(v) => setProductId(v ? Number(v) : null)}
                placeholder="— Chưa gắn sản phẩm —"
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {rangePreview
              ? `Dải sẽ tạo: ${rangePreview} (prefix DX-). Không được trùng lô đã có.`
              : 'Mã sinh ra có prefix DX-. Bỏ trống "Từ số" thì nối tiếp toàn hệ thống; nhập để chọn khoảng số riêng.'}{" "}
            Lô lớn sẽ sinh mã chạy nền, xem tiến độ ở bảng lô.
          </p>
          {error && <p className="mt-3 text-xs text-action-danger">{error}</p>}
          <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
        </form>
      </FormDialogShell>
    </Dialog>
  );
}
