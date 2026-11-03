import { getDateRange } from "@/components/ui/date-filter";
import { type FilterScope, type StoredOrderFilters } from "@/features/orders/use-orders-data";
import {
  LANDING_SHEET_TABS,
  LANDING_TABS,
  type LandingTabKey,
} from "@/features/orders/landing-tabs";

const LANDING_TAB_KEYS: ReadonlySet<LandingTabKey> = new Set(
  [...LANDING_TABS, ...LANDING_SHEET_TABS].map((t) => t.key),
);

/** Đọc tab landing từ query string (?tab=...). Mặc định "orders". */
export function parseLandingTab(search: string): LandingTabKey {
  const value = new URLSearchParams(search).get("tab");
  if (value && (LANDING_TAB_KEYS as Set<string>).has(value)) {
    return value as LandingTabKey;
  }
  return "orders";
}

export function getOrderTabScope(
  section: "orders" | "landing-orders" | "koc-orders",
  tab: LandingTabKey,
): FilterScope {
  if (section === "landing-orders") {
    if (tab === "delivered") return "landing-delivered";
    if (tab === "cancelled") return "landing-cancelled";
    if (tab === "sheet1") return "landing-sheet1";
    if (tab === "sheet2") return "landing-sheet2";
    if (tab === "sheet3") return "landing-sheet3";
    // summary và mặc định ("orders") → Tổng hợp (không gửi sheet).
    return "landing-summary";
  }
  if (section === "koc-orders") {
    if (tab === "delivered") return "koc-delivered";
    if (tab === "cancelled") return "koc-cancelled";
    return "koc";
  }
  if (tab === "delivered") return "orders-delivered";
  if (tab === "cancelled") return "orders-cancelled";
  return "orders";
}

export function getOrderTabFallbackDefaults(tab: LandingTabKey): Partial<StoredOrderFilters> {
  if (tab === "delivered") {
    const r = getDateRange("last_7_days");
    return {
      status: ["3"],
      invoiceStatus: [],
      dateFilter: { option: "last_7_days" as const, from: r.from, to: r.to },
    };
  }
  if (tab === "cancelled") {
    const r = getDateRange("this_month");
    return {
      status: [],
      invoiceStatus: ["2"],
      dateFilter: { option: "this_month" as const, from: r.from, to: r.to },
    };
  }
  return { status: [], invoiceStatus: [] };
}
