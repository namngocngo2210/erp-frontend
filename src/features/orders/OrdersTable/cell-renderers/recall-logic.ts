import type { OrderRecallEntryRow } from "@/features/orders/order-types";

export type RecallEntryField = "recall_code" | "recall_created_date" | "recall_received_date";

/**
 * Dựng mảng nhóm mới từ một ô vừa sửa. Backend nhận full-replace nên mọi lần sửa
 * đều phải gửi trọn danh sách — trả về mảng đã bỏ `id` (backend xoá-tạo lại).
 */
export function nextRecallEntries(
  entries: OrderRecallEntryRow[],
  index: number,
  field: RecallEntryField,
  value: string | null,
): OrderRecallEntryRow[] {
  const base = entries.map((entry) => ({
    recall_code: entry.recall_code ?? "",
    recall_created_date: entry.recall_created_date ?? null,
    recall_received_date: entry.recall_received_date ?? null,
  }));
  while (base.length <= index) {
    base.push({ recall_code: "", recall_created_date: null, recall_received_date: null });
  }
  base[index] = { ...base[index], [field]: value };
  return base;
}
