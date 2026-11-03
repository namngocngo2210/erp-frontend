import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormDialogShell } from "@/components/ui/form-dialog-content";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { type FlowTransition } from "@/lib/api/contact-flow";
import { useCreateTransition, useResults, useStages, useUpdateTransition } from "../queries";
import { DelayInput } from "./delay-input";

const END_STAGE_VALUE = "";

type TransitionForm = {
  fromStageId: string;
  toStageId: string;
  resultId: string;
  delayMinutes: number | null;
};

function toForm(transition: FlowTransition | null): TransitionForm {
  if (!transition) {
    return { fromStageId: "", toStageId: END_STAGE_VALUE, resultId: "", delayMinutes: null };
  }
  return {
    fromStageId: String(transition.from_stage_id),
    toStageId: transition.to_stage_id != null ? String(transition.to_stage_id) : END_STAGE_VALUE,
    resultId: String(transition.result_id),
    delayMinutes: transition.delay_minutes ?? null,
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: FlowTransition | null;
};

/**
 * Dialog Thêm/Sửa cấu hình chuyển bước (Transition): từ trạng thái nào, với kết
 * quả nào thì chuyển sang trạng thái kế tiếp (hoặc kết thúc flow) sau bao lâu.
 */
export function TransitionFormDialog({ open, onOpenChange, editing }: Props) {
  const [form, setForm] = useState<TransitionForm>(toForm(null));
  const { data: stages = [] } = useStages();
  const { data: results = [] } = useResults();
  const createMutation = useCreateTransition();
  const updateMutation = useUpdateTransition();
  const saving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) setForm(toForm(editing));
  }, [open, editing]);

  const fromStageOptions = useMemo(
    () => stages.map((s) => ({ value: String(s.id), label: s.name })),
    [stages],
  );
  const toStageOptions = useMemo(
    () => [
      { value: END_STAGE_VALUE, label: "— Kết thúc —" },
      ...stages.map((s) => ({ value: String(s.id), label: s.name })),
    ],
    [stages],
  );
  const resultOptions = useMemo(
    () => results.map((r) => ({ value: String(r.id), label: r.name })),
    [results],
  );

  const handleSubmit = async () => {
    if (!form.fromStageId || !form.resultId) {
      toast.error("Vui lòng chọn đủ trạng thái nguồn và kết quả.");
      return;
    }
    const body = {
      from_stage_id: Number(form.fromStageId),
      result_id: Number(form.resultId),
      to_stage_id: form.toStageId ? Number(form.toStageId) : null,
      delay_minutes: form.toStageId ? form.delayMinutes : null,
    };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, body });
        toast.success("Đã cập nhật chuyển bước.");
      } else {
        await createMutation.mutateAsync(body);
        toast.success("Đã tạo chuyển bước mới.");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lưu chuyển bước thất bại.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogShell
        title={editing ? "Sửa chuyển bước" : "Thêm chuyển bước"}
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
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Từ trạng thái</label>
            <SearchableSelect
              options={fromStageOptions}
              value={form.fromStageId}
              onChange={(value) => setForm((prev) => ({ ...prev, fromStageId: value }))}
              placeholder="Chọn trạng thái nguồn..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Kết quả</label>
            <SearchableSelect
              options={resultOptions}
              value={form.resultId}
              onChange={(value) => setForm((prev) => ({ ...prev, resultId: value }))}
              placeholder="Chọn kết quả..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Đến trạng thái</label>
            <SearchableSelect
              options={toStageOptions}
              value={form.toStageId}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  toStageId: value,
                  delayMinutes: value ? prev.delayMinutes : null,
                }))
              }
              placeholder="Chọn trạng thái đích..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Độ trễ chuyển bước</label>
            <DelayInput
              minutes={form.delayMinutes}
              onChange={(minutes) => setForm((prev) => ({ ...prev, delayMinutes: minutes }))}
              disabled={!form.toStageId}
            />
          </div>
        </div>
      </FormDialogShell>
    </Dialog>
  );
}
