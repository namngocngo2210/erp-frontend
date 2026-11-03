import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormDialogShell } from "@/components/ui/form-dialog-content";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { type FlowStage } from "@/lib/api/contact-flow";
import { useCreateStage, useUpdateStage } from "../queries";

type StageForm = {
  name: string;
  color: string;
  is_start: boolean;
  allow_edit_due: boolean;
  pool_enabled: boolean;
  pool_minutes: number;
  customer_label: string;
  is_active: boolean;
};

const EMPTY_FORM: StageForm = {
  name: "",
  color: "#1C7ED6",
  is_start: false,
  allow_edit_due: false,
  pool_enabled: false,
  pool_minutes: 0,
  customer_label: "",
  is_active: true,
};

function toForm(stage: FlowStage | null): StageForm {
  if (!stage) return EMPTY_FORM;
  return {
    name: stage.name ?? "",
    color: stage.color ?? "#1C7ED6",
    is_start: stage.is_start ?? false,
    allow_edit_due: stage.allow_edit_due ?? false,
    pool_enabled: stage.pool_enabled ?? false,
    pool_minutes: stage.pool_minutes ?? 0,
    customer_label: stage.customer_label ?? "",
    is_active: stage.is_active ?? true,
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: FlowStage | null;
};

/** Dialog Thêm/Sửa trạng thái (Stage) trong flow tác nghiệp. */
export function StageFormDialog({ open, onOpenChange, editing }: Props) {
  const [form, setForm] = useState<StageForm>(EMPTY_FORM);
  const createMutation = useCreateStage();
  const updateMutation = useUpdateStage();
  const saving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) setForm(toForm(editing));
  }, [open, editing]);

  const handleSubmit = async () => {
    const name = form.name.trim();
    if (!name) {
      toast.error("Vui lòng nhập tên trạng thái.");
      return;
    }
    const body = { ...form, name };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, body });
        toast.success("Đã cập nhật trạng thái.");
      } else {
        await createMutation.mutateAsync(body);
        toast.success("Đã tạo trạng thái mới.");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lưu trạng thái thất bại.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogShell
        title={editing ? "Sửa trạng thái" : "Thêm trạng thái"}
        onSubmit={(e) => {
          e.preventDefault();
          if (!saving) void handleSubmit();
        }}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu"}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-foreground">Tên trạng thái</label>
            <Input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Vd: Đang tư vấn"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Màu hiển thị</label>
            <Input
              type="color"
              value={form.color}
              onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))}
              className="h-9 w-full p-1"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Nhãn hiển thị cho KH</label>
            <Input
              value={form.customer_label}
              onChange={(e) => setForm((prev) => ({ ...prev, customer_label: e.target.value }))}
              placeholder="Tùy chọn"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Số phút chờ trong hồ (0 = không giới hạn)
            </label>
            <Input
              type="number"
              min={0}
              value={form.pool_minutes}
              disabled={!form.pool_enabled}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, pool_minutes: Number(e.target.value) || 0 }))
              }
            />
          </div>
          <div className="flex flex-col justify-end gap-3 sm:col-span-2 sm:flex-row sm:flex-wrap">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Switch
                checked={form.is_start}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_start: checked }))}
              />
              Trạng thái bắt đầu
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Switch
                checked={form.allow_edit_due}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, allow_edit_due: checked }))
                }
              />
              Cho phép sửa hạn xử lý
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Switch
                checked={form.pool_enabled}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, pool_enabled: checked }))
                }
              />
              Bật hồ chờ
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_active: checked }))}
              />
              Đang hoạt động
            </label>
          </div>
        </div>
      </FormDialogShell>
    </Dialog>
  );
}
