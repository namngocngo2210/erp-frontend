/**
 * Filter cho trang "Đề xuất nội dung", mirror `filters.ts` của Task 10
 * nhưng cho `/api/media/proposals` (statuses + productIds + q, không có sort).
 */
export type ProposalFilters = {
  statuses: string[];
  productIds: string[];
  q: string;
  page: number;
  pageSize: number;
};

export function proposalFiltersToParams(f: ProposalFilters): URLSearchParams {
  const sp = new URLSearchParams();
  f.statuses.forEach((s) => sp.append("status", s));
  f.productIds.forEach((p) => sp.append("product_id", p));
  if (f.q.trim()) sp.set("q", f.q.trim());
  if (f.page !== 1) sp.set("page", String(f.page));
  if (f.pageSize !== 20) sp.set("page_size", String(f.pageSize));
  return sp;
}

export function proposalFiltersFromParams(sp: URLSearchParams): ProposalFilters {
  const page = Number(sp.get("page") ?? "1");
  const size = Number(sp.get("page_size") ?? "20");
  return {
    statuses: sp.getAll("status"),
    productIds: sp.getAll("product_id"),
    q: sp.get("q") ?? "",
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: Number.isInteger(size) && size >= 1 && size <= 100 ? size : 20,
  };
}
