import { type OrderColumnKey } from "@/features/orders/order-types";

// Bộ cột rút gọn cho trang Vận đơn (Kho).
export const SHIPMENT_COLUMNS: OrderColumnKey[] = [
  "shipping_code", // Mã vận đơn
  "fulfillment_warehouse", // Kho xuất
  "invoice_code", // Mã hoá đơn
  "name", // Khách hàng
  "sku", // Sản phẩm (SKU)
  "status", // Trạng thái vận chuyển
  "invoice_status", // Trạng thái hoá đơn
  "delivery_business_status", // Trạng thái vận chuyển thực
  "created_at", // Ngày tạo
];
