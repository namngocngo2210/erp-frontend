import type { ReactNode } from "react";

import type { OrderRow } from "@/features/orders/order-types";
import type { KiotVietOption } from "@/features/orders/use-orders-data";
import type { ChannelRow } from "@/features/channels/types";

import type { CrmCatalogPayload } from "../crm-catalog";

export type OrderPatchHandler = (
  id: number,
  payload: Partial<OrderRow>,
  silent?: boolean,
) => Promise<void>;

/**
 * Ngữ cảnh render một ô — OrderCell (dispatcher) dựng một lần cho mỗi cell rồi
 * đưa cho renderer của cột tương ứng. Mọi renderer là hàm thuần nhận ctx trả
 * JSX (không phải component — không hook bên trong; ô nào cần state cục bộ thì
 * render một component thật như RecallEntriesCell).
 */
export type OrderCellContext = {
  row: OrderRow;
  /** `t` từ useI18n — gọi hook ở OrderCell rồi truyền xuống để renderer thuần. */
  t: (key: string, fallback?: string) => string;
  kiotvietOptions: KiotVietOption[];
  channelStaffByCode: Record<string, Array<{ id: number; name: string }>>;
  channels?: ChannelRow[];
  crmCatalog?: CrmCatalogPayload | null;
  warehouseOptions: Array<{ id: number; name: string }>;
  onPatch?: OrderPatchHandler;
  /** Trang landing: hiện nút click-to-call cạnh SĐT (webphone Zenify). */
  canCall: boolean;
  /** Quyền `sale-assignment:edit` — thiếu thì cột sale chỉ đọc. */
  canAssignSale: boolean;
  /** Quyền sửa-theo-field (xem chú thích ở OrderCell). */
  canEditField: (field: string) => boolean;
};

export type CellRenderer = (ctx: OrderCellContext) => ReactNode;
