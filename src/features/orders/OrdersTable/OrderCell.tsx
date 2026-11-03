import { useI18n } from "@/i18n";
import type { OrderColumnKey, OrderRow } from "@/features/orders/order-types";
import type { AddressCatalog, KiotVietOption } from "@/features/orders/use-orders-data";
import type { ChannelRow } from "@/features/channels/types";

import type { CrmCatalogPayload } from "./crm-catalog";
import { CELL_RENDERERS } from "./cell-renderers";

/**
 * Cell renderer for each column type.
 *
 * Dispatcher mỏng: logic từng cột nằm trong map `CELL_RENDERERS`
 * (cell-renderers/, mỗi nhóm nghiệp vụ một file). Hook duy nhất (useI18n) gọi
 * ở đây rồi truyền `t` xuống qua ctx để mọi renderer là hàm thuần.
 */
export function OrderCell({
  row,
  columnKey,
  kiotvietOptions,
  channelStaffByCode,
  channels,
  crmCatalog,
  warehouseOptions = [],
  onPatch,
  canCall = false,
  canAssignSale = false,
  canEditField = () => true,
}: {
  row: OrderRow;
  columnKey: OrderColumnKey;
  kiotvietOptions: KiotVietOption[];
  addressCatalog: AddressCatalog;
  channelStaffByCode: Record<string, Array<{ id: number; name: string }>>;
  channels?: ChannelRow[];
  crmCatalog?: CrmCatalogPayload | null;
  warehouseOptions?: Array<{ id: number; name: string }>;
  onPatch?: (id: number, payload: Partial<OrderRow>, silent?: boolean) => Promise<void>;
  /** Trang landing: hiện nút click-to-call cạnh SĐT (webphone Zenify). */
  canCall?: boolean;
  /** Quyền `sale-assignment:edit` — thiếu thì cột sale chỉ đọc. */
  canAssignSale?: boolean;
  /** Quyền sửa-theo-field (từ `useOrderFieldGrants`, gọi ở component cha có
   * AppShellContext — leaf renderer này thuần nhận prop để test được không cần
   * Provider). Mặc định luôn cho sửa (chưa nạp quyền / không truyền = không khoá). */
  canEditField?: (field: string) => boolean;
}) {
  const { t } = useI18n();

  const renderer = CELL_RENDERERS[columnKey];
  if (!renderer) return <span>-</span>;

  return renderer({
    row,
    t,
    kiotvietOptions,
    channelStaffByCode,
    channels,
    crmCatalog,
    warehouseOptions,
    onPatch,
    canCall,
    canAssignSale,
    canEditField,
  });
}
