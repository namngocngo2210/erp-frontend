import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useManualDispatch } from "@/features/inventory/manual-dispatch-queries";
import { useWarehousesList } from "@/features/warehouses/queries";

export type ManualDispatchItem = {
  product_name: string;
  sku: string;
  quantity: number;
};

type ManualDispatchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: number;
  /** Kho xuất hiện tại của đơn — dùng làm giá trị mặc định của ô chọn kho. */
  defaultWarehouseId: number | null;
  /** Các dòng sản phẩm của ĐƠN NÀY (order.items) — không phải catalogue sản phẩm. */
  items: ManualDispatchItem[];
};

/**
 * Popup xác nhận "Xuất kho" thủ công cho một đơn — gọi thẳng
 * `POST /api/inventory/orders/dispatch`. Đây là thao tác TRỪ TỒN thật (không phải
 * đánh dấu suông) và GHI ĐÈ kho xuất của đơn bằng kho vừa chọn — không hoàn tác dễ
 * dàng, nên phải hiện rõ danh sách sản phẩm sắp trừ + cảnh báo trước khi bấm.
 */
export function ManualDispatchDialog({
  open,
  onOpenChange,
  orderId,
  defaultWarehouseId,
  items,
}: ManualDispatchDialogProps) {
  const { data: warehouseData, isLoading: warehousesLoading } = useWarehousesList({
    isActive: true,
    limit: 200,
    offset: 0,
  });
  // useMemo giữ nguyên tham chiếu mảng khi `warehouseData` không đổi — nếu để
  // `warehouseData?.items ?? []` chạy trực tiếp, `[]` fallback tạo mảng MỚI mỗi lần
  // render (kể cả không đổi dữ liệu), khiến effect bên dưới chạy lại vô ích mỗi render.
  const warehouses = useMemo(() => warehouseData?.items ?? [], [warehouseData]);

  const [warehouseId, setWarehouseId] = useState<number | null>(defaultWarehouseId);
  const dispatchMutation = useManualDispatch();

  // `defaultWarehouseId` có thể là một kho đã bị vô hiệu hoá sau khi đơn được gán —
  // danh sách `warehouses` ở trên chỉ tải kho ACTIVE. Nếu để nguyên, `warehouseId` sẽ
  // trỏ tới một id không có option nào khớp: select hiện như trống nhưng nút Xuất kho
  // vẫn bật, cho phép gửi đi một kho người dùng chưa từng nhìn thấy/chọn. Chỉ áp dụng
  // fallback SAU khi danh sách đã tải xong (đang loading thì `warehouses` rỗng, xoá
  // default lúc đó sẽ mất giá trị hợp lệ một cách oan uổng), và chỉ khi giá trị hiện
  // tại vẫn còn là default gốc (không ghi đè lựa chọn người dùng đã tự đổi).
  useEffect(() => {
    if (warehousesLoading || defaultWarehouseId == null) return;
    const stillListed = warehouses.some((w) => w.id === defaultWarehouseId);
    if (!stillListed) {
      // Dùng functional updater để không cần đưa `warehouseId` vào dependency array
      // (tránh effect chạy lại mỗi khi người dùng đổi lựa chọn).
      setWarehouseId((prev) => (prev === defaultWarehouseId ? null : prev));
    }
  }, [warehousesLoading, warehouses, defaultWarehouseId]);

  function handleConfirm() {
    if (warehouseId == null) return;
    dispatchMutation.mutate(
      { orderIds: [orderId], warehouseId },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !dispatchMutation.isPending && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xuất kho đơn #{orderId}</DialogTitle>
          <DialogDescription>
            Thao tác này trừ tồn kho theo kho được chọn bên dưới và cập nhật lại kho xuất của đơn.
            Hàng coi như đã rời kệ — thao tác không hoàn tác dễ dàng.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Kho xuất</label>
            <select
              role="combobox"
              value={warehouseId != null ? String(warehouseId) : ""}
              onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : null)}
              disabled={dispatchMutation.isPending || warehousesLoading}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            >
              <option value="">— Chọn kho —</option>
              {warehouses.map((w) => (
                <option key={w.id} value={String(w.id)}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {items.length > 0 && (
            <div>
              <p className="mb-1 text-sm font-medium text-foreground">Sản phẩm sẽ trừ tồn</p>
              <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                {items.map((line, idx) => (
                  <li key={`${line.sku}-${idx}`}>
                    {line.product_name} ({line.sku}) × {line.quantity}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            disabled={dispatchMutation.isPending}
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <Button
            disabled={warehouseId == null || dispatchMutation.isPending}
            onClick={handleConfirm}
          >
            {dispatchMutation.isPending ? "Đang xuất kho..." : "Xuất kho"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
