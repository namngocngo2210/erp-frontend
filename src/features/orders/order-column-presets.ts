import type { ColumnManagerPreset } from "@/components/column-manager/types";
import type { OrderColumnKey } from "@/features/orders/order-types";

/**
 * Bộ cột dựng sẵn theo vai trò — khai báo trong code, không lưu ở đâu cả.
 *
 * Áp preset ghi đè TOÀN BỘ danh sách cột đang hiện (kể cả thứ tự), nên thứ tự
 * liệt kê ở đây chính là thứ tự cột trên bảng. Cột không khả dụng ở ngữ cảnh
 * hiện tại (vd cột thu hồi khi không phải trang KOC) bị lọc bỏ lúc áp, xem
 * `ColumnManager.handleApplyPreset`.
 */
export const ORDER_COLUMN_PRESETS: Array<ColumnManagerPreset<OrderColumnKey>> = [
  {
    key: "sale",
    label: "orders.columnPresets.sale",
    columns: [
      "created_at",
      "invoice_code",
      "name",
      "phone",
      "channel_code",
      "sku",
      "total_after_discount",
      "sales_status",
      "not_closed_reason",
      "potential_level",
      "customer_attitude",
      "internal_note",
    ],
  },
  {
    key: "warehouse",
    label: "orders.columnPresets.warehouse",
    columns: [
      "created_at",
      "invoice_code",
      "shipping_code",
      "sku",
      "quantity",
      "branch_id",
      "fulfillment_warehouse",
      "shipping_type",
      "status",
      "kiotviet_state",
      "return_date",
    ],
  },
  {
    key: "cskh",
    label: "orders.columnPresets.cskh",
    columns: [
      "created_at",
      "invoice_code",
      "name",
      "phone",
      "status",
      "delivery_business_status",
      "bomb_reason",
      "bomb_reason_text",
      "call_duration",
      "post_purchase_rating",
      "post_purchase_feedback",
      "internal_note",
    ],
  },
  {
    key: "channel",
    label: "orders.columnPresets.channel",
    columns: [
      "created_at",
      "channel_code",
      "kiotviet",
      "order_source",
      "staff",
      "name",
      "sku",
      "total_after_discount",
      "status",
      "sales_status",
    ],
  },
  {
    key: "koc",
    label: "orders.columnPresets.koc",
    columns: [
      "created_at",
      "invoice_code",
      "name",
      "phone",
      "koc_order_type",
      "order_type",
      "recall_entries",
      "return_slip_code",
      "customer_return",
      "return_date",
      "status",
    ],
  },
];
