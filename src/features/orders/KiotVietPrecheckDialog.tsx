import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type KiotVietOrderAction,
  type KiotVietOrderPrecheckResult,
} from "@/features/orders/use-orders-data";

export type KiotVietPrecheckState = {
  action: KiotVietOrderAction;
  inputCount: number;
  validOrderIds: number[];
  invalidOrders: NonNullable<KiotVietOrderPrecheckResult["invalid_orders"]>;
};

type Props = {
  precheck: KiotVietPrecheckState | null;
  singlePushOrderId: number | null;
  onClose: () => void;
  onPushSingleInvalidOrder: (orderId: number) => void;
  t: (key: string, fallback?: string) => string;
};

/** Dialog hiển thị các đơn không đủ điều kiện đẩy KiotViet, cho phép đẩy lẻ từng đơn. */
export function KiotVietPrecheckDialog({
  precheck,
  singlePushOrderId,
  onClose,
  onPushSingleInvalidOrder,
  t,
}: Props) {
  return (
    <Dialog
      open={Boolean(precheck)}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t("orders.kiotviet.precheck.title", "Một số đơn không đủ điều kiện đẩy KiotViet")}
          </DialogTitle>
          <DialogDescription>
            {`Bạn đã chọn ${String(precheck?.inputCount || 0)} đơn. Có ${String(
              precheck?.invalidOrders.length || 0,
            )} đơn bị loại.`}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[52dvh] overflow-auto rounded-md border border-border">
          <table data-slot="table" className="w-full text-sm">
            <thead className="sticky top-0">
              <tr className="border-b border-border text-left">
                <th className="px-3 py-2">
                  {t("orders.kiotviet.precheck.columnOrderId", "Mã đơn hàng")}
                </th>
                <th className="px-3 py-2">{t("orders.kiotviet.precheck.columnName", "Tên")}</th>
                <th className="px-3 py-2">{t("orders.kiotviet.precheck.columnPhone", "SĐT")}</th>
                <th className="px-3 py-2">{t("orders.kiotviet.precheck.columnReason", "Lí do")}</th>
                <th className="w-[120px] px-3 py-2">
                  {t("orders.kiotviet.precheck.columnAction", "Thao tác")}
                </th>
              </tr>
            </thead>
            <tbody>
              {precheck?.invalidOrders.map((item) => (
                <tr
                  key={item.order_id}
                  className="border-b border-border/60 align-top transition-colors hover:bg-muted/50"
                >
                  <td className="px-3 py-2">#{item.order_id}</td>
                  <td className="px-3 py-2">{item.name || "-"}</td>
                  <td className="px-3 py-2">{item.phone || "-"}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {(item.reasons || []).join(" · ") || "-"}
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full"
                      disabled={singlePushOrderId !== null}
                      onClick={() => onPushSingleInvalidOrder(item.order_id)}
                    >
                      {singlePushOrderId === item.order_id
                        ? t("orders.kiotviet.precheck.pushOneLoading", "Đang đẩy...")
                        : t("orders.kiotviet.precheck.pushOne", "Đẩy")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t("common.cancel", "Hủy")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
