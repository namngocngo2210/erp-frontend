import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import type { OrderRecallEntryRow, OrderRow } from "@/features/orders/order-types";

import { nextRecallEntries, type RecallEntryField } from "./recall-logic";
import type { OrderPatchHandler } from "./types";

/** Ô input dùng chung cho cả 3 field của một đợt — cùng cỡ, cùng trạng thái disabled. */
const RECALL_INPUT_CLASS =
  "h-7 rounded border border-border bg-transparent px-1.5 text-xs focus:outline-hidden focus:ring-1 focus:ring-ring disabled:cursor-default disabled:opacity-60";

/**
 * Cột "Đợt thu hồi" trên lưới: MỘT ô gộp cả nhóm (mã đơn + ngày tạo + ngày
 * nhận), mỗi đợt một dòng.
 *
 * Trước đây đây là ba cột rời, mỗi cột một cell render độc lập — không có
 * component cha giữ state nên không thể có nút "+ thêm đợt" (bấm thì chỉ cột đó
 * dài ra, hai cột kia đứng yên, phá bất biến "dòng thứ i của ba cột là cùng một
 * đợt"). Gộp lại thành một cell thì state cục bộ nằm chung, nút thêm/xoá hoạt
 * động được và ba ô của một đợt luôn nằm đúng trên một dòng.
 */
export function RecallEntriesCell({
  row,
  onPatch,
}: {
  row: OrderRow;
  onPatch: OrderPatchHandler | undefined;
}) {
  const canEdit = !!row.can_edit && !!onPatch;
  const entries = row.recall_entries ?? [];

  // Số dòng trống người dùng vừa thêm bằng nút "+ Thêm đợt" (chưa có ở server).
  // Reset về 0 ngay khi server trả về số đợt khác đi — nghĩa là dòng vừa gõ đã
  // thành đợt thật, giữ lại thì ô sẽ thừa một dòng trống sau mỗi lần lưu.
  // Chỉnh state ngay trong render (không useEffect) để không có nhịp render thừa.
  const [extraRows, setExtraRows] = useState(0);
  const [seenCount, setSeenCount] = useState(entries.length);
  if (seenCount !== entries.length) {
    setSeenCount(entries.length);
    setExtraRows(0);
  }

  // Đơn chưa có đợt nào vẫn hiện đúng một dòng trống để gõ thẳng vào.
  const rowCount = Math.max(1, entries.length + extraRows);

  const patchEntries = (next: OrderRecallEntryRow[]) => {
    onPatch?.(row.id, { recall_entries: next } as Partial<OrderRow>);
  };

  const removeRow = (index: number) => {
    if (index >= entries.length) {
      setExtraRows((count) => Math.max(0, count - 1));
      return;
    }
    patchEntries(
      entries
        .filter((_, i) => i !== index)
        .map((entry) => ({
          recall_code: entry.recall_code ?? "",
          recall_created_date: entry.recall_created_date ?? null,
          recall_received_date: entry.recall_received_date ?? null,
        })),
    );
  };

  const renderInput = (
    index: number,
    entry: OrderRecallEntryRow | null,
    field: RecallEntryField,
    label: string,
    className: string,
  ) => {
    const isCode = field === "recall_code";
    const raw = entry ? entry[field] : null;
    const value = isCode ? (raw ?? "") : raw ? String(raw).slice(0, 10) : "";
    return (
      <input
        type={isCode ? "text" : "date"}
        aria-label={`${label} #${index + 1}`}
        title={label}
        placeholder={isCode ? label : undefined}
        className={`${RECALL_INPUT_CLASS} ${className}`}
        defaultValue={value}
        disabled={!canEdit}
        onClick={(e) => e.stopPropagation()}
        onBlur={(e) => {
          const next = isCode ? e.target.value.trim() : e.target.value;
          if (next === value) return;
          patchEntries(nextRecallEntries(entries, index, field, next || null));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
    );
  };

  return (
    <div className="flex min-w-[430px] flex-col gap-1">
      {Array.from({ length: rowCount }, (_, index) => {
        const entry = entries[index] ?? null;
        // Dòng trống "mồi" của đơn chưa có đợt nào: chưa phải một đợt, không có gì để xoá.
        const isSeedRow = index >= entries.length + extraRows;
        return (
          <div key={entry?.id ?? `new-${index}`} className="flex items-center gap-1">
            <span className="w-5 shrink-0 text-xs leading-none text-muted-foreground">
              #{index + 1}
            </span>
            {renderInput(index, entry, "recall_code", "Mã đơn thu hồi", "w-[120px] shrink-0")}
            {renderInput(
              index,
              entry,
              "recall_created_date",
              "Ngày tạo đơn thu hồi",
              "w-[124px] shrink-0",
            )}
            {renderInput(
              index,
              entry,
              "recall_received_date",
              "Ngày nhận hàng thu hồi",
              "w-[124px] shrink-0",
            )}
            {canEdit && !isSeedRow ? (
              <button
                type="button"
                aria-label={`Xoá đợt #${index + 1}`}
                title={`Xoá đợt #${index + 1}`}
                className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  removeRow(index);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : (
              <span className="w-3.5 shrink-0" />
            )}
          </div>
        );
      })}
      {canEdit ? (
        <button
          type="button"
          className="flex items-center gap-1 self-start text-xs text-primary hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            setExtraRows((count) => count + 1);
          }}
        >
          <Plus className="h-3 w-3" />
          Thêm đợt
        </button>
      ) : null}
    </div>
  );
}
