import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormDialogShell } from "@/components/ui/form-dialog-content";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { type FlowResult } from "@/lib/api/contact-flow";
import { useCreateResult, useUpdateResult } from "../queries";

type ResultForm = {
  name: string;
  color: string;
  is_close: boolean;
  requires_schedule: boolean;
  is_active: boolean;
};

const EMPTY_FORM: ResultForm = {
  name: "",
  color: "#1C7ED6",
  is_close: false,
  requires_schedule: false,
  is_active: true,
};

function toForm(result: FlowResult | null): ResultForm {
  if (!result) return EMPTY_FORM;
  return {
    name: result.name ?? "",
    color: result.color ?? "#1C7ED6",
    is_close: result.is_close ?? false,
    requires_schedule: result.requires_schedule ?? false,
    is_active: result.is_active ?? true,
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: FlowResult | null;
};

/** Dialog Thêm/Sửa kết quả liên hệ (Result) trong flow tác nghiệp. */
export function ResultFormDialog({ open, onOpenChange, editing }: Props) {
  const [form, setForm] = useState<ResultForm>(EMPTY_FORM);
  const createMutation = useCreateResult();
  const updateMutation = useUpdateResult();
  const saving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) setForm(toForm(editing));
  }, [open, editing]);

  const handleSubmit = async () => {
    const name = form.name.trim();
    if (!name) {
      toast.error("Vui lòng nhập tên kết quả.");
      return;
    }
    const body = { ...form, name };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, body });
        toast.success("Đã cập nhật kết quả.");
      } else {
        await createMutation.mutateAsync(body);
        toast.success("Đã tạo kết quả mới.");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lưu kết quả thất bại.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogShell
        title={editing ? "Sửa kết quả" : "Thêm kết quả"}
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
            <label className="text-sm font-medium text-foreground">Tên kết quả</label>
            <Input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Vd: Khách đồng ý mua"
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
          <div className="flex flex-col justify-end gap-3 sm:flex-row sm:flex-wrap">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Switch
                checked={form.is_close}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_close: checked }))}
              />
              Đóng ca (kết thúc chăm sóc)
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Switch
                checked={form.requires_schedule}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, requires_schedule: checked }))
                }
              />
              Bắt buộc hẹn lịch
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
