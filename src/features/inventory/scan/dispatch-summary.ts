import type { DispatchResult, LookupOrder } from "./scan-types";

export type DispatchSummaryLine = {
  sku: string;
  name: string;
  quantity: number;
};

export type DispatchSummary = {
  orderCount: number; // số đơn xuất thành công
  totalQuantity: number; // tổng SL sản phẩm đã xuất
  lines: DispatchSummaryLine[]; // gộp theo sản phẩm
};

// Gộp sản phẩm của các đơn xuất kho THÀNH CÔNG thành 1 bảng tổng hợp.
// Key gộp theo product_id (đồng nhất với merge-order-lines), fallback sku khi thiếu product_id.
export function summarizeDispatched(
  scanned: LookupOrder[],
  results: DispatchResult[],
): DispatchSummary {
  const okIds = new Set(results.filter((r) => r.ok).map((r) => r.order_id));
  const byKey = new Map<string, DispatchSummaryLine>();
  let orderCount = 0;
  let totalQuantity = 0;

  for (const o of scanned) {
    if (!okIds.has(o.order_id)) continue;
    orderCount += 1;
    for (const it of o.items) {
      const key = it.product_id != null ? `pid:${it.product_id}` : `sku:${it.sku}`;
      const found = byKey.get(key);
      if (found) {
        found.quantity += it.quantity;
      } else {
        byKey.set(key, { sku: it.sku, name: it.name, quantity: it.quantity });
      }
      totalQuantity += it.quantity;
    }
  }

  return { orderCount, totalQuantity, lines: [...byKey.values()] };
}
