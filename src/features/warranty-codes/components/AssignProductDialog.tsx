import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormDialogShell, FormGrid } from "@/components/ui/form-dialog-content";
import { SearchableSelect } from "@/components/ui/searchable-select";

import { useProductSearch } from "@/features/products/queries";
import { useAssignBatch } from "@/features/warranty-codes/queries";
import type { WarrantyCodeBatch } from "@/features/warranty-codes/types";
import { formatNumber } from "@/lib/format";

const labelClass = "mb-1 block text-sm font-medium text-muted-foreground";

type Props = {
  batch: WarrantyCodeBatch | null;
  onOpenChange: (open: boolean) => void;
};

/** Dialog "Gán SP" — gắn sản phẩm cho toàn bộ mã của 1 lô (chỉ áp dụng lô "reserved"). */
export function AssignProductDialog({ batch, onOpenChange }: Props) {
  const [productId, setProductId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setProductId(null);
    setError("");
  }, [batch?.id]);

  const searchProducts = useProductSearch();
  const searchProductOptions = async (q: string) => {
    const list = await searchProducts(q);
    return list.map((p) => ({ value: String(p.id), label: p.sku }));
  };

  const assignMutation = useAssignBatch();

  const handleSubmit = () => {
    if (!batch || assignMutation.isPending) return;
    if (!productId) {
      setError("Vui lòng chọn sản phẩm.");
      return;
    }
    setError("");
    assignMutation.mutate(
      { id: batch.id, productId },
      {
        onSuccess: () => {
          toast.success(`Đã gán sản phẩm cho lô ${batch.batch_code}.`);
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Gán sản phẩm thất bại.");
        },
      },
    );
  };

  return (
    <Dialog open={batch != null} onOpenChange={onOpenChange}>
      <FormDialogShell
        title="Gán sản phẩm"
        // Chỉ 1 field — thu về khổ nhỏ trên desktop thay vì khổ form 1480px mặc định;
        // mobile vẫn full-screen theo chuẩn responsive.
        className="sm:h-auto sm:max-h-[85dvh] sm:w-full sm:max-w-lg"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="button" disabled={assignMutation.isPending} onClick={handleSubmit}>
              {assignMutation.isPending ? "Đang gán..." : "Gán sản phẩm"}
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
                <span className="text-muted-foreground">Số lượng: </span>
                {formatNumber(batch.quantity)} mã
              </div>
            </div>
          )}

          <FormGrid columns={2}>
            <div>
              <label className={labelClass}>Sản phẩm</label>
              <SearchableSelect
                onSearch={searchProductOptions}
                value={productId != null ? String(productId) : ""}
                onChange={(v) => setProductId(v ? Number(v) : null)}
                placeholder="Chọn sản phẩm..."
              />
            </div>
          </FormGrid>
          <p className="mt-3 text-xs text-muted-foreground">
            Toàn bộ mã trong lô sẽ gắn sản phẩm này.
          </p>
          {error && <p className="mt-3 text-xs text-action-danger">{error}</p>}
          <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
        </form>
      </FormDialogShell>
    </Dialog>
  );
}
