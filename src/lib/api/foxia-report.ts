// eslint-disable-next-line no-restricted-imports -- nợ typed client (audit 2026-09-23 P1-2): còn 2 call fetchJson, migrate dần sang @/api/typed
import { fetchJson } from "@/services/http";

/** Một dòng của bảng hiệu quả marketing Foxia.
 *
 * Các tỉ số là `number | null` chứ không phải `number`: mẫu số 0 phải hiển thị
 * dấu gạch, không phải số 0 — "0đ mỗi đơn" đọc như miễn phí. */
export type FoxiaReportRow = {
  key: string;
  label: string;
  /** false = nguồn chưa gán kênh nội bộ nên không quy được chi phí. */
  mapped: boolean;
  orders: number;
  delivered: number;
  returned: number;
  revenue: number;
  collected: number;
  ship_fee: number;
  spend: number;
  cpo: number | null;
  cps: number | null;
  delivery_rate: number | null;
  return_rate: number | null;
  roas: number | null;
};

export type FoxiaReportResponse = {
  group_by: string;
  date_from: string;
  date_to: string;
  rows: FoxiaReportRow[];
  totals: FoxiaReportRow;
  /** Số đơn thuộc nguồn chưa ánh xạ — hiển thị tường minh, không nuốt lặng. */
  unmapped_orders: number;
};

export type FoxiaGroupBy = "source" | "channel" | "marketer" | "branch" | "brand";

export type FoxiaReportParams = {
  dateFrom?: string;
  dateTo?: string;
  groupBy?: FoxiaGroupBy;
};

export async function getFoxiaReport(
  params: FoxiaReportParams,
  signal?: AbortSignal,
): Promise<FoxiaReportResponse> {
  const query = new URLSearchParams();
  if (params.dateFrom) query.set("date_from", params.dateFrom);
  if (params.dateTo) query.set("date_to", params.dateTo);
  if (params.groupBy) query.set("group_by", params.groupBy);
  const qs = query.toString();
  return (await fetchJson(
    qs ? `/api/foxia/reports/marketing?${qs}` : "/api/foxia/reports/marketing",
    { signal },
  )) as FoxiaReportResponse;
}

export type FoxiaSyncRun = {
  resource: string;
  status: string;
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  error_message: string;
  started_at: string;
  finished_at: string | null;
};

export type FoxiaSyncStatus = {
  connection: {
    name: string;
    database: string;
    auth_status: string;
    auth_error: string;
    uid_checked_at: string | null;
  } | null;
  runs: FoxiaSyncRun[];
};

export async function getFoxiaSyncStatus(signal?: AbortSignal): Promise<FoxiaSyncStatus> {
  return (await fetchJson("/api/foxia/sync-status", { signal })) as FoxiaSyncStatus;
}

export type FoxiaCatalogEntry = {
  kind: "source" | "channel";
  foxia_id: number;
  name: string;
  channel_id: number | null;
};

export type FoxiaChannelMaps = {
  sources: FoxiaCatalogEntry[];
  channels: FoxiaCatalogEntry[];
};
