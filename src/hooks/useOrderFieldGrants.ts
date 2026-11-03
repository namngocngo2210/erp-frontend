import { useAppShell } from "@/app/AppShellContext";

/** Field đơn nằm trong phạm vi quản lý của quyền sửa-theo-field (khớp catalog backend). */
const MANAGED_FIELDS = new Set([
  "name",
  "phone",
  "customer_gender",
  "address",
  "raw_address",
  "province",
  "district",
  "ward",
  "province_code",
  "district_code",
  "ward_code",
  "kiotviet_location",
  "kiotviet_ward",
  "items",
  "sku",
  "quantity",
  "total_amount",
  "total_after_discount",
  "discount_amount",
  "booking_voucher_discount",
  "other_price",
  "customer_prepaid",
  "shipping_fee",
  "shipping_code",
  "weight",
  "dimensions",
  "fulfillment_warehouse",
  "branch_id",
  "status",
  "result",
  "feedback",
  "customer_return",
  "return_date",
  "crm.sales_status_code",
  "crm.not_closed_reason_code",
  "crm.delivery_business_status_code",
  "crm.customer_classification_code",
  "crm.customer_attitude_raw",
  "crm.potential_level",
  "crm.internal_note",
  "crm.next_followup_at",
  "crm.bomb_reason_group_code",
  "crm.bomb_reason_type_code",
  "crm.bomb_reason_text",
  "crm.age_text",
  "crm.occupation_code",
  "crm.pain_level_code",
  "crm.pain_duration_code",
  "crm.used_massage_before",
  "crm.lifestyle_habit_codes",
  "crm.relax_time_codes",
  "crm.purchase_barrier_codes",
  "crm.delax_source_codes",
  "crm.comparing_brand_text",
  "crm.call_duration_code",
  "crm.post_purchase_feedback_text",
  "crm.post_purchase_rating_code",
  "crm.needs",
  "crm.__extra__",
  "invoice_code",
  "invoice_id",
  "vat",
  "is_export_vat",
  "vat_link",
  "payment_method",
  "order_code",
  "order_type",
  "koc_order_type",
  "order_source",
  "channel_code",
  "kiotviet_channel_id",
  "recall",
  "recall_entries",
  "created_at",
]);

/**
 * Quy tắc thuần — pure, test được.
 *
 * `undefined` = payload user chưa nạp xong → KHÔNG khoá. Khoá lúc chưa biết sẽ làm
 * ô nhập nhấp nháy disable→enable mỗi lần tải trang.
 *
 * Field ngoài catalog → không bị quản lý. FE siết hơn backend là khoá nhầm ô mà API
 * vẫn cho ghi.
 */
export function canEditOrderField(grants: string[] | undefined, field: string): boolean {
  if (grants === undefined) return true;
  if (!MANAGED_FIELDS.has(field)) return true;
  return grants.includes(field);
}

/** Hook: trả callback canEditField(field) đọc grant của user trong AppShell. */
export function useOrderFieldGrants(): (field: string) => boolean {
  const { user } = useAppShell();
  const grants = user?.editable_order_fields;
  return (field) => canEditOrderField(grants, field);
}
