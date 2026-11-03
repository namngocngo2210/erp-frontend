import { useEffect, useState } from "react";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormDialogShell, FormGrid } from "@/components/ui/form-dialog-content";

import { OrderPicker } from "./OrderPicker";
import type {
  OrderSearchResult,
  WarrantyClaimPayload,
} from "@/features/warranty-claims/warranty-claim-types";
import { formatCurrency } from "@/lib/format";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onSubmit: (payload: WarrantyClaimPayload) => void;
}

const labelClass = "mb-1 block text-sm font-medium text-muted-foreground";

/**
 * Form tạo phiếu bảo hành — chỉ còn 2 field cấp phiếu (`order_id` +
 * `customer_report_date`); phần nghiệp vụ chi tiết (§2-§7) chuyển xuống
 * hành trình đầu tiên, tạo tự động ở backend khi POST /warranty/claims và
 * chỉnh sửa sau ở trang chi tiết qua `JourneyCard`. Không còn chế độ sửa —
 * sửa cấp phiếu (ngày báo lỗi) làm trực tiếp ở §1 trang chi tiết.
 */
export function WarrantyClaimFormDialog({ open, onOpenChange, isPending, onSubmit }: Props) {
  const [order, setOrder] = useState<OrderSearchResult | null>(null);
  const [customerReportDate, setCustomerReportDate] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setOrder(null);
    setCustomerReportDate("");
  }, [open]);

  const handleSubmit = () => {
    if (isPending) return;
    if (!order) {
      setError("Vui lòng chọn đơn hàng.");
      return;
    }
    onSubmit({ order_id: order.id, customer_report_date: customerReportDate || null });
  };

  const money = (v: string) => formatCurrency(v, { style: "symbol", onInvalid: "raw" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogShell
        title="Thêm bảo hành"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="button" disabled={isPending} onClick={handleSubmit}>
              {isPending ? "Đang lưu..." : "Tạo"}
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
          <div className="mb-4">
            <label className={labelClass}>Đơn hàng</label>
            <OrderPicker value={order} onChange={setOrder} />
          </div>

          {/* Thông tin đơn (read-only, live) */}
          {order && (
            <div className="mb-4 rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">Khách: </span>
                  {order.name}
                </div>
                <div>
                  <span className="text-muted-foreground">SĐT: </span>
                  {order.phone}
                </div>
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">Địa chỉ: </span>
                  {order.address}
                </div>
                <div>
                  <span className="text-muted-foreground">SP/SKU: </span>
                  {order.product} ({order.sku})
                </div>
                <div>
                  <span className="text-muted-foreground">Số tiền: </span>
                  {money(order.total_after_discount)}
                </div>
                <div>
                  <span className="text-muted-foreground">Mã vận đơn: </span>
                  {order.shipping_code || "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Mã đơn: </span>
                  {order.order_code || "—"}
                </div>
              </div>
            </div>
          )}

          <FormGrid>
            <div>
              <label className={labelClass}>Ngày khách báo lỗi</label>
              <Input
                type="date"
                value={customerReportDate}
                onChange={(e) => setCustomerReportDate(e.target.value)}
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
