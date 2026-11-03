// Logic thuần gộp thay đổi chờ lưu của trang chi tiết đơn (test trực tiếp).
import type { OrderCRMRow, OrderRecallRow, OrderRow } from "../order-types";

export type PendingRows = Record<string, string | boolean>;

const isObject = (value: unknown): value is object => !!value && typeof value === "object";

/**
 * Gộp patch mới vào pending. Deep-merge `crm`/`recall` để giữ các field đã sửa
 * trước đó khi user tiếp tục sửa field khác cùng object (spread cạn sẽ ghi đè cả object).
 */
export function mergePendingPatch(prev: PendingRows, payload: Partial<OrderRow>): PendingRows {
  const next: Record<string, unknown> = { ...prev, ...payload };
  const incomingCrm = (payload as { crm?: unknown }).crm;
  if (isObject(incomingCrm)) {
    const prevCrm = (prev as { crm?: unknown }).crm;
    next.crm = { ...(isObject(prevCrm) ? prevCrm : {}), ...incomingCrm };
  }
  const incomingRecall = (payload as { recall?: unknown }).recall;
  if (isObject(incomingRecall)) {
    const prevRecall = (prev as { recall?: unknown }).recall;
    next.recall = { ...(isObject(prevRecall) ? prevRecall : {}), ...incomingRecall };
  }
  return next as PendingRows;
}

/**
 * Đơn để hiển thị = đơn gốc + pending. CRM/recall deep-merge vì pending chỉ chứa
 * các field vừa sửa — shallow merge sẽ làm mất các field chưa sửa khỏi UI.
 */
export function applyPendingToOrder(order: OrderRow, pendingRows: PendingRows): OrderRow {
  const merged = { ...order, ...pendingRows } as OrderRow & {
    crm?: OrderCRMRow | null;
    recall?: OrderRecallRow | null;
  };
  const pendingCrm = (pendingRows as { crm?: unknown }).crm;
  if (isObject(pendingCrm)) {
    merged.crm = { ...(order.crm ?? {}), ...(pendingCrm as Partial<OrderCRMRow>) };
  }
  const pendingRecall = (pendingRows as { recall?: unknown }).recall;
  if (isObject(pendingRecall)) {
    merged.recall = { ...(order.recall ?? {}), ...(pendingRecall as Partial<OrderRecallRow>) };
  }
  return merged as OrderRow;
}

/** Bỏ các key bị khoá khỏi payload. */
export function omitKeys(incoming: Partial<OrderRow>, blocked: string[]): Partial<OrderRow> {
  return Object.fromEntries(
    Object.entries(incoming).filter(([key]) => !blocked.includes(key)),
  ) as Partial<OrderRow>;
}
