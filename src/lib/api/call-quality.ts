// eslint-disable-next-line no-restricted-imports -- nợ typed client (audit 2026-09-23 P1-2): còn 7 call fetchJson, migrate dần sang @/api/typed
import { fetchJson } from "@/services/http";

/**
 * Trang Chất lượng cuộc gọi — đánh giá CHUNG cả team (v1 không chấm theo từng
 * nhân viên; xem docs/superpowers/specs/2026-07-30-call-quality-scoring-design.md).
 *
 * Kiểu khai tay chứ không sinh từ OpenAPI: các endpoint này trả JSON tự do
 * (OpenApiResponse mô tả bằng lời), nên `components["schemas"]` không có entry
 * tương ứng để tham chiếu.
 */

export type QualityPeriod = { start: string; end: string };

export type QualityBlockAverage = {
  code: string;
  label: string;
  weight: number;
  avg_score: number;
  call_count: number;
};

export type QualityCriterionAverage = {
  code: string;
  label: string;
  block: string;
  avg_score: number;
  max_score: number;
  /** Số cuộc thực sự được chấm tiêu chí này (đã loại "na") — LUÔN hiện cạnh điểm. */
  call_count: number;
  zero_count: number;
};

export type QualityRedFlagCount = { code: string; label: string; count: number };

/** Việc nên làm cho một tiêu chí yếu — nội dung viết sẵn ở rubric, không do AI sinh. */
export type QualityAction = { code: string; label: string; action: string };

export type QualityAgentRow = {
  staff_id: number;
  name: string;
  call_count: number;
  avg_score: number;
  /** Mạnh/yếu nhất CỦA CHÍNH người đó, không phải so với đồng nghiệp. */
  best: QualityCriterionAverage | null;
  worst: QualityCriterionAverage | null;
  action: string;
};

export type QualityCoverage = {
  total_calls: number;
  with_recording: number;
  transcribed: number;
  scored: number;
  /**
   * true khi đang lọc theo trạng thái sale: dòng này CỐ Ý đếm cả kỳ, không theo
   * bộ lọc — nó là chỉ số hạ tầng (tổng đài có mất ghi âm không), lọc theo trạng
   * thái sale làm tỷ lệ "có ghi âm" mất ý nghĩa.
   */
  ignores_filters?: boolean;
};

export type QualitySummary = {
  period: QualityPeriod;
  rubric_version: string;
  pass_score: number;
  total_calls: number;
  avg_score: number;
  pass_rate: number;
  avg_wpm: number;
  avg_talk_ratio: number;
  blocks: QualityBlockAverage[];
  criteria: QualityCriterionAverage[];
  red_flags: QualityRedFlagCount[];
  /** Tiêu chí đạt >= 1.5/2 — cả team đang làm tốt. */
  strengths: QualityCriterionAverage[];
  /** Tiêu chí dưới 1.0/2 — cần cải thiện. */
  weaknesses: QualityCriterionAverage[];
  /** 3 việc nên làm, suy từ 3 tiêu chí yếu nhất. */
  actions: QualityAction[];
  coverage: QualityCoverage;
};

export type QualityTrendPoint = {
  week_start: string;
  call_count: number;
  avg_score: number;
  blocks: Record<string, number>;
};

export type QualityFilterOptions = {
  /** Chỉ những giá trị CÓ THẬT trong tập đã chấm của kỳ — không phải toàn danh mục. */
  sales: { id: number; name: string }[];
  skus: string[];
  sales_statuses: { code: string; label: string }[];
};

export type QualityCallRow = {
  id: number;
  call_record_id: number;
  call_date: string;
  /** Sale PHỤ TRÁCH ĐƠN, không phải người cầm máy — Zenify không trả định danh nhân viên. */
  sale_name: string;
  customer_name: string;
  customer_phone: string;
  /** SKU các sản phẩm trên đơn khớp cuộc gọi (lấy từ OrderItem.sku). */
  skus: string[];
  order_id: number | null;
  duration_seconds: number;
  total_score: number;
  block_scores: Record<string, number>;
  red_flags: string[];
  sales_status_code: string;
  /** Nhãn tiếng Việt của trạng thái, do BE map từ crm_catalog — FE không tự chép. */
  sales_status_label: string;
  wpm: number;
  talk_ratio: number;
  summary: string;
};

export type QualityCriterionDetail = {
  code: string;
  label: string;
  guide: string;
  block: string;
  score: number | null;
  na: boolean;
  evidence: string;
};

export type QualityCallDetail = QualityCallRow & {
  rubric_version: string;
  model_name: string;
  coaching: string;
  criteria: QualityCriterionDetail[];
  red_flags_detail?: never;
  rejected: Record<string, string>;
  cross_check: {
    ai_not_closed_reason: string;
    sale_not_closed_reason_code: string;
    sale_not_closed_reason_label: string;
    sale_sales_status_code: string;
    sale_sales_status_label: string;
    /** Sale đã sửa trạng thái sau khi AI chấm — hai mã trên màn hình khác nhau là vì thế. */
    sales_status_changed_since: boolean;
    contraindications: string[];
  };
  transcript: string;
  recording_url: string;
  reviews: {
    id: number;
    criterion: string;
    ai_score: number | null;
    human_score: number | null;
    note: string;
    created_at: string;
  }[];
};

/** Chi tiết trả `red_flags` dạng object (khác dòng danh sách chỉ có mã). */
export type QualityCallDetailResponse = Omit<QualityCallDetail, "red_flags"> & {
  red_flags: { code: string; label: string; evidence: string }[];
};

export type QualityCallsParams = QualityScope & {
  minScore?: number;
  maxScore?: number;
  hasRedFlag?: boolean;
  /** Lọc cuộc bị 0 điểm ở tiêu chí này — đường từ bảng tiêu chí yếu sang ví dụ thật. */
  criterion?: string;
  /** ID sale phụ trách đơn. */
  staffId?: number;
  sku?: string;
  page?: number;
  pageSize?: number;
};

/**
 * Phạm vi CHUNG của cả trang: khoảng ngày + trạng thái sale. Trạng thái sale nay
 * chi phối mọi khối (thẻ số, tiêu chí, xu hướng, bảng theo sale) chứ không riêng
 * bảng danh sách, nên nó đi cùng khoảng ngày ở đây thay vì nằm rải ở từng hàm.
 */
export type QualityScope = { start?: string; end?: string; salesStatus?: string };

function periodQuery(params: QualityScope): URLSearchParams {
  const query = new URLSearchParams();
  if (params.start) query.set("start", params.start);
  if (params.end) query.set("end", params.end);
  if (params.salesStatus) query.set("sales_status", params.salesStatus);
  return query;
}

export async function getQualitySummary(
  params: QualityScope,
  signal?: AbortSignal,
): Promise<QualitySummary> {
  const qs = periodQuery(params).toString();
  return (await fetchJson(
    qs ? `/api/callcenter/quality/summary?${qs}` : "/api/callcenter/quality/summary",
    { signal },
  )) as QualitySummary;
}

export async function getQualityTrend(
  params: QualityScope,
  signal?: AbortSignal,
): Promise<QualityTrendPoint[]> {
  const qs = periodQuery(params).toString();
  const data = (await fetchJson(
    qs ? `/api/callcenter/quality/trend?${qs}` : "/api/callcenter/quality/trend",
    { signal },
  )) as { items: QualityTrendPoint[] };
  return data.items ?? [];
}

export async function getQualityCalls(
  params: QualityCallsParams,
  signal?: AbortSignal,
): Promise<{ items: QualityCallRow[]; total: number; page: number; page_size: number }> {
  const query = periodQuery(params);
  if (params.minScore != null) query.set("min_score", String(params.minScore));
  if (params.maxScore != null) query.set("max_score", String(params.maxScore));
  if (params.hasRedFlag) query.set("has_red_flag", "1");
  if (params.criterion) query.set("criterion", params.criterion);
  if (params.staffId != null) query.set("staff", String(params.staffId));
  if (params.sku) query.set("sku", params.sku);
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("page_size", String(params.pageSize));
  const qs = query.toString();
  return (await fetchJson(
    qs ? `/api/callcenter/quality/calls?${qs}` : "/api/callcenter/quality/calls",
    { signal },
  )) as { items: QualityCallRow[]; total: number; page: number; page_size: number };
}

export async function getQualityCallDetail(
  scoreId: number,
  signal?: AbortSignal,
): Promise<QualityCallDetailResponse> {
  return (await fetchJson(`/api/callcenter/quality/calls/${scoreId}`, {
    signal,
  })) as QualityCallDetailResponse;
}

export async function postQualityReview(
  scoreId: number,
  body: { criterion?: string; human_score?: number | null; note?: string },
): Promise<{ id: number }> {
  return (await fetchJson(`/api/callcenter/quality/calls/${scoreId}/review`, {
    method: "POST",
    body: JSON.stringify(body),
  })) as { id: number };
}

export async function getQualityFilterOptions(
  params: QualityScope,
  signal?: AbortSignal,
): Promise<QualityFilterOptions> {
  const qs = periodQuery(params).toString();
  return (await fetchJson(
    qs ? `/api/callcenter/quality/filters?${qs}` : "/api/callcenter/quality/filters",
    { signal },
  )) as QualityFilterOptions;
}

export async function getQualityAgents(
  params: QualityScope & { minCalls?: number },
  signal?: AbortSignal,
): Promise<QualityAgentRow[]> {
  const query = periodQuery(params);
  if (params.minCalls) query.set("min_calls", String(params.minCalls));
  const qs = query.toString();
  const data = (await fetchJson(
    qs ? `/api/callcenter/quality/agents?${qs}` : "/api/callcenter/quality/agents",
    { signal },
  )) as { items: QualityAgentRow[] };
  return data.items ?? [];
}
