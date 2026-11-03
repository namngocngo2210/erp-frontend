import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { datetimeLocalToIso, isoToDatetimeLocal } from "@/lib/datetime-local";
import type { OrderCRMRow, OrderRow } from "@/features/orders/order-types";
import { formatDateTimeVi } from "@/lib/format";
import { NativeCellSelect } from "@/components/ui/native-cell-select";

const SALES_STATUS_NEEDS_FOLLOWUP = new Set<string>([
  "scheduled",
  "call_back_later",
  "closed_scheduled_date",
]);

function defaultFollowupLocal(code: string): string {
  // closed_scheduled_date defaults to tomorrow morning; the other two default
  // to "now + 2 hours" so the sale has a sensible non-empty starting point.
  const d = new Date();
  if (code === "closed_scheduled_date") {
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
  } else {
    d.setHours(d.getHours() + 2);
    d.setMinutes(0, 0, 0);
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SalesStatusInlineEditor({
  row,
  options,
  canEdit,
  onPatch,
}: {
  row: OrderRow;
  options: Array<{ value: string; label: string }>;
  canEdit: boolean;
  onPatch?: (id: number, payload: Partial<OrderRow>, silent?: boolean) => Promise<void>;
}) {
  const currentCode = row.crm?.sales_status_code || "";
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [draftLocal, setDraftLocal] = useState("");

  const commit = (newCode: string, nextFollowupAt: string | null) => {
    const opt = options.find((o) => o.value === newCode);
    const crmPatch: Partial<OrderCRMRow> = {
      sales_status_code: newCode || null,
      sales_status_label: opt?.label || null,
    };
    if (newCode && SALES_STATUS_NEEDS_FOLLOWUP.has(newCode)) {
      crmPatch.next_followup_at = nextFollowupAt;
    } else {
      crmPatch.next_followup_at = null;
    }
    onPatch?.(row.id, {
      crm: { ...row.crm, ...crmPatch },
    } as Partial<OrderRow>);
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    const newCode = e.target.value;
    if (newCode && SALES_STATUS_NEEDS_FOLLOWUP.has(newCode)) {
      const seed = isoToDatetimeLocal(row.crm?.next_followup_at) || defaultFollowupLocal(newCode);
      setDraftLocal(seed);
      setPendingCode(newCode);
      return;
    }
    commit(newCode, null);
  };

  const closeDialog = () => {
    setPendingCode(null);
    setDraftLocal("");
  };

  const handleConfirm = () => {
    const iso = datetimeLocalToIso(draftLocal);
    if (!iso || !pendingCode) return;
    commit(pendingCode, iso);
    closeDialog();
  };

  return (
    <>
      <NativeCellSelect
        className="min-w-[160px]"
        value={currentCode}
        disabled={!canEdit}
        onClick={(e) => e.stopPropagation()}
        onChange={handleChange}
      >
        <option value="">-</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </NativeCellSelect>

      <Dialog
        open={pendingCode !== null}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Chọn giờ nhắc Lark</DialogTitle>
            <DialogDescription>
              Trạng thái{" "}
              <span className="font-medium">
                {options.find((o) => o.value === pendingCode)?.label ?? pendingCode}
              </span>{" "}
              cần thời điểm nhắc. Bot Lark sẽ gửi nhắc đúng giờ này cho nhân viên phụ trách.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <input
              type="datetime-local"
              autoFocus
              value={draftLocal}
              onChange={(e) => setDraftLocal(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
            {row.crm?.next_followup_at && (
              <p className="mt-2 text-xs text-muted-foreground">
                Hiện đang nhắc lúc: {formatDateTimeVi(row.crm.next_followup_at)}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Huỷ
            </Button>
            <Button onClick={handleConfirm} disabled={!datetimeLocalToIso(draftLocal)}>
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
