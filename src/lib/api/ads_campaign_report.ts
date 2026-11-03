// eslint-disable-next-line no-restricted-imports -- nợ typed client (audit 2026-09-23 P1-2): còn 2 call fetchJson, migrate dần sang @/api/typed
import { fetchJson } from "@/services/http";

export type AdsPlatform = "facebook" | "google";

export type CampaignCostRow = {
  platform: AdsPlatform;
  account_name: string;
  campaign_id: string;
  campaign_name: string;
  /** Chuỗi thập phân đã nhân hệ số hiển thị của Facebook ở backend (1.08 nếu kỳ
   *  xem bắt đầu trong tháng 8/2026, 1.1 trước đó và từ 01/09/2026 — xem
   *  docs/ads-facebook-cost-multiplier.md). */
  cost: string;
  impressions: number;
  clicks: number;
  /** null = chưa có attribution theo chiến dịch. Không bao giờ là 0 giả. */
  revenue: string | null;
};

export type CampaignCostReport = {
  since: string;
  until: string;
  dimension: "campaign";
  rows: CampaignCostRow[];
  /** true = backend đã cắt bớt dòng. Bảng thiếu ≠ bảng không có gì. */
  truncated: boolean;
  /**
   * Số TKQC user được xem. `null` = không bị lọc (scope xem-toàn-bộ).
   * 0 = bị lọc và KHÔNG được gán TKQC nào — trạng thái này cho ra bảng rỗng y hệt
   * "không tiêu đồng nào", nên phải phân biệt bằng field chứ không đoán từ rows.
   */
  accessible_accounts: number | null;
};

export async function getFacebookCampaignCost(params: {
  since: string;
  until: string;
}): Promise<CampaignCostReport> {
  const query = new URLSearchParams(params).toString();
  return fetchJson(`/api/facebook-ads/reports/campaign?${query}`);
}

export async function getGoogleCampaignCost(params: {
  since: string;
  until: string;
}): Promise<CampaignCostReport> {
  const query = new URLSearchParams(params).toString();
  return fetchJson(`/api/google-ads/reports/campaign?${query}`);
}

/**
 * Gộp hai nguồn, xếp theo chi phí giảm dần.
 *
 * Nhận `null` cho nguồn lỗi: một nền tảng hỏng không được làm trắng cả bảng — số
 * của nền tảng còn lại vẫn đúng và vẫn dùng được.
 */
export function mergeCampaignRows(
  facebook: CampaignCostRow[] | null,
  google: CampaignCostRow[] | null,
): CampaignCostRow[] {
  return [...(facebook ?? []), ...(google ?? [])].sort((a, b) => Number(b.cost) - Number(a.cost));
}

/** null khi không có hiển thị — hiện "—" thay vì 0 hay NaN. */
export function computeCpm(cost: string, impressions: number): number | null {
  if (!impressions) return null;
  return (Number(cost) / impressions) * 1000;
}

/** null khi không có click. */
export function computeCpc(cost: string, clicks: number): number | null {
  if (!clicks) return null;
  return Number(cost) / clicks;
}

/**
 * Tỉ lệ click trên hiển thị, trả sẵn dạng phần trăm (2.35 = 2,35%).
 *
 * null khi không có hiển thị — cùng quy ước với computeCpm/computeCpc: ô trống đọc
 * là "không đo được", còn 0 là một khẳng định sai.
 *
 * Lưu ý nghiệp vụ: `clicks` của Facebook là TỔNG click (gồm click vào page/ảnh) nên
 * con số này nhỉnh hơn cột "CTR (link)" trong Ads Manager. Muốn khớp tuyệt đối phải
 * đồng bộ thêm inline_link_clicks.
 */
export function computeCtr(clicks: number, impressions: number): number | null {
  if (!impressions) return null;
  return (clicks / impressions) * 100;
}
