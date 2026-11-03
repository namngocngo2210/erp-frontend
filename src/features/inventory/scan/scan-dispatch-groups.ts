import { MANUAL_DISPATCH_SKIP_LABELS } from "@/features/inventory/manual-dispatch-queries";
import type { ManualDispatchResult } from "@/features/inventory/manual-dispatch-queries";

import type { DispatchResult, LookupOrder } from "./scan-types";

/**
 * Task 7 — quét kho khớp thêm theo MÃ HOÁ ĐƠN (xem shipping_lookup_view.py). Đơn
 * khớp mã hoá đơn phải trừ tồn ở kho CỦA ĐƠN (`fulfillment_warehouse_id`), không
 * phải kho đang chọn ở đầu màn hình — cùng luật fail-loud với cron
 * (`pending_scan_service._process_one`). Đừng đổi câu dưới đây khỏi khớp cron.
 */
export const INVOICE_MATCH_MISSING_WAREHOUSE_ERROR =
  "Đơn thiếu kho xuất — bổ sung kho trên đơn rồi quét lại.";

export type MatchedScanRow = { code: string; order: LookupOrder };

export type InvoiceDispatchGroup = { warehouseId: number; rows: MatchedScanRow[] };

export type SplitMatchedRows = {
  /** matched_by "shipping"/"recall" — đi qua dispatch-batch, kho của màn quét. */
  viaScanWarehouse: MatchedScanRow[];
  /** matched_by "invoice", có kho xuất trên đơn — nhóm theo kho để gọi endpoint
   * xuất kho tay (Task 1) đúng 1 lần cho mỗi kho thay vì 1 lần/đơn. */
  invoiceGroups: InvoiceDispatchGroup[];
  /** matched_by "invoice" nhưng đơn thiếu kho xuất — KHÔNG gửi đi, báo lỗi ngay
   * tại dòng đó (không rơi về kho màn quét). */
  missingWarehouse: MatchedScanRow[];
};

/**
 * Chia các dòng đã quét (matched) thành 2 nhóm xử lý theo `matched_by`. Xem
 * ScanDispatchDialog.handleConfirm — nhóm "shipping"/"recall" giữ nguyên hành vi
 * dispatch-batch cũ, nhóm "invoice" đi đường riêng (kho của đơn).
 */
export function splitMatchedRowsByDispatchRoute(rows: MatchedScanRow[]): SplitMatchedRows {
  const viaScanWarehouse: MatchedScanRow[] = [];
  const missingWarehouse: MatchedScanRow[] = [];
  const byWarehouse = new Map<number, MatchedScanRow[]>();

  for (const row of rows) {
    // Whitelist tích cực (không phải phủ định `!== "invoice"`): union hôm nay chỉ có
    // 3 giá trị nên phủ định vẫn đúng, nhưng một giá trị `matched_by` thứ 4 trong
    // tương lai sẽ lọt thẳng vào viaScanWarehouse — đúng lỗi trừ-nhầm-kho mà module
    // này tồn tại để chặn. Nhánh else dưới ép "invoice" qua kiểm tra `never` để một
    // giá trị mới trở thành LỖI BIÊN DỊCH ở đây thay vì một điểm khớp im lặng.
    if (row.order.matched_by === "shipping" || row.order.matched_by === "recall") {
      viaScanWarehouse.push(row);
      continue;
    }
    if (row.order.matched_by !== "invoice") {
      const _exhaustive: never = row.order.matched_by;
      throw new Error(`unknown matched_by: ${_exhaustive}`);
    }
    const warehouseId = row.order.fulfillment_warehouse_id;
    if (warehouseId == null) {
      missingWarehouse.push(row);
      continue;
    }
    const group = byWarehouse.get(warehouseId);
    if (group) group.push(row);
    else byWarehouse.set(warehouseId, [row]);
  }

  const invoiceGroups = [...byWarehouse.entries()].map(([warehouseId, groupRows]) => ({
    warehouseId,
    rows: groupRows,
  }));

  return { viaScanWarehouse, invoiceGroups, missingWarehouse };
}

/**
 * Chuyển {confirmed, skipped} của `POST /api/inventory/orders/dispatch` (Task 1)
 * sang `DispatchResult[]` để dùng chung badge/summary với nhánh dispatch-batch.
 *
 * `reason === "already_dispatched"` KHÔNG được coi là lỗi: quét lại 1 kiện đã xuất
 * là chuyện thường ngày ở kho (idempotent), đúng ý nghĩa với nhánh shipping/recall
 * (dispatch-batch trả `ok:true, warnings:["already_dispatched"]` cho cùng tình
 * huống — xem `dispatchResultBadge`/`ScanDispatchDialog` render badge hổ phách
 * "⚠ Đã xuất kho trước đó", KHÔNG bíp lỗi). Map nó vào `ok:false` sẽ khiến 1 sự
 * kiện vô hại kêu bíp lỗi và rơi vào toast "N đơn không xuất kho được" giống hệt
 * đơn bị hủy thật — đánh lạc hướng người quét kho.
 */
export function toDispatchResults(
  rows: MatchedScanRow[],
  manualResult: ManualDispatchResult,
): DispatchResult[] {
  const confirmed = new Set(manualResult.confirmed);
  const skipReason = new Map(manualResult.skipped.map((s) => [s.order_id, s.reason]));
  return rows.map((row) => {
    const orderId = row.order.order_id;
    if (confirmed.has(orderId)) return { order_id: orderId, ok: true };
    const reason = skipReason.get(orderId);
    if (reason === "already_dispatched") {
      return { order_id: orderId, ok: true, warnings: ["already_dispatched"] };
    }
    return {
      order_id: orderId,
      ok: false,
      error: reason != null ? (MANUAL_DISPATCH_SKIP_LABELS[reason] ?? reason) : "lỗi",
    };
  });
}

/** Kết quả lỗi ngay tại chỗ cho các dòng invoice thiếu kho xuất — không gọi API. */
export function missingWarehouseResults(rows: MatchedScanRow[]): DispatchResult[] {
  return rows.map((row) => ({
    order_id: row.order.order_id,
    ok: false,
    error: INVOICE_MATCH_MISSING_WAREHOUSE_ERROR,
  }));
}
