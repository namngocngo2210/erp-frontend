// Tab "Chờ hàng hoàn về": đơn đã huỷ nhưng hàng còn ngoài kho.
// `qty` từ backend LUÔN là số dương (lượng hàng đang nợ kho) — không cần luật hiển
// thị |net| như tab Xuất hàng ra, vì đây không phải số dư bút toán.
export type AwaitingReturnLine = {
  product_id: number;
  sku: string;
  qty: number;
};

export type AwaitingReturnStatus = "waiting" | "returned" | "closed";

export type AwaitingReturnRow = {
  order_id: number;
  order_code: string;
  invoice_code: string;
  shipping_code: string;
  customer_name: string;
  warehouse_id: number;
  warehouse_name: string;
  cancelled_at: string;
  days_waiting: number;
  status: AwaitingReturnStatus;
  closed_reason: string;
  closed_note: string;
  /** Ghi chú tự do của dòng — riêng của tab này, không dùng chung với tab Xuất. */
  note: string;
  lines: AwaitingReturnLine[];
};

export type AwaitingReturnPage = {
  count: number;
  results: AwaitingReturnRow[];
};

export const CLOSE_REASONS = [
  { value: "customer_kept", label: "Khách đã nhận và giữ hàng" },
  { value: "lost_in_transit", label: "Thất lạc, đơn vị vận chuyển đền" },
  { value: "disposed_outside", label: "Huỷ tại chỗ, không trả về" },
  { value: "other", label: "Khác" },
] as const;

export const STATUS_LABEL: Record<AwaitingReturnStatus, string> = {
  waiting: "Chờ hàng về",
  returned: "Hàng đã về",
  closed: "Đã đóng",
};
