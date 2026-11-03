import type { LookupItem } from "./scan-types";

export type ScanLine = {
  product_id: string;
  sku: string;
  name: string;
  quantity: string;
};

export function mergeOrderItemsIntoLines(existing: ScanLine[], items: LookupItem[]): ScanLine[] {
  const next = existing.map((l) => ({ ...l }));
  for (const it of items) {
    const pid = String(it.product_id);
    const found = next.find((l) => l.product_id === pid);
    if (found) {
      found.quantity = String((Number(found.quantity) || 0) + it.quantity);
    } else {
      next.push({ product_id: pid, sku: it.sku, name: it.name, quantity: String(it.quantity) });
    }
  }
  return next;
}
