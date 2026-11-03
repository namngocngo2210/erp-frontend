export type SummaryFilters = {
  dateFrom: string;
  dateTo: string;
};

export type LandingDeliveredByStaffRow = {
  staff_id: number | null;
  staff__username: string | null;
  staff__display_name: string | null;
  total: number;
};

export type CloseRateRow = {
  staff_id: number | null;
  staff__username: string | null;
  staff__display_name: string | null;
  total: number;
  closed: number;
  spam: number;
  unreachable: number;
};

export type SaleFbRevenueByStaffRow = {
  staff_id: number | null;
  staff__username: string | null;
  staff__display_name: string | null;
  closed_orders: number;
  revenue: string;
};

export type SalePerformanceRow = {
  staff_id: number | null;
  staff__username: string | null;
  staff__display_name: string | null;
  total: number;
  total_assessed: number;
  closed: number;
  not_buying: number;
  nurture: number;
  unreached: number;
  dirty: number;
  warranty: number;
  /** Khách bị bệnh nền — trừ khỏi mẫu số "% chốt" (Nhóm 1). */
  underlying_condition: number;
  /** Khách muốn đến cửa hàng — trừ khỏi mẫu số của cả Nhóm 1 và Nhóm 2. */
  wants_store_visit: number;
  revenue: string;
  /** Doanh thu các đơn ở trạng thái chốt (gồm đơn bị hoàn, không gồm đơn huỷ). */
  closed_revenue: string;
  /** Số đơn sinh ra `closed_revenue` — không gồm "đã chốt, hẹn ngày", nên ≤ `closed`. */
  closed_revenue_orders: number;
  delivered_count: number;
  nurture_total_ever: number;
  nurture_followup_closed: number;
};

export type DataQualityByChannelRow = {
  channel_id: number | null;
  channel__code: string | null;
  channel__name: string | null;
  total: number;
  unreached: number;
  dirty: number;
};

export type DeliveryQualityCounters = {
  total: number;
  sent: number;
  returned: number;
  delivered: number;
  /** Đơn chưa có kết quả cuối: còn trong kho hoặc đang di chuyển. */
  in_delivery: number;
  /** Đơn khách không nhận: đang/đã chuyển hoàn, chờ chuyển hoàn lại, chờ xác nhận hoàn. */
  bomb: number;
  pending_over_threshold: number;
};

export type DeliveryQualityByStaffRow = DeliveryQualityCounters & {
  staff_id: number | null;
  staff__username: string | null;
  staff__display_name: string | null;
};

export type DeliveryQualityByChannelRow = DeliveryQualityCounters & {
  channel_id: number | null;
  channel__code: string | null;
  channel__name: string | null;
};

export type DataByCarrierRow = {
  carrier: string;
  label: string;
  total: number;
};

/**
 * Nhóm 10 — một hàng cho mỗi cặp (nhân viên sale, tab Landing). Backend trả
 * hàng phẳng, FE tự dựng ma trận (`buildSaleSheetMatrix`).
 */
export type SaleSheetRevenueRow = {
  staff_id: number | null;
  staff__username: string | null;
  staff__display_name: string | null;
  /** "sheet1" | "sheet2" | "sheet3", hoặc "" khi đơn không rơi vào tab nào. */
  sheet: string;
  closed_orders: number;
  closed_revenue: string;
  returned_orders: number;
  /** Doanh thu giao thành công — chỉ đơn đã giao xong, xem `SaleSheetCell`. */
  net_revenue: string;
};

export type BombReasonRow = {
  assessment__bomb_reason_type_code: string | null;
  label: string;
  count: number;
};

export type ReturnRateByProductRow = {
  items__product: number | null;
  items__product__sku: string | null;
  items__product__name: string | null;
  total: number;
  sent: number;
  returned: number;
};

export type DashboardSummary = {
  landing_delivered_by_staff: LandingDeliveredByStaffRow[];
  close_rate_by_staff: CloseRateRow[];
  sale_fb_revenue_by_staff?: SaleFbRevenueByStaffRow[];
  sale_fb_team_revenue?: string;
  sale_fb_team_closed_orders?: number;
  sale_performance_by_staff?: SalePerformanceRow[];
  closed_revenue_by_staff_sheet?: SaleSheetRevenueRow[];
  data_quality_by_channel?: DataQualityByChannelRow[];
  data_by_carrier?: DataByCarrierRow[];
  delivery_quality_by_staff?: DeliveryQualityByStaffRow[];
  delivery_quality_by_channel?: DeliveryQualityByChannelRow[];
  bomb_reasons?: BombReasonRow[];
  return_rate_by_product?: ReturnRateByProductRow[];
};

export type DashboardPageProps = {
  summary: DashboardSummary | null;
  loading: boolean;
  filters: SummaryFilters;
  onApplyFilters: (filters: SummaryFilters) => Promise<void>;
};

export type TooltipEntry = {
  name?: string | number;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
  dataKey?: string | number;
  unit?: string;
};

export type KpiTone = "default" | "success" | "danger" | "warning" | "muted";

export type KpiBreakdownItem = {
  label: string;
  value: string | number;
  tone?: KpiTone;
};

export type PodiumEntry = {
  key: string;
  badge: string;
  badgeIcon: "trophy" | "target" | "trending";
  title: string;
  subtitle?: string;
  bigValue: string;
  bigTone?: KpiTone;
  stats: KpiBreakdownItem[];
  bars: { label: string; value: number; tone: KpiTone }[];
};

/** 3 chuỗi của DeliveryQualityChart — mỗi section tự map counter của mình vào đây. */
export type DeliveryChartRow = {
  name: string;
  delivered: number;
  bomb: number;
  pending: number;
};

export type DistributionSlice = {
  name: string;
  value: number;
  color: string;
};
