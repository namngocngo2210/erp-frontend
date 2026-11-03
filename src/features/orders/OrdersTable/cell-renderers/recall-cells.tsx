import type { OrderColumnKey, OrderRow } from "@/features/orders/order-types";

import { RecallEntriesCell } from "./RecallEntriesCell";
import type { CellRenderer, OrderPatchHandler } from "./types";

// ─────────────────────────────────────────────────────────────
// Cột thu hồi — nhóm đợt thu hồi 1-N (RecallEntriesCell.tsx,
// logic thuần ở recall-logic.ts) và mã phiếu trả hàng.
// ─────────────────────────────────────────────────────────────

/** `return_slip_code` là trường đơn (không xếp nhóm) — bản rút gọn của renderer thu hồi cũ. */
function renderReturnSlipText(row: OrderRow, onPatch: OrderPatchHandler | undefined) {
  const canEdit = !!row.can_edit && !!onPatch;
  const value = row.recall?.return_slip_code ?? "";
  return (
    <input
      type="text"
      className="h-7 w-full min-w-[130px] rounded border border-border bg-transparent px-1.5 text-xs focus:outline-hidden focus:ring-1 focus:ring-ring disabled:cursor-default disabled:opacity-60"
      defaultValue={value}
      disabled={!canEdit}
      onClick={(e) => e.stopPropagation()}
      onBlur={(e) => {
        const next = e.target.value.trim();
        if (next === (value || "").trim()) return;
        onPatch?.(row.id, { recall: { return_slip_code: next || null } } as Partial<OrderRow>);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

export const RECALL_CELL_RENDERERS: Partial<Record<OrderColumnKey, CellRenderer>> = {
  recall_entries: ({ row, onPatch }) => <RecallEntriesCell row={row} onPatch={onPatch} />,
  return_slip_code: ({ row, onPatch }) => renderReturnSlipText(row, onPatch),
};
