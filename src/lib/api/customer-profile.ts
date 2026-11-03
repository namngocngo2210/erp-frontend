// eslint-disable-next-line no-restricted-imports -- nợ typed client (audit 2026-09-23 P1-2): còn 2 call fetchJson, migrate dần sang @/api/typed
import { fetchJson } from "@/services/http";

export type CustomerEra = "legacy" | "current" | "both";
export type RecencyBucket = "active" | "cooling" | "at_risk" | "dormant";
export type PriceTier = "low" | "mid" | "high";
export type PurchaseRhythm = "one_time" | "repeat";
export type BuyerRole = "self" | "gift" | "mixed";

/** Nguồn của một trường chân dung khai báo: sale nhập tay hay AI suy ra. */
export type FieldSource = "declared" | "ai";

/** Một gợi ý trong ô tìm khách — mirror `CustomerSearchHitSerializer`. */
export type CustomerSearchHit = {
  customer_id: number;
  code: string | null;
  full_name: string | null;
  orders_gtc: number;
  total_spent: string;
  last_purchase_at: string | null;
  segment_code: string | null;
  segment_name: string | null;
  era: CustomerEra | null;
};

/** Một đơn trong dòng thời gian — mirror `TimelineOrderSerializer`. */
export type TimelineOrder = {
  order_id: number;
  order_code: string | null;
  created_at: string;
  created_date: string;
  status: number;
  is_gtc: boolean;
  total_after_discount: string;
  channel_name: string | null;
  staff_name: string | null;
  item_count: number;
  primary_sku: string | null;
  province: string | null;
  district: string | null;
  call_count: number;
  quality_total_score: number | null;
};

/** Hồ sơ 360 — mirror `CustomerProfileSerializer`.
 *
 * Ba nhóm trường xếp theo độ phủ giảm dần. Nhóm cuối (chân dung khai báo) rỗng
 * với khoảng 98/100 khách; các mảng của nó luôn là mảng (backend đã coalesce),
 * nên đọc `.length` là an toàn — đừng thêm lớp phòng thủ thứ hai ở đây. */
export type CustomerProfile = {
  customer_id: number;
  code: string | null;
  full_name: string | null;
  gender: string | null;
  created_at: string | null;
  is_new_customer: boolean | null;

  segment_code: string | null;
  segment_name: string | null;
  /** Câu tiếng Việt, không phải số: "Chốt đơn", "Tái kích hoạt ngay". */
  care_priority: string | null;
  has_problem: boolean | null;
  /** Mã chữ: "created_order", "no_answer_3". */
  latest_sales_status_code: string | null;

  orders_gtc: number;
  orders_all: number;
  orders_cancelled: number;
  total_spent: string;
  avg_order_value: number | null;
  first_purchase_at: string | null;
  last_purchase_at: string | null;
  days_since_last_purchase: number | null;
  repurchase_gap_median_days: number | null;
  channels: string[];
  provinces: string[];
  top_skus: string[];
  distinct_products: number;
  call_count: number;
  avg_quality_score: number | null;

  era: CustomerEra | null;
  price_tier_lifetime: PriceTier | null;
  purchase_rhythm_lifetime: PurchaseRhythm | null;
  recency_bucket: RecencyBucket | null;
  channel_affinity: string | null;
  product_affinity: string | null;
  buyer_role: BuyerRole | null;

  age_text: string | null;
  age_text_src: FieldSource | null;
  occupation_code: string | null;
  occupation_code_src: FieldSource | null;
  pain_level_code: string | null;
  pain_level_code_src: FieldSource | null;
  pain_duration_code: string | null;
  used_massage_before: boolean | null;
  lifestyle_habit_codes: string[];
  relax_time_codes: string[];
  purchase_barrier_codes: string[];
  delax_source_codes: string[];
  need_codes: string[];
  need_group_codes: string[];
  filled_field_count: number;
  ai_field_count: number;
};

export type CustomerProfileResponse = {
  profile: CustomerProfile;
  timeline: TimelineOrder[];
  /** Backend cắt dòng thời gian ở 500 đơn; cờ này để màn hình nói thật là đã cắt. */
  timeline_truncated: boolean;
};

/** Backend bỏ qua chuỗi ngắn hơn 2 ký tự và trả mảng rỗng — không phải lỗi. */
export const SEARCH_MIN_LENGTH = 2;

export async function searchCustomers(
  q: string,
  signal?: AbortSignal,
): Promise<CustomerSearchHit[]> {
  const query = new URLSearchParams({ q });
  const body = (await fetchJson(`/api/analytics/customers?${query.toString()}`, {
    signal,
  })) as { results: CustomerSearchHit[] };
  return body.results;
}

export async function getCustomerProfile(
  customerId: number,
  signal?: AbortSignal,
): Promise<CustomerProfileResponse> {
  return (await fetchJson(`/api/analytics/customers/${customerId}`, {
    signal,
  })) as CustomerProfileResponse;
}
