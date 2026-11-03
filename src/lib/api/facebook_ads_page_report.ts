// eslint-disable-next-line no-restricted-imports -- nợ typed client (audit 2026-09-23 P1-2): còn 1 call fetchJson, migrate dần sang @/api/typed
import { fetchJson } from "@/services/http";

const API_BASE = "/api/facebook-ads";

export type PageCostRow = {
  page_id: string;
  page_name: string;
  cost: string;
  impressions: number;
  clicks: number;
  /** null = chưa go-live attribution (giai đoạn A). Không bao giờ là 0 giả. */
  revenue: string | null;
  closed_orders: number | null;
  ratio_pct: number | null;
};

export type PageCostReport = {
  since: string;
  until: string;
  dimension: "page";
  /** null = chưa có dữ liệu doanh thu theo page. */
  revenue_available_from: string | null;
  rows: PageCostRow[];
};

/** Chỉ hiện cột doanh thu khi backend xác nhận đã có mốc go-live. */
export function hasRevenueColumns(revenueAvailableFrom: string | null): boolean {
  return revenueAvailableFrom !== null;
}

/**
 * Xếp theo chi phí giảm dần, riêng dòng "không rõ page" luôn xuống cuối — nó là
 * ghi chú chất lượng dữ liệu, không phải một page để đem ra so sánh.
 */
export function sortRowsByCost(rows: PageCostRow[]): PageCostRow[] {
  return [...rows].sort((a, b) => {
    if (a.page_id === "") return 1;
    if (b.page_id === "") return -1;
    return Number(b.cost) - Number(a.cost);
  });
}

export async function getPageCostReport(params: {
  since: string;
  until: string;
}): Promise<PageCostReport> {
  const query = new URLSearchParams(params).toString();
  return fetchJson(`${API_BASE}/reports/page?${query}`);
}
