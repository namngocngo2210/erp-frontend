import { DEFAULT_RETURN_TYPE } from "../return-line-type";
import type { CreateReturnEntryPayload, ReturnLineInput } from "../returns-types";
import type { LookupOrder } from "./scan-types";

/** Dòng hàng hoàn SỬA ĐƯỢC của 1 mã đã khớp đơn — mặc định full đơn, thủ kho hạ
 * số lượng khi hàng về thiếu (hoàn một phần). */
export type ReturnLineDraft = {
  product_id: number;
  sku: string;
  name: string;
  /** Chuỗi để cho phép đang gõ dở ("" = 0) — build payload mới ép về số. */
  quantity: string;
  /** Số lượng trên đơn gốc — trần của số lượng hoàn (BE cũng chặn vượt outstanding). */
  max: number;
};

export type ScanReturnRow =
  | { kind: "matched"; code: string; order: LookupOrder; lines: ReturnLineDraft[] }
  | { kind: "unmatched"; code: string };

// Loại hoàn nằm ở TỪNG DÒNG (phiếu ngày không còn loại chung) — quét trả mặc định "Hàng hoàn".
export function defaultReturnLines(order: LookupOrder): ReturnLineDraft[] {
  const byProduct = new Map<number, ReturnLineDraft>();
  for (const it of order.items) {
    if (!it.product_id) continue;
    const found = byProduct.get(it.product_id);
    if (found) {
      found.max += it.quantity;
      found.quantity = String(found.max);
    } else {
      byProduct.set(it.product_id, {
        product_id: it.product_id,
        sku: it.sku,
        name: it.name,
        quantity: String(it.quantity),
        max: it.quantity,
      });
    }
  }
  return [...byProduct.values()];
}

/** Thêm mã vừa quét vào đầu danh sách; chặn trùng mã hoặc trùng đơn. */
export function addScanRow(
  rows: ScanReturnRow[],
  code: string,
  order: LookupOrder | null,
): { rows: ScanReturnRow[]; duplicate: boolean } {
  const duplicate = rows.some(
    (r) =>
      r.code === code ||
      (order !== null && r.kind === "matched" && r.order.order_id === order.order_id),
  );
  if (duplicate) return { rows, duplicate: true };
  const row: ScanReturnRow = order
    ? { kind: "matched", code, order, lines: defaultReturnLines(order) }
    : { kind: "unmatched", code };
  return { rows: [row, ...rows], duplicate: false };
}

function clampQuantity(raw: string, max: number): string {
  const trimmed = raw.trim();
  if (trimmed === "") return "";
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return "";
  return String(Math.min(Math.max(Math.trunc(value), 0), max));
}

/** Sửa số lượng hoàn 1 dòng hàng của mã `code` — kẹp trong [0, số lượng đơn gốc]. */
export function setReturnLineQuantity(
  rows: ScanReturnRow[],
  code: string,
  productId: number,
  quantity: string,
): ScanReturnRow[] {
  return rows.map((r) => {
    if (r.kind !== "matched" || r.code !== code) return r;
    return {
      ...r,
      lines: r.lines.map((l) =>
        l.product_id === productId ? { ...l, quantity: clampQuantity(quantity, l.max) } : l,
      ),
    };
  });
}

function lineQuantity(line: ReturnLineDraft): number {
  const value = Math.trunc(Number(line.quantity) || 0);
  return Math.min(Math.max(value, 0), line.max);
}

function payloadLines(lines: ReturnLineDraft[]): ReturnLineInput[] {
  return lines
    .filter((l) => lineQuantity(l) > 0)
    .map((l) => ({
      product_id: l.product_id,
      quantity: lineQuantity(l),
      return_type: DEFAULT_RETURN_TYPE,
    }));
}

/** Mã các dòng khớp đơn mà thủ kho đã hạ MỌI dòng hàng về 0 — không có gì để ghi
 * sổ, phải báo lỗi thay vì âm thầm bỏ qua. */
export function codesWithoutReturnQuantity(rows: ScanReturnRow[]): string[] {
  return rows
    .filter((r): r is Extract<ScanReturnRow, { kind: "matched" }> => r.kind === "matched")
    .filter((r) => payloadLines(r.lines).length === 0)
    .map((r) => r.code);
}

/** Payload tạo nhóm đơn hoàn — CHỈ dòng đã khớp đơn (unmatched đi qua pending-scans)
 * và CHỈ dòng hàng còn số lượng > 0 (hoàn một phần). Row hạ hết về 0 không sinh
 * payload — caller báo lỗi qua `codesWithoutReturnQuantity`. */
export function buildReturnPayloads(
  rows: ScanReturnRow[],
  warehouseId: number,
  scanBatchId: string | null = null,
): CreateReturnEntryPayload[] {
  return rows
    .filter((r): r is Extract<ScanReturnRow, { kind: "matched" }> => r.kind === "matched")
    .map((r) => ({
      warehouse_id: warehouseId,
      shipping_code: r.code,
      source_order_id: r.order.order_id,
      customer_name: r.order.customer_name,
      customer_phone: r.order.customer_phone,
      scan_batch_id: scanBatchId,
      auto_post: true,
      lines: payloadLines(r.lines),
    }))
    .filter((p) => p.lines.length > 0);
}

/** Mã vận đơn chưa khớp đơn — gửi sang bảng chờ khớp thay vì tạo phiếu trả 0 dòng. */
export function unmatchedCodes(rows: ScanReturnRow[]): string[] {
  return rows.filter((r) => r.kind === "unmatched").map((r) => r.code);
}
