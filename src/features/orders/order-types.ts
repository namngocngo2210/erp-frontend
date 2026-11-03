// Nguồn đơn — khớp OrderSource.choices ở backend (apps/orders/models.py).
export type OrderSource =
  | "landing"
  | "kol"
  | "zalo"
  | "messenger"
  | "hotline"
  | "koc"
  | "shopee"
  | "tiktok";

// Hình thức xuất hoá đơn VAT — khớp OrderVat.choices ở backend (apps/orders/models.py).
export type OrderVat = "individual" | "company" | "no";

export type OrderItemRow = {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: string;
  // Tiền giảm cho MỖI sản phẩm (cùng nghĩa cột Giảm giá của KiotViet);
  // discount_percent chỉ có khi sale nhập theo %.
  discount?: string;
  discount_percent?: string | null;
  line_total: string;
};

export type OrderCRMNeedRow = {
  group_code: string;
  group_name?: string;
  type_code: string;
  type_name?: string;
};

export type OrderJourneyEventRow = {
  id: number;
  event_type: string;
  event_type_label?: string | null;
  from_code?: string | null;
  to_code?: string | null;
  note?: string;
  actor_name?: string | null;
  payload_json?: Record<string, unknown>;
  created_at?: string;
};

export type OrderCRMRow = {
  customer_classification_code?: string | null;
  customer_classification_label?: string | null;
  customer_attitude_raw?: string | null;
  sales_status_code?: string | null;
  sales_status_label?: string | null;
  not_closed_reason_code?: string | null;
  not_closed_reason_label?: string | null;
  delivery_business_status_code?: string | null;
  delivery_business_status_label?: string | null;
  bomb_reason_group_code?: string | null;
  bomb_reason_group_label?: string | null;
  bomb_reason_type_code?: string | null;
  bomb_reason_type_label?: string | null;
  bomb_reason_text?: string | null;
  internal_note?: string | null;
  potential_level?: number | null;
  potential_level_label?: string | null;
  age_text?: string | null;
  age_text_label?: string | null;
  occupation_code?: string | null;
  occupation_label?: string | null;
  delax_source_codes?: string[] | null;
  pain_level_code?: string | null;
  pain_level_label?: string | null;
  pain_duration_code?: string | null;
  pain_duration_label?: string | null;
  lifestyle_habit_codes?: string[] | null;
  used_massage_before?: boolean | null;
  relax_time_codes?: string[] | null;
  purchase_barrier_codes?: string[] | null;
  comparing_brand_text?: string | null;
  call_duration_code?: string | null;
  call_duration_label?: string | null;
  post_purchase_feedback_text?: string | null;
  post_purchase_rating_code?: string | null;
  post_purchase_rating_label?: string | null;
  needs?: OrderCRMNeedRow[];
  // Field nào được AI tự điền từ transcript cuộc gọi + trích dẫn làm căn cứ.
  // Sale sửa đè field nào thì backend xoá key đó khỏi map này.
  ai_filled_fields?: Record<string, { call_record_id: number; quote: string; at: string }> | null;
  // Giá trị các trường đánh giá động (định nghĩa trong assessment_field_defs).
  extra_fields?: Record<string, string | string[] | number | boolean | null> | null;
  // Giỏ mở: AI ghi nhận thông tin đáng chú ý ngoài các trường đã định nghĩa. Read-only.
  ai_open_insights?: Array<{
    topic: string;
    content: string;
    quote: string;
    call_record_id: number;
    at: string;
  }> | null;
  events?: OrderJourneyEventRow[];
  updated_by_name?: string | null;
  next_followup_at?: string | null;
  next_reminder_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ProductPackageRow = {
  id?: number;
  quantity: number;
  price: string | number;
  weight: string | number;
  length: string | number;
  width: string | number;
  height: string | number;
};

export type ProductGroupRef = {
  id: number;
  code: string;
  name: string;
};

export type ProductRow = {
  id: number;
  name: string;
  sku: string;
  price: string;
  weight?: string | number;
  length?: string | number;
  width?: string | number;
  height?: string | number;
  is_active: boolean;
  packages?: ProductPackageRow[];
  group?: ProductGroupRef | null;
  created_at: string;
  updated_at: string;
};

export type OrderRecallRow = {
  return_slip_code?: string | null;
};

/** Một đợt thu hồi. `id` chỉ có ở dữ liệu server trả về; payload ghi không cần. */
export type OrderRecallEntryRow = {
  id?: number;
  recall_code: string;
  recall_created_date: string | null;
  recall_received_date: string | null;
};

export type OrderRow = {
  id: number;
  channel_code: string;
  channel_name?: string;
  kiotviet_channel_id?: number | null;
  kiotviet_name?: string | null;
  channel_owner?: string;
  staff_id?: number | null;
  staff_name?: string | null;
  name?: string;
  phone?: string;
  raw_address?: string;
  address?: string;
  ward?: string;
  district?: string;
  province?: string;
  ward_code?: string;
  district_code?: string;
  province_code?: string;
  kiotviet_location?: string;
  kiotviet_ward?: string;
  /** Địa chỉ 2 cấp (34 tỉnh, sau 01/07/2025) — backend suy từ raw_address, chỉ đọc. */
  address_level2?: string;
  ward_level2?: string;
  province_level2?: string;
  ward_code_level2?: string;
  province_code_level2?: string;
  product?: string;
  product_raw?: string;
  sku?: string;
  quantity?: number;
  items?: OrderItemRow[];
  customer_phone: string;
  customer_code: string;
  // Loại khách: true = khách mới (≤1 đơn), false = khách cũ (>1 đơn).
  customer_is_new?: boolean | null;
  status: number;
  invoice_status?: number | null;
  customer_gender?: number | null;
  discount_amount?: string;
  booking_voucher_discount?: string;
  weight?: string;
  dimensions?: string;
  branch_id?: string;
  order_type?: string;
  order_source?: OrderSource | null;
  vat?: OrderVat | null;
  // Đã xuất hoá đơn VAT hay chưa (trạng thái) + link hoá đơn đã xuất.
  is_export_vat?: boolean | null;
  vat_link?: string | null;
  return_date?: string | null;
  kiotviet_purchase_date?: string | null;
  show_orders?: boolean;
  other_price?: string;
  customer_prepaid?: string | number;
  result?: string;
  invoice_code?: string;
  is_delivery_invoice_printed?: boolean;
  // Cờ bất biến "đơn ingest về có địa chỉ" — không phản ánh địa chỉ hiện tại.
  has_address?: boolean;
  // Trạng thái THÔ từ hệ đối tác (Pancake POS / Foxia / CNV) — chuỗi rỗng khi không có.
  partner_delivery_status?: string;
  partner_dvvc_delivery_status?: string;
  customer_return?: boolean;
  old_invoice_code?: string;
  old_id?: number | null;
  feedback?: string;
  total_after_discount?: string;
  total_amount: string;
  shipping_fee: string;
  payment_method?: string;
  shipping_code: string;
  shipping_provider?: string | null;
  can_edit: boolean;
  /**
   * Đơn đã có mã hóa đơn → khoá khối Sản phẩm + Tài chính (xem `invoice-lock.ts`).
   * Khác `can_edit`: `can_edit` là quyền theo kênh và tắt TẤT CẢ (kể cả ô CRM).
   */
  is_invoice_locked?: boolean;
  is_kiotviet_processing?: boolean;
  latest_kiotviet_job_status?: string | null;
  latest_kiotviet_job_action?: string | null;
  latest_kiotviet_job_error?: string | null;
  crm?: OrderCRMRow | null;
  recall?: OrderRecallRow | null;
  recall_entries?: OrderRecallEntryRow[];
  fulfillment_warehouse?: number | null;
  fulfillment_warehouse_name?: string | null;
  // Cờ hệ thống tự gắn theo thao tác thật (tạo mã vận đơn / hạch toán bán trực
  // tiếp) — null nghĩa là đơn cũ, chưa xác định. Read-only trên UI.
  // Code loại kênh của kênh bán (shopee/tiktok/...); null = chưa phân loại.
  channel_type?: string | null;
  channel_type_name?: string | null;
  shipping_type?: "shipment" | "direct" | null;
  /** Nhãn nghiệp vụ đơn KOC, nhân viên gán tay. "" = đơn KOC thường. */
  koc_order_type?: "" | "sample_gift" | "renewal" | "recall";
  created_at?: string;
  /** Mốc sale chốt đơn (`Order.sales_closed_at`). null = chưa chốt, hoặc đơn không
   * đi qua luồng CRM (đơn sàn / sync KiotViet). Chỉ đọc — backend ghi theo luật
   * chuyển trạng thái sale, PATCH lên field này bị bỏ qua. */
  sales_closed_at?: string | null;
  /** Id các đơn khớp ĐANG VẬN CHUYỂN (cùng SĐT + cùng sản phẩm, ≤30 ngày). Chỉ có ở
   * payload list — response PATCH/chi tiết cố ý không trả để không xoá cảnh báo
   * khỏi row khi merge. Xem backend `order_duplicate_warning_service`. */
  duplicate_order_ids?: number[];
  /** Id các đơn khớp ĐANG/ĐÃ HOÀN — cảnh báo nguy cơ bom hàng. Cùng luật khớp và
   * cùng ràng buộc "chỉ có ở payload list" như `duplicate_order_ids`. */
  returning_order_ids?: number[];
  // Sheet 3 follow-up (suy real-time từ endpoint /api/orders/sheet3).
  temperature?: "hot" | "warm" | "cold";
  contact_count?: number;
  last_contact_at?: string | null;
};

export type OrderColumnKey =
  | "kiotviet"
  | "kiotviet_state"
  | "channel_code"
  | "order_source"
  | "vat"
  | "is_export_vat"
  | "vat_link"
  | "return_date"
  | "channel_owner"
  | "staff"
  | "name"
  | "phone"
  | "address"
  | "kiotviet_location"
  | "kiotviet_ward"
  | "sku"
  | "quantity"
  | "total_amount"
  | "raw_address"
  | "has_address"
  | "product"
  | "invoice_status"
  | "status"
  | "shipping_fee"
  | "payment_method"
  | "shipping_code"
  | "customer_gender"
  | "discount_amount"
  | "booking_voucher_discount"
  | "weight"
  | "dimensions"
  | "branch_id"
  | "order_type"
  | "other_price"
  | "customer_prepaid"
  | "result"
  | "invoice_code"
  | "feedback"
  | "total_after_discount"
  | "created_at"
  | "sales_closed_at"
  | "customer_code"
  | "customer_type"
  // Hành vi đơn hàng (CRM)
  | "delivery_business_status"
  | "sales_status"
  | "bomb_reason"
  | "internal_note"
  | "customer_classification"
  | "customer_attitude"
  | "not_closed_reason"
  | "potential_level"
  | "age_text"
  | "occupation"
  | "pain_level"
  | "pain_duration"
  | "used_massage_before"
  | "call_duration"
  | "post_purchase_rating"
  | "post_purchase_feedback"
  | "comparing_brand"
  | "bomb_reason_text"
  | "needs"
  | "delax_sources"
  | "lifestyle_habits"
  | "relax_times"
  | "purchase_barriers"
  | "recall_code"
  | "recall_created_date"
  | "recall_received_date"
  | "recall_entries"
  | "return_slip_code"
  | "customer_return"
  | "fulfillment_warehouse"
  | "shipping_type"
  | "koc_order_type";

export const ORDER_COLUMN_OPTIONS: Array<{ key: OrderColumnKey; label: string }> = [
  { key: "kiotviet", label: "orders.columns.kiotviet" },
  { key: "kiotviet_state", label: "orders.columns.kiotvietState" },
  { key: "branch_id", label: "orders.columns.branchId" },
  { key: "channel_code", label: "orders.columns.channelCode" },
  { key: "order_source", label: "orders.columns.orderSource" },
  { key: "vat", label: "orders.columns.vat" },
  { key: "is_export_vat", label: "orders.columns.isExportVat" },
  { key: "vat_link", label: "orders.columns.vatLink" },
  { key: "return_date", label: "orders.columns.returnDate" },
  { key: "staff", label: "orders.columns.staff" },
  { key: "name", label: "orders.columns.customerName" },
  { key: "phone", label: "orders.columns.phone" },
  { key: "address", label: "orders.columns.address" },
  { key: "raw_address", label: "orders.columns.rawAddress" },
  { key: "has_address", label: "orders.columns.hasAddress" },
  { key: "kiotviet_location", label: "orders.columns.kiotvietLocation" },
  { key: "kiotviet_ward", label: "orders.columns.kiotvietWard" },
  { key: "sku", label: "orders.columns.sku" },
  { key: "quantity", label: "orders.columns.quantity" },
  { key: "total_amount", label: "orders.columns.totalAmount" },
  { key: "total_after_discount", label: "orders.columns.totalAfterDiscount" },
  { key: "customer_prepaid", label: "orders.columns.customerPrepaid" },
  { key: "payment_method", label: "orders.columns.paymentMethod" },
  { key: "invoice_code", label: "orders.columns.invoiceCode" },
  { key: "shipping_code", label: "orders.columns.shippingCode" },
  { key: "invoice_status", label: "orders.columns.invoiceStatus" },
  { key: "status", label: "orders.columns.shippingStatus" },
  { key: "customer_gender", label: "orders.columns.gender" },
  { key: "created_at", label: "orders.columns.createdAt" },
  { key: "sales_closed_at", label: "orders.columns.salesClosedAt" },
  { key: "customer_code", label: "orders.columns.customerCode" },
  { key: "customer_type", label: "orders.columns.customerType" },
  { key: "customer_return", label: "orders.columns.customerReturn" },
  // Hành vi đơn hàng (CRM)
  { key: "delivery_business_status", label: "orders.columns.deliveryBusinessStatus" },
  { key: "sales_status", label: "orders.columns.salesStatus" },
  { key: "bomb_reason", label: "orders.columns.bombReason" },
  { key: "bomb_reason_text", label: "orders.columns.bombReasonText" },
  { key: "internal_note", label: "orders.columns.internalNote" },
  { key: "customer_classification", label: "orders.columns.customerClassification" },
  { key: "customer_attitude", label: "orders.columns.customerAttitude" },
  { key: "not_closed_reason", label: "orders.columns.notClosedReason" },
  { key: "potential_level", label: "orders.columns.potentialLevel" },
  { key: "age_text", label: "orders.columns.ageText" },
  { key: "occupation", label: "orders.columns.occupation" },
  { key: "pain_level", label: "orders.columns.painLevel" },
  { key: "pain_duration", label: "orders.columns.painDuration" },
  { key: "used_massage_before", label: "orders.columns.usedMassageBefore" },
  { key: "call_duration", label: "orders.columns.callDuration" },
  { key: "post_purchase_rating", label: "orders.columns.postPurchaseRating" },
  { key: "post_purchase_feedback", label: "orders.columns.postPurchaseFeedback" },
  { key: "comparing_brand", label: "orders.columns.comparingBrand" },
  { key: "needs", label: "orders.columns.needs" },
  { key: "delax_sources", label: "orders.columns.delaxSources" },
  { key: "lifestyle_habits", label: "orders.columns.lifestyleHabits" },
  { key: "relax_times", label: "orders.columns.relaxTimes" },
  { key: "purchase_barriers", label: "orders.columns.purchaseBarriers" },
  { key: "recall_entries", label: "orders.columns.recallEntries" },
  { key: "recall_code", label: "orders.columns.recallCode" },
  { key: "recall_created_date", label: "orders.columns.recallCreatedDate" },
  { key: "recall_received_date", label: "orders.columns.recallReceivedDate" },
  { key: "return_slip_code", label: "orders.columns.returnSlipCode" },
  { key: "fulfillment_warehouse", label: "orders.columns.fulfillmentWarehouse" },
  { key: "shipping_type", label: "orders.columns.shippingType" },
  { key: "order_type", label: "orders.columns.orderType" },
  { key: "koc_order_type", label: "orders.columns.kocOrderType" },
];

/**
 * Cột chỉ tồn tại trên LƯỚI, không phải cột của file Excel.
 *
 * `recall_entries` là một ô gộp cả đợt thu hồi (mã + 2 ngày) — backend export
 * không biết key này, nên phải loại khỏi hộp thoại chọn cột xuất Excel.
 */
export const TABLE_ONLY_COLUMN_KEYS: OrderColumnKey[] = ["recall_entries"];

/**
 * Cột chỉ tồn tại trong file EXCEL, không hiện trên lưới.
 *
 * Ba cột thu hồi rời được gộp lại thành `recall_entries` trên lưới (mỗi đợt một
 * dòng, ba ô nằm cạnh nhau) nhưng file Excel CỐ Ý giữ nguyên ba cột — các file
 * mẫu/pivot người dùng đang chạy tham chiếu đúng ba cột đó.
 */
export const EXPORT_ONLY_COLUMN_KEYS: OrderColumnKey[] = [
  "recall_code",
  "recall_created_date",
  "recall_received_date",
];

/**
 * Nhóm nghiệp vụ của cột. Chỉ phục vụ việc TÌM cột trong hộp thoại tuỳ chỉnh
 * cột — không ảnh hưởng thứ tự render trên bảng (thứ tự đó do mảng
 * `visibleColumns` của user quyết định).
 */
export type OrderColumnGroupKey =
  | "order"
  | "customer"
  | "product"
  | "channel"
  | "vat"
  | "crm"
  | "persona"
  | "recall";

export const ORDER_COLUMN_GROUPS: Array<{ key: OrderColumnGroupKey; label: string }> = [
  { key: "order", label: "orders.columnGroups.order" },
  { key: "customer", label: "orders.columnGroups.customer" },
  { key: "product", label: "orders.columnGroups.product" },
  { key: "channel", label: "orders.columnGroups.channel" },
  { key: "vat", label: "orders.columnGroups.vat" },
  { key: "crm", label: "orders.columnGroups.crm" },
  { key: "persona", label: "orders.columnGroups.persona" },
  { key: "recall", label: "orders.columnGroups.recall" },
];

/**
 * `Record` (không phải map lỏng) là chốt chặn biên dịch: thêm cột mới vào
 * `OrderColumnKey` mà quên xếp nhóm thì tsc báo lỗi ngay, thay vì cột đó âm
 * thầm biến mất khỏi hộp thoại chọn cột.
 */
export const ORDER_COLUMN_GROUP_BY_KEY: Record<OrderColumnKey, OrderColumnGroupKey> = {
  // Đơn & hoá đơn
  invoice_code: "order",
  shipping_code: "order",
  invoice_status: "order",
  status: "order",
  created_at: "order",
  sales_closed_at: "order",
  order_type: "order",
  kiotviet_state: "order",
  // Khách hàng
  name: "customer",
  phone: "customer",
  address: "customer",
  raw_address: "customer",
  has_address: "customer",
  kiotviet_location: "customer",
  kiotviet_ward: "customer",
  customer_code: "customer",
  customer_type: "customer",
  customer_gender: "customer",
  // Sản phẩm & tiền
  sku: "product",
  quantity: "product",
  total_amount: "product",
  total_after_discount: "product",
  customer_prepaid: "product",
  payment_method: "product",
  // Kênh · Kho · Nhân viên
  kiotviet: "channel",
  channel_code: "channel",
  order_source: "channel",
  branch_id: "channel",
  staff: "channel",
  fulfillment_warehouse: "channel",
  shipping_type: "channel",
  // Hoá đơn VAT
  vat: "vat",
  is_export_vat: "vat",
  vat_link: "vat",
  // CSKH & hành vi bán
  delivery_business_status: "crm",
  sales_status: "crm",
  bomb_reason: "crm",
  bomb_reason_text: "crm",
  internal_note: "crm",
  customer_classification: "crm",
  customer_attitude: "crm",
  not_closed_reason: "crm",
  potential_level: "crm",
  call_duration: "crm",
  post_purchase_rating: "crm",
  post_purchase_feedback: "crm",
  // Chân dung khách
  age_text: "persona",
  occupation: "persona",
  pain_level: "persona",
  pain_duration: "persona",
  used_massage_before: "persona",
  comparing_brand: "persona",
  needs: "persona",
  delax_sources: "persona",
  lifestyle_habits: "persona",
  relax_times: "persona",
  purchase_barriers: "persona",
  // Hoàn & thu hồi
  return_date: "recall",
  customer_return: "recall",
  recall_entries: "recall",
  recall_code: "recall",
  recall_created_date: "recall",
  recall_received_date: "recall",
  return_slip_code: "recall",
  koc_order_type: "recall",
  // Các key dưới đây nằm trong `OrderColumnKey` nhưng KHÔNG có trong
  // `ORDER_COLUMN_OPTIONS` (cột cũ, không chọn được trong hộp thoại). Vẫn phải
  // xếp nhóm để `Record` giữ được tính chốt chặn ở trên.
  channel_owner: "channel",
  product: "product",
  shipping_fee: "product",
  discount_amount: "product",
  booking_voucher_discount: "product",
  weight: "product",
  dimensions: "product",
  other_price: "product",
  result: "crm",
  feedback: "crm",
};

/**
 * 8 cột mặc định khi user chưa tuỳ chỉnh.
 * Được chọn để đủ thông tin quan trọng nhất mà không cần scroll ngang
 * trên màn hình 1080px+. Thông tin chi tiết được xem trong side panel.
 */
export const DEFAULT_ORDER_COLUMNS: OrderColumnKey[] = [
  "invoice_code", // Mã hóa đơn
  "shipping_code", // Mã vận đơn
  "total_amount", // Tổng tiền
  "name", // Tên khách hàng
  "created_at", // Tạo lúc
  "return_date", // Ngày hẹn trả hàng
  "status", // Trạng thái vận chuyển
  "channel_code", // Mã kênh
  "branch_id", // Mã kho
  "kiotviet", // Kênh kiotviet
  "customer_return", // Khách trả hàng
  "vat", // Hình thức xuất VAT
];

export const ORDER_COLUMN_FIELD_BY_KEY: Record<OrderColumnKey, string> = {
  kiotviet: "kiotviet_channel_id",
  kiotviet_state: "latest_kiotviet_job_status",
  channel_code: "channel_name",
  order_source: "order_source",
  vat: "vat",
  is_export_vat: "is_export_vat",
  vat_link: "vat_link",
  return_date: "return_date",
  channel_owner: "channel_owner",
  staff: "staff_id",
  name: "name",
  phone: "phone",
  address: "address",
  kiotviet_location: "kiotviet_location",
  kiotviet_ward: "kiotviet_ward",
  sku: "sku",
  quantity: "quantity",
  total_amount: "total_amount",
  raw_address: "raw_address",
  has_address: "has_address",
  product: "product",
  invoice_status: "invoice_status",
  status: "status",
  shipping_fee: "shipping_fee",
  payment_method: "payment_method",
  shipping_code: "shipping_code",
  customer_gender: "customer_gender",
  discount_amount: "discount_amount",
  booking_voucher_discount: "booking_voucher_discount",
  weight: "weight",
  dimensions: "dimensions",
  branch_id: "branch_id",
  order_type: "order_type",
  other_price: "other_price",
  customer_prepaid: "customer_prepaid",
  result: "result",
  invoice_code: "invoice_code",
  feedback: "feedback",
  total_after_discount: "total_after_discount",
  created_at: "created_at",
  sales_closed_at: "sales_closed_at",
  customer_code: "customer_code",
  customer_type: "customer_is_new",
  customer_return: "customer_return",
  // Hành vi đơn hàng (CRM)
  delivery_business_status: "delivery_business_status",
  sales_status: "sales_status",
  bomb_reason: "bomb_reason",
  bomb_reason_text: "bomb_reason_text",
  internal_note: "internal_note",
  customer_classification: "customer_classification",
  customer_attitude: "customer_attitude",
  not_closed_reason: "not_closed_reason",
  potential_level: "potential_level",
  age_text: "age_text",
  occupation: "occupation",
  pain_level: "pain_level",
  pain_duration: "pain_duration",
  used_massage_before: "used_massage_before",
  call_duration: "call_duration",
  post_purchase_rating: "post_purchase_rating",
  post_purchase_feedback: "post_purchase_feedback",
  comparing_brand: "comparing_brand",
  needs: "needs",
  delax_sources: "delax_sources",
  lifestyle_habits: "lifestyle_habits",
  relax_times: "relax_times",
  purchase_barriers: "purchase_barriers",
  recall_entries: "recall_entries",
  recall_code: "recall_code",
  recall_created_date: "recall_created_date",
  recall_received_date: "recall_received_date",
  return_slip_code: "return_slip_code",
  fulfillment_warehouse: "fulfillment_warehouse_name",
  // Không có ở đây thì TS báo thiếu key (ORDER_COLUMN_FIELD_BY_KEY là
  // Record đủ mọi OrderColumnKey) — field trùng tên cột vì đây là cờ đơn giá trị.
  shipping_type: "shipping_type",
  koc_order_type: "koc_order_type",
};

export type KiotVietOption = {
  value: number;
  label: string;
  code?: string;
};

export type AddressCatalogProvince = {
  id: string;
  name: string;
};

export type AddressCatalogDistrict = {
  id: string;
  name: string;
  province_id: string;
};

export type AddressCatalogWard = {
  id: string;
  name: string;
  district_id: string;
};

export type AddressCatalog = {
  provinces: AddressCatalogProvince[];
  districts: AddressCatalogDistrict[];
  wards: AddressCatalogWard[];
};

export type CreateOrderPayload = {
  channel_code?: string;
  customer_code?: string;
  name?: string;
  phone?: string;
  raw_address?: string;
  address?: string;
  ward_code?: string;
  district_code?: string;
  province_code?: string;
  kiotviet_location?: string;
  kiotviet_ward?: string;
  product?: string;
  status?: number | string;
  kiotviet_channel_id?: number | null;
  staff_id?: number | null;
  customer_gender?: number | null;
  discount_amount?: string;
  booking_voucher_discount?: string;
  weight?: string;
  dimensions?: string;
  branch_id?: string;
  order_type?: string;
  recall_code?: string;
  order_source?: OrderSource | null;
  vat?: OrderVat | null;
  other_price?: string;
  customer_prepaid?: string | number;
  result?: string;
  invoice_code?: string;
  invoice_id?: number | null;
  feedback?: string;
  total_after_discount?: string;
  total_amount?: string;
  shipping_fee?: string;
  payment_method?: string;
  shipping_code?: string;
  created_at_override?: string;
  sku?: string;
  quantity?: number;
  fulfillment_warehouse?: number | null;
  crm?: Partial<OrderCRMRow> | null;
  items?: Array<{
    product_id?: number;
    sku?: string;
    quantity: number;
    unit_price?: string;
  }>;
};
