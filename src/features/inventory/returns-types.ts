import type { components } from "@/api/typed";

/**
 * Types sinh từ hợp đồng OpenAPI (`schema.d.ts`, regen bằng `npm run gen:api`) — theo
 * mẫu `lib/api/pending-scans.ts`. Đổi enum ở BE → các type này tự đổi theo, `tsc` bắt
 * lệch ngay.
 *
 * Các type "container" phía dưới (ReturnLineRow/ReturnEntryRow, ReturnLineInput,
 * CreateReturnEntryPayload) CỐ Ý giữ khai tay thay vì re-export thẳng từ schema:
 * openapi-typescript đánh dấu phần lớn field của chúng là optional (generator suy
 * theo required ở write-schema/DRF, dù response luôn có đủ field), nên alias thẳng
 * sẽ đổi hàng loạt field `required` → `optional`.
 */
export type ReturnType = components["schemas"]["ReturnTypeAddEnum"];

/** Trạng thái của NHÓM ĐƠN hoàn (entry) — tồn kho ghi/đảo ở cấp này. */
export type ReturnEntryStatus = components["schemas"]["ReturnEntryStatusEnum"];

export type ReturnLineRow = {
  id: number;
  product: number;
  product_sku: string;
  product_name: string;
  quantity: number;
  condition_note: string;
  /** BE bắt buộc loại hoàn ở từng dòng; dữ liệu cũ có thể còn rỗng. */
  return_type: ReturnType | "";
};

/** Phiếu ngày rút gọn — lồng trong mỗi nhóm đơn. Khớp 1:1 schema, re-export thẳng. */
export type ReturnNoteBrief = components["schemas"]["ReturnNoteBrief"];

/** Nhóm đơn hoàn (ReturnEntry): 1 đơn trả trong phiếu ngày. Không có mã riêng. */
export type ReturnEntryRow = {
  id: number;
  status: ReturnEntryStatus;
  source_order: number | null;
  source_order_invoice_code: string;
  shipping_code: string;
  customer_name: string;
  customer_phone: string;
  source_note: string;
  note: string;
  created_by_name: string;
  created_at: string;
  posted_at: string | null;
  scan_batch_id: string | null;
  lines: ReturnLineRow[];
  return_note: ReturnNoteBrief;
};

/** Đơn hoàn đã ghi sổ cần điều chỉnh SL — lines lấy từ dòng lịch sử (FlowLineBrief). */
export type AdjustReturnTarget = {
  return_id: number;
  /** Mã hiển thị: hóa đơn nguồn / mã vận đơn / #id. */
  label: string;
  lines: { product_id: number; sku: string | null; qty: number }[];
};

export type ReturnLineInput = {
  product_id: number;
  quantity: number;
  condition_note?: string;
  /** Bắt buộc — BE từ chối dòng thiếu loại hoàn. */
  return_type: ReturnType;
};

export type CreateReturnEntryPayload = {
  warehouse_id: number;
  lines: ReturnLineInput[];
  source_order_id?: number | null;
  shipping_code?: string;
  customer_name?: string;
  customer_phone?: string;
  source_note?: string;
  note?: string;
  scan_batch_id?: string | null;
  /** true = ghi sổ ngay khi tạo (luồng quét khớp mã vận đơn). */
  auto_post?: boolean;
};
