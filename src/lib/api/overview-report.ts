// eslint-disable-next-line no-restricted-imports -- nợ typed client (audit 2026-09-23 P1-2): còn 1 call fetchJson, migrate dần sang @/api/typed
import { fetchJson } from "@/services/http";
import type { components } from "@/api/typed";

/** Kiểu response SINH TỪ HỢP ĐỒNG OpenAPI — đổi shape ở BE là `tsc` bắt ngay. */
export type OverviewReportSummary = components["schemas"]["OverviewReportSummaryResponse"];
export type OverviewSaleChannelRevenue = components["schemas"]["OverviewSaleChannelRevenue"];
/** Khối hoàn/rủi ro hoàn — không có cặp cột "giao thành công". */
export type OverviewSaleChannelAmount = components["schemas"]["OverviewSaleChannelAmount"];
export type OverviewRegionRevenue = components["schemas"]["OverviewRegionRevenue"];
export type OverviewProvinceRevenue = components["schemas"]["OverviewProvinceRevenue"];
/** Một điểm của biểu đồ diễn biến; `bucket` là ngày "YYYY-MM-DD", giờ "0".."23", hoặc thứ "1".."7". */
export type OverviewTimeseriesPoint = components["schemas"]["OverviewTimeseriesPoint"];
export type OverviewRevenueTimeseries = components["schemas"]["OverviewRevenueTimeseries"];
/** Một dòng top sản phẩm — doanh thu THUẦN cộng theo dòng hàng, đã sort giảm dần ở BE. */
export type OverviewTopProduct = components["schemas"]["OverviewTopProduct"];

export type OverviewReportParams = {
  dateFrom?: string;
  dateTo?: string;
  /** Lọc theo sản phẩm: mọi số tiền thành tiền của RIÊNG các SP này. */
  productIds?: number[];
  /** Ô "Nguồn": "marketplace" (nội sàn) / "off_marketplace" (ngoại sàn). */
  saleChannel?: string;
  /** Ô "Kênh bán": một nhóm trong tầng của `saleChannel` — xem `saleChannelGroupFor`. */
  saleChannelGroup?: string;
};

/** GET /api/orders/reports/overview — báo cáo tổng toàn công ty theo khoảng ngày. */
export async function getOverviewReport(
  params: OverviewReportParams,
  signal?: AbortSignal,
): Promise<OverviewReportSummary> {
  const query = new URLSearchParams();
  if (params.dateFrom) query.set("date_from", params.dateFrom);
  if (params.dateTo) query.set("date_to", params.dateTo);
  if (params.productIds?.length) query.set("product_ids", params.productIds.join(","));
  if (params.saleChannel) query.set("sale_channel", params.saleChannel);
  if (params.saleChannelGroup) query.set("sale_channel_group", params.saleChannelGroup);
  const qs = query.toString();
  const url = qs ? `/api/orders/reports/overview?${qs}` : "/api/orders/reports/overview";
  return (await fetchJson(url, { signal })) as OverviewReportSummary;
}
