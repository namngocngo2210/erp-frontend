/**
 * Option arrays cho các enum của `WarrantyJourney` (section 2-7 phiếu bảo
 * hành) — nhãn dán theo spec `docs/superpowers/specs/2026-07-08-warranty-
 * claim-journeys-design.md` §2.2, giá trị khớp enum backend
 * (`schema.d.ts`: ClassificationEnum, ErrorCategoryEnum, ShippingFormE55Enum,
 * CarrierEnum, InspectionResultEnum, ResolutionEnum, StatusA6bEnum).
 */

/** §3 SP & lý do — `classification`. */
export const CLASSIFICATION_OPTIONS = [
  { value: "same_product", label: "Cùng SP" },
  { value: "different_product", label: "Khác SP" },
  { value: "accessory", label: "Phụ kiện" },
] as const;

/** §3 SP & lý do — `error_category`. */
export const ERROR_CATEGORY_OPTIONS = [
  { value: "product", label: "Sản phẩm" },
  { value: "customer", label: "Khách" },
  { value: "shipping", label: "Vận chuyển" },
  { value: "warehouse", label: "Kho" },
] as const;

/** §4 Vận chuyển & chi phí — `shipping_form`. */
export const SHIPPING_FORM_OPTIONS = [
  { value: "one_way", label: "Đơn 1 chiều" },
  { value: "exchange", label: "Đơn đổi hàng" },
  { value: "warranty_recall", label: "Đơn thu hồi BH" },
  { value: "return_recall", label: "Đơn thu hồi trả hàng" },
  { value: "warranty_return", label: "Đơn trả BH" },
] as const;

/** §4/§7 vận chuyển — dùng chung cho `carrier` và `return_carrier` (cùng enum ghn/best/vtp). */
export const CARRIER_OPTIONS = [
  { value: "ghn", label: "GHN" },
  { value: "best", label: "BEST" },
  { value: "vtp", label: "VTP" },
] as const;

/** §5 Kho nhận hàng BH — `inspection_result`. */
export const INSPECTION_OPTIONS = [
  { value: "broken_unrepairable", label: "Hỏng - Ko sửa được" },
  { value: "broken_repairable", label: "Hỏng - sửa được" },
  { value: "normal", label: "Dùng BT" },
  { value: "wrong_item", label: "Sai hàng" },
] as const;

/** §5 — `warehouse_check`: kho check hàng, chỉ hiện khi status = returned (đã nhận hàng hoàn). */
export const WAREHOUSE_CHECK_OPTIONS = [
  { value: "damaged", label: "Hàng hỏng" },
  { value: "normal", label: "Hàng dùng BT" },
] as const;

/** §6 CSKH chốt phương án — `resolution`. */
export const RESOLUTION_OPTIONS = [
  { value: "new_machine", label: "Gửi máy mới" },
  { value: "rewarranty", label: "Gửi lại máy BH" },
  { value: "exchange", label: "Đổi SP khác" },
  { value: "refund", label: "Hoàn tiền" },
] as const;

/** Khách nhận hàng — cảm nhận: `feedback_agree_review`. */
export const FEEDBACK_AGREE_OPTIONS = [
  { value: "yes", label: "Có" },
  { value: "no", label: "Không" },
] as const;

/** Khách nhận hàng — cảm nhận: `feedback_rating`. */
export const FEEDBACK_RATING_OPTIONS = [
  { value: "good", label: "Tốt" },
  { value: "average", label: "Trung bình" },
  { value: "unsatisfied", label: "Không hài lòng" },
  { value: "lost_trust", label: "Mất niềm tin" },
] as const;

/** Khiếu nại & đền bù: `carrier_response`. */
export const CARRIER_RESPONSE_OPTIONS = [
  { value: "pending", label: "Chưa phản hồi" },
  { value: "working_with_post", label: "Chờ lv với bưu cục" },
  { value: "agreed", label: "Chốt đền bù" },
  { value: "rejected", label: "Không được đền bù" },
] as const;

/** Khiếu nại & đền bù: `compensation_status`. */
export const COMPENSATION_STATUS_OPTIONS = [
  { value: "unpaid", label: "Chưa đền bù" },
  { value: "paid", label: "Đã đền bù" },
] as const;

/** Nhóm trạng thái VC tự động theo Best (11 nhóm) — key khớp BE `tracking_status`. */
export const VC_GROUP_LABELS: Record<string, string> = {
  created: "Tạo mới",
  picking_up: "Đang lấy hàng",
  pickup_failed: "Lấy hàng không thành công",
  in_transit: "Đang trung chuyển",
  delivering: "Đang giao hàng",
  redelivery: "Chờ giao lại",
  delivered: "GTC",
  returning: "Đang chuyển hoàn",
  returned: "Đã trả hàng",
  lost: "Thất lạc",
  damaged: "Hư hỏng",
};

export const VC_GROUP_BADGE_CLASS: Record<string, string> = {
  created: "bg-gray-200 text-gray-600",
  picking_up: "bg-sky-100 text-sky-700",
  pickup_failed: "bg-rose-100 text-rose-700",
  in_transit: "bg-indigo-100 text-indigo-700",
  delivering: "bg-blue-100 text-blue-700",
  redelivery: "bg-amber-100 text-amber-700",
  delivered: "bg-green-100 text-green-700",
  returning: "bg-orange-100 text-orange-700",
  returned: "bg-teal-100 text-teal-700",
  lost: "bg-red-100 text-red-700",
  damaged: "bg-red-200 text-red-800",
};
