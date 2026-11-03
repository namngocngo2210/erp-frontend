import type { OrderColumnKey } from "@/features/orders/order-types";

import { CHANNEL_CELL_RENDERERS } from "./channel-cells";
import { CRM_CELL_RENDERERS } from "./crm-cells";
import { CUSTOMER_CELL_RENDERERS } from "./customer-cells";
import { FINANCE_CELL_RENDERERS } from "./finance-cells";
import { LOGISTICS_CELL_RENDERERS } from "./logistics-cells";
import { RECALL_CELL_RENDERERS } from "./recall-cells";
import type { CellRenderer } from "./types";

export type { CellRenderer, OrderCellContext, OrderPatchHandler } from "./types";
export { nextRecallEntries } from "./recall-logic";

/**
 * Map cột → renderer, hợp nhất từ các nhóm nghiệp vụ (mỗi nhóm một file).
 * OrderCell chỉ còn là dispatcher mỏng tra map này; cột không có renderer
 * (order_source, product, các cột export-only...) hiển thị "-" như trước.
 */
export const CELL_RENDERERS: Partial<Record<OrderColumnKey, CellRenderer>> = {
  ...CHANNEL_CELL_RENDERERS,
  ...CUSTOMER_CELL_RENDERERS,
  ...FINANCE_CELL_RENDERERS,
  ...LOGISTICS_CELL_RENDERERS,
  ...CRM_CELL_RENDERERS,
  ...RECALL_CELL_RENDERERS,
};
