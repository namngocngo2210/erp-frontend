import type { Dispatch, SetStateAction } from "react";
import { ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ResaleTrackingRow } from "@/lib/api/customers";
import { CONTACT_CHANNELS, formatCurrency } from "../resale-format";
import type { ResaleOrderForm } from "./resale-tracking-state";

type Props = {
  row: ResaleTrackingRow | null;
  form: ResaleOrderForm;
  setForm: Dispatch<SetStateAction<ResaleOrderForm>>;
  saving: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
};

export function ResaleOrderDialog({ row, form, setForm, saving, onClose, onSubmit }: Props) {
  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-130">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="h-4 w-4 text-primary" />
            Ghi nhận đơn resale
          </DialogTitle>
        </DialogHeader>
        {row && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {row.recipient.name || row.customer.full_name} -{" "}
              {row.recipient.phone || row.customer.phone} · Sale: {row.sale_staff_name || "-"}
            </p>
            <div>
              <p className="mb-2 text-sm font-medium">
                Đơn resale trước đây ({row.resale_orders?.length || 0} đơn)
              </p>
              <div className="max-h-24 overflow-auto rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                {(row.resale_orders || []).length === 0
                  ? "Chưa có đơn resale"
                  : row.resale_orders
                      ?.slice(-3)
                      .reverse()
                      .map((item, index) => (
                        <div key={`${item.created_at || "resale"}-${index}`}>
                          {item.product} x{item.quantity || 1} -{" "}
                          {formatCurrency(item.order_value || "0")}đ
                        </div>
                      ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Sản phẩm resale</label>
              <Select
                value={row.products.includes(form.product) ? form.product : "__custom__"}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    product: value === "__custom__" ? "" : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__custom__">Nhập sản phẩm khác</SelectItem>
                  {row.products.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!row.products.includes(form.product) && (
                <Input
                  className="mt-2"
                  value={form.product}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, product: event.target.value }))
                  }
                  placeholder="VD: BNC02 - Bồn ngâm chân"
                />
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Số lượng</label>
                <Input
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      quantity: Math.max(1, Number(event.target.value) || 1),
                    }))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Giá trị đơn (đ)</label>
                <Input
                  value={form.order_value}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      order_value: event.target.value.replace(/[^\d.]/g, ""),
                    }))
                  }
                  placeholder="VD: 1999000"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Kênh chốt đơn</label>
              <Select
                value={form.channel}
                onValueChange={(value) => setForm((prev) => ({ ...prev, channel: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_CHANNELS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Ghi chú</label>
              <Textarea
                value={form.note}
                onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                placeholder="VD: Khách mua thêm cho mẹ sau khi dùng thấy hiệu quả..."
                className="min-h-18"
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={() => onSubmit().catch(() => null)} disabled={saving}>
            Lưu đơn resale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
