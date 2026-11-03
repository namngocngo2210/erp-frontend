// eslint-disable-next-line no-restricted-imports -- nợ typed client (audit 2026-09-23 P1-2): còn 3 call fetchJson, migrate dần sang @/api/typed
import { fetchJson } from "@/services/http";

import type { AdsPlatform } from "./ads_campaign_report";

export type CampaignProductRow = {
  platform: AdsPlatform;
  /** PK trong bảng chiến dịch của nền tảng tương ứng — dùng để PATCH. */
  id: number;
  /** Id chiến dịch bên Facebook/Google. Chỉ để hiển thị/đối chiếu. */
  campaign_id: string;
  campaign_name: string;
  account_name: string;
  /** Chuỗi thập phân, đã nhân hệ số hiển thị của nền tảng (FB đổi theo mốc: 1.08
   *  cho kỳ trong tháng 8/2026, 1.1 trước đó và từ kỳ 01/09/2026 — xem
   *  docs/ads-facebook-cost-multiplier.md; Google 1.08). */
  cost: string;
  product_id: number | null;
  product_sku: string;
  product_name: string;
  /**
   * "auto" = máy đọc chắc chắn từ tên chiến dịch, "auto2" = máy ĐOÁN (mã gốc có nhiều
   * biến thể, hoặc tên nhắc nhiều sản phẩm) — cần người soát, "manual" = người gán.
   * "" khi chưa gán.
   */
  product_source: "auto" | "auto2" | "manual" | "";
};

/** Một TKQC để đổ vào ô lọc. `id` là id BÊN NỀN TẢNG (fb account_id / gads customer_id). */
export type CampaignAdAccountOption = {
  platform: AdsPlatform;
  id: string;
  name: string;
};

export type CampaignProductReport = {
  platform: AdsPlatform;
  rows: CampaignProductRow[];
  /** true = backend đã cắt bớt dòng. Bảng thiếu ≠ bảng đã gán hết. */
  truncated: boolean;
  assigned_cost: string;
  unassigned_cost: string;
  accessible_accounts: number | null;
  /** TKQC có chiến dịch trong phạm vi xem được. KHÔNG đổi theo bộ lọc đang chọn. */
  accounts: CampaignAdAccountOption[];
};

type ListParams = {
  since: string;
  until: string;
  /** "yes" | "no" | "" (tất cả) */
  assigned?: string;
  q?: string;
  /** `"<platform>:<id>"` — xem `accountFilterValue`. Rỗng = tất cả TKQC. */
  account?: string;
};

function buildQuery(params: ListParams): string {
  const query = new URLSearchParams({ since: params.since, until: params.until });
  if (params.assigned) query.set("assigned", params.assigned);
  if (params.q) query.set("q", params.q);
  if (params.account) query.set("account", params.account);
  return query.toString();
}

export async function getFacebookCampaignProducts(
  params: ListParams,
): Promise<CampaignProductReport> {
  return fetchJson(`/api/facebook-ads/campaign-products?${buildQuery(params)}`);
}

export async function getGoogleCampaignProducts(
  params: ListParams,
): Promise<CampaignProductReport> {
  return fetchJson(`/api/google-ads/campaign-products?${buildQuery(params)}`);
}

export async function setCampaignProduct(payload: {
  platform: AdsPlatform;
  id: number;
  productId: number | null;
}): Promise<CampaignProductRow> {
  const base = payload.platform === "facebook" ? "/api/facebook-ads" : "/api/google-ads";
  return fetchJson(`${base}/campaign-products`, {
    method: "PATCH",
    body: JSON.stringify({ id: payload.id, product_id: payload.productId }),
  });
}

/**
 * Gộp hai nền tảng, chi phí giảm dần — việc cần làm trước luôn là chiến dịch đang
 * đốt nhiều tiền nhất mà chưa gán sản phẩm.
 *
 * Nhận `null` cho nguồn lỗi: một nền tảng hỏng không được làm trắng cả bảng (cùng
 * quy ước với `mergeCampaignRows` của tab Chiến dịch).
 */
export function mergeCampaignProductRows(
  facebook: CampaignProductRow[] | null,
  google: CampaignProductRow[] | null,
): CampaignProductRow[] {
  return [...(facebook ?? []), ...(google ?? [])].sort((a, b) => Number(b.cost) - Number(a.cost));
}

/**
 * Khoá của một TKQC trên ô lọc: `"facebook:123"` / `"google:456"`.
 *
 * Có TIỀN TỐ nền tảng vì cùng một tham số `account` được gửi cho CẢ hai endpoint —
 * id TKQC Facebook và customer_id Google đều là chuỗi số nên so bằng id thô có thể
 * trùng nhau. Gửi cho cả hai (thay vì tắt hẳn request bên kia) để danh sách TKQC
 * trong ô lọc luôn còn đủ hai nền tảng.
 */
export function accountFilterValue(account: CampaignAdAccountOption): string {
  return `${account.platform}:${account.id}`;
}

/** Gộp TKQC hai nền tảng cho ô lọc; nguồn lỗi bị bỏ qua thay vì làm rỗng cả danh sách. */
export function mergeCampaignAccounts(
  reports: Array<CampaignProductReport | null | undefined>,
): CampaignAdAccountOption[] {
  return reports.flatMap((report) => report?.accounts ?? []);
}

/** Tổng chi phí chưa gán của 2 nguồn; nguồn lỗi bị bỏ qua thay vì tính thành 0. */
export function sumUnassignedCost(
  reports: Array<CampaignProductReport | null | undefined>,
): number {
  return reports.reduce((sum, report) => sum + (report ? Number(report.unassigned_cost) : 0), 0);
}
