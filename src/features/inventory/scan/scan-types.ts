export type LookupItem = {
  product_id: number;
  sku: string;
  name: string;
  quantity: number;
};

/**
 * Đường khớp mã quét ra đơn này — quyết định KHO nào bị trừ tồn khi xuất:
 * "shipping"/"recall" → kho màn quét đang chọn (hành vi cũ). "invoice" → kho
 * CỦA ĐƠN (`fulfillment_warehouse_id`), không phải kho màn quét — đơn bán trực
 * tiếp không có mã vận đơn nên mã hoá đơn là thứ duy nhất kho quét được.
 */
export type LookupMatchedBy = "shipping" | "recall" | "invoice";

export type LookupOrder = {
  order_id: number;
  order_code: string;
  shipping_code: string;
  status: number;
  status_label: string;
  /** invoice_status KiotViet — 2 = hóa đơn đã hủy (DB có thể trễ so với KiotViet). */
  invoice_status: number | null;
  customer_name: string;
  customer_phone: string;
  fulfillment_warehouse_id: number | null;
  already_dispatched: boolean;
  matched_by: LookupMatchedBy;
  items: LookupItem[];
};

// Single match → LookupOrder; multiple matches → {multiple:true, orders:[...]}
export type LookupResponse = LookupOrder | { multiple: true; orders: LookupOrder[] };

export type DispatchResult = {
  order_id: number;
  ok: boolean;
  warnings?: string[];
  stock_warnings?: { product_id: number; balance_after: number }[];
  error?: string;
};
