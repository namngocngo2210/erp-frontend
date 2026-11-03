// Shared constants + pure helpers of the orders table (extracted verbatim from
// the former components/OrdersTable.tsx monolith — no behavior change).
import {
  EXPORT_ONLY_COLUMN_KEYS,
  ORDER_COLUMN_OPTIONS,
  ORDER_COLUMN_FIELD_BY_KEY,
  type OrderColumnKey,
} from "@/features/orders/order-types";
import { formatCurrency } from "@/lib/format";

// 10 màu cố định, chọn theo hash chuỗi (ổn định) — dùng cho các cột badge
// (kênh / kiotviet / branch / staff). Giúp tô màu vẫn áp dụng kể cả khi cell
// đã chuyển sang dạng inline-edit.
const HASH_BADGE_PALETTE: Array<{ bg: string; text: string; selectBg: string }> = [
  { bg: "bg-blue-100", text: "text-blue-700", selectBg: "#dbeafe" },
  { bg: "bg-green-100", text: "text-green-700", selectBg: "#dcfce7" },
  { bg: "bg-yellow-100", text: "text-yellow-700", selectBg: "#fef9c3" },
  { bg: "bg-purple-100", text: "text-purple-700", selectBg: "#f3e8ff" },
  { bg: "bg-pink-100", text: "text-pink-700", selectBg: "#fce7f3" },
  { bg: "bg-indigo-100", text: "text-indigo-700", selectBg: "#e0e7ff" },
  { bg: "bg-teal-100", text: "text-teal-700", selectBg: "#ccfbf1" },
  { bg: "bg-orange-100", text: "text-orange-700", selectBg: "#ffedd5" },
  { bg: "bg-cyan-100", text: "text-cyan-700", selectBg: "#cffafe" },
  { bg: "bg-rose-100", text: "text-rose-700", selectBg: "#ffe4e6" },
];

export function hashBadge(seed: string): { bg: string; text: string; selectBg: string } {
  const s = String(seed || "");
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash);
  }
  return HASH_BADGE_PALETTE[Math.abs(hash) % HASH_BADGE_PALETTE.length];
}

/** Số tiền trong lưới đơn: nhóm nghìn kiểu en-US ("1,234"), rỗng → "-", hỏng → giữ nguyên. */
export function formatAmount(value: string | number | null | undefined): string {
  return formatCurrency(value, { locale: "en-US", onInvalid: "raw" });
}

/**
 * Get column display configuration. Trả `undefined` thì lưới bỏ qua cột đó —
 * chốt chặn cuối cho 3 cột thu hồi rời (chỉ còn sống trong file Excel): cấu
 * hình cột cũ nằm ở localStorage của client, không migrate hết được trong một
 * lần deploy nên phải chặn ngay tại chỗ render.
 */
export function getColumnConfig(key: OrderColumnKey): { label: string; field: string } | undefined {
  if (EXPORT_ONLY_COLUMN_KEYS.includes(key)) return undefined;
  const option = ORDER_COLUMN_OPTIONS.find((opt) => opt.key === key);
  const field = ORDER_COLUMN_FIELD_BY_KEY[key];
  if (!option || !field) return undefined;
  return { label: option.label, field };
}

export const DELIVERY_BUSINESS_STATUS_OPTIONS = [
  {
    value: "warehouse_processing",
    label: "Kho đang xử lý",
    bg: "bg-blue-100",
    text: "text-blue-700",
  },
  { value: "dispatched", label: "Đã xuất kho", bg: "bg-indigo-100", text: "text-indigo-700" },
  { value: "received", label: "Đã nhận", bg: "bg-green-100", text: "text-green-700" },
  { value: "not_received", label: "Chưa nhận", bg: "bg-red-100", text: "text-red-700" },
  {
    value: "stalled_complaint",
    label: "Đơn dừng hành trình nhiều ngày, đang khiếu nại",
    bg: "bg-yellow-100",
    text: "text-yellow-700",
  },
  {
    value: "post_office_lost",
    label: "Bưu cục làm mất",
    bg: "bg-orange-100",
    text: "text-orange-700",
  },
];

export const SALES_STATUS_OPTIONS = [
  { value: "closed", label: "Đã chốt" },
  { value: "closed_express", label: "Đã chốt/Hỏa tốc" },
  { value: "closed_scheduled_date", label: "Đã chốt, hẹn ngày" },
  { value: "created_order", label: "Đã lên đơn" },
  { value: "no_answer_1", label: "Không nghe máy lần 1" },
  { value: "no_answer_2", label: "Không nghe máy lần 2" },
  { value: "no_answer_3", label: "Không nghe máy lần 3" },
  { value: "no_answer_4", label: "Không nghe máy lần 4" },
  { value: "no_answer_5", label: "Không nghe máy lần 5" },
  { value: "no_answer_6", label: "Không nghe máy lần 6" },
  { value: "unreachable", label: "Không liên hệ được" },
  { value: "wrong_number", label: "Sai số" },
  { value: "customer_bombed", label: "Khách bom hàng" },
  { value: "spam", label: "Spam" },
  { value: "duplicate", label: "Lặp" },
  { value: "poor_quality_data", label: "Data không chất lượng" },
  { value: "need_more_consulting", label: "Tư vấn thêm" },
  { value: "not_buying", label: "Không mua" },
  { value: "underlying_condition", label: "Khách bị bệnh nền" },
  { value: "scheduled", label: "Hẹn lịch" },
  { value: "call_back_later", label: "Gọi lại sau" },
  { value: "wants_store_visit", label: "Khách muốn đến cửa hàng" },
  { value: "cancelled", label: "Huỷ đơn" },
  { value: "warranty", label: "Bảo hành" },
];

// Row tint by sales_status_code. stickyBg must be an opaque color so sticky
// columns (checkbox / locked data cells) inherit the tint — they can't show
// the row's own bg through `position: sticky`.
export const SALES_STATUS_TINT: Record<string, { row: string; stickyBg: string }> = {
  // Mọi trạng thái "Đã chốt" dùng chung một màu xanh lá để nhất quán. Đậm hơn
  // một nấc (green-200) so với các màu trạng thái khác — anh chốt 11/09: green-100
  // lúc đứng yên quá nhạt, sale chỉ nhận ra khi trỏ chuột.
  closed: { row: "bg-green-200 hover:bg-green-300", stickyBg: "#bbf7d0" },
  closed_express: { row: "bg-green-200 hover:bg-green-300", stickyBg: "#bbf7d0" },
  closed_scheduled_date: { row: "bg-green-200 hover:bg-green-300", stickyBg: "#bbf7d0" },
  created_order: { row: "bg-pink-100 hover:bg-pink-200", stickyBg: "#fce7f3" },
  no_answer_1: { row: "bg-orange-100 hover:bg-orange-200", stickyBg: "#ffedd5" },
  no_answer_2: { row: "bg-orange-100 hover:bg-orange-200", stickyBg: "#ffedd5" },
  no_answer_3: { row: "bg-orange-100 hover:bg-orange-200", stickyBg: "#ffedd5" },
  no_answer_4: { row: "bg-orange-100 hover:bg-orange-200", stickyBg: "#ffedd5" },
  no_answer_5: { row: "bg-orange-100 hover:bg-orange-200", stickyBg: "#ffedd5" },
  no_answer_6: { row: "bg-orange-100 hover:bg-orange-200", stickyBg: "#ffedd5" },
  unreachable: { row: "bg-red-100 hover:bg-red-200", stickyBg: "#fee2e2" },
  spam: { row: "bg-red-100 hover:bg-red-200", stickyBg: "#fee2e2" },
  customer_bombed: { row: "bg-red-100 hover:bg-red-200", stickyBg: "#fee2e2" },
  // Tím, KHÔNG dùng chung đỏ với spam/bom/sai số: "Lặp" là nhãn sale tự chọn,
  // còn đỏ nay là màu của cảnh báo do hệ thống chấm (trùng SĐT, quá hạn SLA).
  duplicate: { row: "bg-purple-100 hover:bg-purple-200", stickyBg: "#f3e8ff" },
  wrong_number: { row: "bg-red-100 hover:bg-red-200", stickyBg: "#fee2e2" },
  poor_quality_data: { row: "bg-red-100 hover:bg-red-200", stickyBg: "#fee2e2" },
  need_more_consulting: { row: "bg-blue-100 hover:bg-blue-200", stickyBg: "#dbeafe" },
  scheduled: { row: "bg-blue-100 hover:bg-blue-200", stickyBg: "#dbeafe" },
  call_back_later: { row: "bg-blue-100 hover:bg-blue-200", stickyBg: "#dbeafe" },
  wants_store_visit: { row: "bg-blue-100 hover:bg-blue-200", stickyBg: "#dbeafe" },
  warranty: { row: "bg-slate-300 hover:bg-slate-400 text-slate-900", stickyBg: "#cbd5e1" },
};

export const BOMB_REASON_GROUPS: Array<{
  code: string;
  label: string;
  /** `legacy`: mã cũ chỉ còn trên dữ liệu lịch sử — hiển thị nhãn, không cho chọn mới. */
  types: Array<{ code: string; label: string; legacy?: boolean }>;
}> = [
  {
    code: "customer",
    label: "Khách hàng",
    types: [
      { code: "no_answer", label: "Không nghe máy" },
      { code: "customer_away_business_trip", label: "Khách đi công tác/về quê/đi viện/đi vắng" },
      { code: "customer_uncooperative", label: "Khách không phối hợp nhận hàng" },
      { code: "changed_mind_not_buying", label: "Khách đổi ý/không còn nhu cầu" },
      { code: "family_disallow_acceptance", label: "Người nhà không đồng ý" },
      { code: "received_from_other_seller_first", label: "Khách mua/nhận sản phẩm bên khác trước" },
      { code: "insufficient_cash_on_delivery", label: "Không đủ tiền khi nhận" },
      { code: "cancelled_after_dispatch", label: "Khách hủy đơn sau khi đã gửi hàng" },
      { code: "other_reason", label: "Lí do khác (cũ)", legacy: true },
    ],
  },
  {
    code: "shipping_unit",
    label: "DVVC / Giao hàng",
    types: [
      {
        code: "shipper_route_no_time_support",
        label: "Shipper giao theo tuyến, không hỗ trợ giao giờ khách muốn nhận",
      },
      { code: "shipper_no_trial_allowed", label: "Shipper không cho khách thử hàng/xem hàng" },
      { code: "shipper_auto_returned", label: "Shipper không giao, tự ý tích hoàn" },
      { code: "hub_overload_not_delivered", label: "Bưu cục quá tải không giao được hàng" },
      { code: "delivery_too_slow", label: "Giao hàng chậm" },
      { code: "customer_shipper_conflict", label: "Khách và shipper chửi nhau" },
      { code: "parcel_lost", label: "Thất lạc hàng" },
    ],
  },
  {
    code: "order_processing",
    label: "Xử lý đơn (lỗi sale / vận đơn)",
    types: [
      { code: "wrong_address", label: "Sai địa chỉ" },
      { code: "wrong_product", label: "Sai sản phẩm" },
      { code: "wrong_price", label: "Sai giá" },
      { code: "duplicate_order", label: "Trùng đơn" },
      {
        code: "cancelled_before_dispatch_still_sent",
        label: "Khách báo hủy trước khi gửi nhưng vẫn bị gửi",
      },
      { code: "slow_order_processing", label: "Chậm xử lý/gửi đơn" },
      { code: "underlying_condition", label: "Khách có bệnh nền" },
    ],
  },
  {
    code: "packaging",
    label: "Lỗi đóng gói",
    types: [
      { code: "wrong_item_packed", label: "Đóng sai sản phẩm" },
      { code: "missing_gifts", label: "Thiếu quà tặng/Thẻ bảo hành" },
      { code: "missing_items", label: "Đóng thiếu hàng" },
      { code: "mixed_up_item_packed", label: "Đóng nhầm hàng" },
      { code: "used_product", label: "Hàng đã qua sử dụng (cũ)" },
      { code: "poor_packaging_damaged", label: "Đóng gói không đảm bảo" },
    ],
  },
  {
    code: "product_expectation",
    label: "Kỳ vọng khách hàng về sản phẩm",
    types: [
      { code: "product_not_suitable", label: "Không phù hợp nhu cầu" },
      { code: "complain_machine_weak", label: "Kỳ vọng máy mạnh hơn" },
      { code: "expected_other_features", label: "Kỳ vọng tính năng khác" },
      { code: "not_satisfied_after_inspection", label: "Không ưng khi kiểm hàng" },
      { code: "size_not_suitable", label: "Không phù hợp kích thước" },
      { code: "not_suitable_for_user", label: "Không phù hợp với người sử dụng" },
      { code: "origin_expectation", label: "Kỳ vọng về nguồn gốc/xuất xứ sản phẩm" },
      { code: "price_expectation", label: "Kỳ vọng về giá" },
    ],
  },
  {
    code: "advertising_info",
    label: "Quảng cáo / Thông tin sản phẩm",
    types: [
      { code: "not_as_advertised", label: "Nội dung quảng cáo không đúng thực tế" },
      { code: "media_misleading", label: "Hình ảnh/video khiến khách hiểu khác về sản phẩm" },
      { code: "unclear_feature_description", label: "Mô tả tính năng chưa rõ" },
      { code: "overpromising_wording", label: "Cách diễn đạt tạo kỳ vọng cao" },
    ],
  },
  {
    code: "product_quality",
    label: "Sản phẩm / Chất lượng",
    types: [
      { code: "defective_not_working", label: "Sản phẩm lỗi/không hoạt động" },
      { code: "missing_accessories", label: "Thiếu phụ kiện/sai phụ kiện" },
      { code: "damaged_appearance", label: "Ngoại quan/kiện hàng có vấn đề" },
      { code: "abnormally_weak", label: "Máy hoạt động yếu bất thường" },
      {
        code: "poor_experience_product_issue",
        label: "Trải nghiệm thực tế không đạt do vấn đề sản phẩm",
      },
    ],
  },
];

export const BOMB_REASON_TYPE_TO_GROUP: Record<string, string> = {};
for (const group of BOMB_REASON_GROUPS) {
  for (const type of group.types) {
    BOMB_REASON_TYPE_TO_GROUP[type.code] = group.code;
  }
}
