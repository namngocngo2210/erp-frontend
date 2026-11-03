import { useEffect, useState } from "react";

import { getCrmCatalogs } from "@/lib/api/orders";
import { swallowError } from "@/lib/errors";

// ─────────────────────────────────────────────────────────────
// CRM catalog — fetched once and shared with OrderCell so inline
// edits on the "hành vi đơn hàng" columns can use the same options
// as the side panel / detail page.
// ─────────────────────────────────────────────────────────────
export type CrmCatalogOption = { code: string; label: string };
export type CrmCatalogPayload = {
  customer_classification_options?: CrmCatalogOption[];
  sales_status_options?: CrmCatalogOption[];
  not_closed_reason_options?: CrmCatalogOption[];
  delivery_business_status_options?: CrmCatalogOption[];
  potential_level_options?: Array<{ value: number; label: string }>;
  occupation_options?: CrmCatalogOption[];
  age_group_options?: CrmCatalogOption[];
  delax_source_options?: CrmCatalogOption[];
  pain_level_options?: CrmCatalogOption[];
  pain_duration_options?: CrmCatalogOption[];
  lifestyle_habit_options?: CrmCatalogOption[];
  relax_time_options?: CrmCatalogOption[];
  purchase_barrier_options?: CrmCatalogOption[];
  call_duration_options?: CrmCatalogOption[];
  post_purchase_rating_options?: CrmCatalogOption[];
  need_groups?: Array<{ code: string; name_vi: string; sort_order: number }>;
  need_types?: Array<{ code: string; group_code: string; name_vi: string; sort_order: number }>;
  bomb_reason_groups?: Array<{ code: string; name_vi: string; sort_order: number }>;
  bomb_reason_types?: Array<{
    code: string;
    group_code: string;
    name_vi: string;
    sort_order: number;
    /** false = mã cũ chỉ để hiển thị dữ liệu lịch sử, ẩn khỏi dropdown chọn mới. */
    is_active?: boolean;
  }>;
};

export function toOpts(items?: CrmCatalogOption[]): Array<{ value: string; label: string }> {
  return (items ?? []).map((item) => ({ value: item.code, label: item.label }));
}

// Load CRM catalog 1 lần để cung cấp options cho các cell "hành vi đơn hàng".
// Endpoint là cùng cái OrderDetailPage đang dùng, response shape là CrmCatalogPayload.
export function useCrmCatalog(): CrmCatalogPayload | null {
  const [crmCatalog, setCrmCatalog] = useState<CrmCatalogPayload | null>(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getCrmCatalogs<CrmCatalogPayload>();
        if (mounted) setCrmCatalog(data);
      } catch (err: unknown) {
        // ignore — fallback to local constants
        swallowError(err, "orders.loadCrmCatalog");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);
  return crmCatalog;
}
