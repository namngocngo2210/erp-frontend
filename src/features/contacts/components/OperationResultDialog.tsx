import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormDialogShell } from "@/components/ui/form-dialog-content";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { datetimeLocalToIso } from "@/lib/datetime-local";
import { useResults } from "@/features/contact-flow/queries";
import { useApplyOperationResult } from "../queries";

type OperationResultDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: number | null;
  customerName: string;
};

/**
 * Dialog "Ghi KQ tác nghiệp" (Task S2-3) — chọn 1 kết quả liên hệ (FlowResult,
 * chỉ option `is_active`), tự chuyển bước theo transition cấu hình ở BE. Khi
 * kết quả `requires_schedule`, bắt buộc chọn giờ hẹn (submit khoá tới khi có).
 */
export function OperationResultDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
}: OperationResultDialogProps) {
  const [resultId, setResultId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const resultsQuery = useResults();
  const applyResult = useApplyOperationResult();

  const activeOptions = useMemo(
    () =>
      (resultsQuery.data ?? [])
        .filter((r) => r.is_active !== false)
        .map((r) => ({ value: String(r.id), label: r.name })),
    [resultsQuery.data],
  );
  const selectedResult = useMemo(
    () => (resultsQuery.data ?? []).find((r) => String(r.id) === resultId) ?? null,
    [resultsQuery.data, resultId],
  );
  const requiresSchedule = Boolean(selectedResult?.requires_schedule);

  useEffect(() => {
    if (open) {
      setResultId("");
      setScheduledAt("");
    }
  }, [open]);

  const canSubmit = Boolean(resultId) && (!requiresSchedule || Boolean(scheduledAt));

  const handleSubmit = () => {
    if (!customerId || !canSubmit) return;
    const scheduledIso = scheduledAt ? datetimeLocalToIso(scheduledAt) : undefined;
    if (requiresSchedule && !scheduledIso) {
      toast.error("Vui lòng chọn giờ hẹn hợp lệ.");
      return;
    }
    applyResult.mutate(
      {
        customerId,
        result_id: Number(resultId),
        scheduled_at: requiresSchedule ? scheduledIso : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Đã ghi kết quả tác nghiệp.");
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Ghi kết quả thất bại.");
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogShell
        title="Ghi kết quả tác nghiệp"
        description={customerName ? `Khách hàng: ${customerName}` : undefined}
        onSubmit={(e) => {
          e.preventDefault();
          if (!applyResult.isPending) handleSubmit();
        }}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={applyResult.isPending}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={!canSubmit || applyResult.isPending}>
              {applyResult.isPending ? "Đang lưu..." : "Lưu"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Kết quả</label>
            <SearchableSelect
              options={activeOptions}
              value={resultId}
              onChange={setResultId}
              placeholder="Chọn kết quả"
            />
          </div>
          {requiresSchedule && (
            <div className="space-y-1.5">
              <label
                htmlFor="operation-result-scheduled-at"
                className="text-sm font-medium text-foreground"
              >
                Giờ hẹn
              </label>
              <Input
                id="operation-result-scheduled-at"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
          )}
        </div>
      </FormDialogShell>
    </Dialog>
  );
}
