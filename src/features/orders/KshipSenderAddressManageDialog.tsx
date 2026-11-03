import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/i18n";
import type { KshipSenderAddress, KshipSenderAddressInput } from "@/lib/api/orders";
import { useKshipSenderAddressMutations } from "@/features/orders/use-kship-sender-addresses";

type Props = {
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  addresses: KshipSenderAddress[];
};

const EMPTY_FORM: KshipSenderAddressInput = {
  name: "",
  location_id: 0,
  ward_id: 0,
  address: "",
  mobile: "",
};

/** Quản lý địa chỉ điểm gửi KShip. Chỉ render khi user có kiotviet:edit (gate ở caller). */
export function KshipSenderAddressManageDialog({ open, onOpenChange, addresses }: Props) {
  const { t } = useI18n();
  const { create, update, remove } = useKshipSenderAddressMutations();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<KshipSenderAddressInput>(EMPTY_FORM);
  const [formOpen, setFormOpen] = useState(false);
  const mutating = create.isPending || update.isPending || remove.isPending;

  // Dialog sống cùng trang (không unmount khi đóng) → phải tự dọn state, nếu không lần
  // mở sau vẫn ở chế độ sửa địa chỉ cũ với dữ liệu nhập dở từ phiên trước; bấm Lưu sẽ
  // PATCH đè giá trị stale (có thể người khác đã sửa bản ghi đó).
  useEffect(() => {
    if (open) return;
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }, [open]);

  const startCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };
  const startEdit = (addr: KshipSenderAddress) => {
    setEditingId(addr.id);
    setForm({
      name: addr.name,
      location_id: addr.location_id,
      ward_id: addr.ward_id,
      address: addr.address,
      mobile: addr.mobile,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.address.trim() || !form.mobile.trim()) {
      toast.error(t("orders.kiotviet.kshipSenderFormIncomplete", "Điền đủ tên, địa chỉ, SĐT."));
      return;
    }
    if (form.location_id <= 0 || form.ward_id <= 0) {
      toast.error(
        t("orders.kiotviet.kshipSenderIdInvalid", "location_id/ward_id phải là số nguyên dương."),
      );
      return;
    }
    try {
      if (editingId !== null) {
        await update.mutateAsync({ id: editingId, patch: form });
      } else {
        await create.mutateAsync(form);
      }
      setFormOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lưu địa chỉ gửi thất bại.");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await remove.mutateAsync(id);
      if (editingId === id) {
        setFormOpen(false);
        setEditingId(null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Xóa địa chỉ gửi thất bại.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("orders.kiotviet.kshipSenderManage", "Quản lý địa chỉ gửi")}</DialogTitle>
        </DialogHeader>

        <div className="rounded-md border border-action-warning/30 bg-action-warning/10 p-2 text-xs text-action-warning">
          {t(
            "orders.kiotviet.kshipSenderIdWarning",
            "location_id / ward_id là ID nội bộ KiotViet — nhập sai sẽ tạo vận đơn SAI điểm gửi.",
          )}
        </div>

        <div className="max-h-80 space-y-1 overflow-y-auto">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className="flex items-center gap-2 rounded-md border border-border p-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{addr.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {addr.address} · {addr.mobile} · loc {addr.location_id} / ward {addr.ward_id}
                </div>
              </div>
              <Button variant="ghost" size="sm" disabled={mutating} onClick={() => startEdit(addr)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={mutating}
                onClick={() => void handleDelete(addr.id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        {formOpen ? (
          <div className="space-y-2 rounded-md border border-border p-3">
            <input
              type="text"
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              placeholder={t("orders.kiotviet.kshipSenderName", "Tên điểm gửi (vd: Kho Văn Quán)")}
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <div className="flex gap-2">
              <input
                type="number"
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                placeholder="location_id"
                value={form.location_id || ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, location_id: Number(e.target.value) || 0 }))
                }
              />
              <input
                type="number"
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                placeholder="ward_id"
                value={form.ward_id || ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, ward_id: Number(e.target.value) || 0 }))
                }
              />
            </div>
            <input
              type="text"
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              placeholder={t("orders.kiotviet.kshipSenderAddressField", "Địa chỉ")}
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
            />
            <input
              type="text"
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              placeholder={t("orders.kiotviet.kshipSenderMobile", "SĐT người gửi")}
              value={form.mobile}
              onChange={(e) => setForm((prev) => ({ ...prev, mobile: e.target.value }))}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setFormOpen(false)}>
                {t("common.cancel", "Hủy")}
              </Button>
              <Button
                size="sm"
                disabled={create.isPending || update.isPending}
                onClick={() => void handleSave()}
              >
                {t("common.save", "Lưu")}
              </Button>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={startCreate}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            {t("orders.kiotviet.kshipSenderAdd", "Thêm địa chỉ")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
