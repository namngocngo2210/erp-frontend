import type { OrderRow } from "@/features/orders/order-types";

/**
 * Apply a realtime `order.updated` patch onto an in-memory order row.
 *
 * Shallow-spreads the patch and deep-merges `crm` so partial CRM updates
 * (e.g. realtime `sales_status_code`) don't drop other CRM fields already
 * loaded on the row. Centralized so both the list state (`orders.rows`) and
 * the standalone detail order share identical merge semantics.
 */
export function mergeOrderRowPatch(row: OrderRow, patch: Partial<OrderRow>): OrderRow {
  const merged: OrderRow = { ...row, ...patch };
  if (patch.crm && row.crm) {
    merged.crm = { ...row.crm, ...patch.crm };
  }
  return merged;
}
