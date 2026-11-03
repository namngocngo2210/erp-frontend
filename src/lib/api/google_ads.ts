// eslint-disable-next-line no-restricted-imports -- nợ typed client (audit 2026-09-23 P1-2): còn 9 call fetchJson, migrate dần sang @/api/typed
import { fetchJson } from "@/services/http";
import type { components } from "@/api/typed";

const API_BASE = "/api/google-ads";

/**
 * Type derive từ hợp đồng OpenAPI (D9). Field schema đánh optional vì có
 * default (note, currency, status, last_synced_at) được nắn lại required vì
 * BE luôn trả trong response.
 */
export type GoogleAdsConfig = Omit<components["schemas"]["GoogleAdsConfig"], "note"> & {
  note: string;
};

export type GoogleAdsConfigUpsertPayload = Omit<
  components["schemas"]["GoogleAdsConfigUpsert"],
  "note"
> & { note?: string };

export type GoogleAdsConfigPartialPayload =
  components["schemas"]["PatchedGoogleAdsConfigPartialUpdate"];

export type GoogleAdsAccount = Omit<
  components["schemas"]["GoogleAdsAccount"],
  "currency" | "status" | "last_synced_at"
> & {
  currency: string;
  status: components["schemas"]["Status5b1Enum"];
  last_synced_at: string | null;
};

export type SyncAccountsResult = components["schemas"]["GoogleAdsSyncAccountsResult"];

export type SyncDailySpendResult = components["schemas"]["GoogleAdsSyncDailySpendResult"];

export async function listGoogleAdsConfigs(): Promise<GoogleAdsConfig[]> {
  return fetchJson(`${API_BASE}/configs`);
}

export async function createGoogleAdsConfig(
  payload: GoogleAdsConfigUpsertPayload,
): Promise<GoogleAdsConfig> {
  return fetchJson(`${API_BASE}/configs`, { method: "POST", body: JSON.stringify(payload) });
}

export async function updateGoogleAdsConfig(
  id: number,
  payload: GoogleAdsConfigPartialPayload,
): Promise<GoogleAdsConfig> {
  return fetchJson(`${API_BASE}/configs/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export async function deleteGoogleAdsConfig(id: number): Promise<void> {
  return fetchJson(`${API_BASE}/configs/${id}`, { method: "DELETE" });
}

export async function syncGoogleAdsAccounts(id: number): Promise<SyncAccountsResult> {
  return fetchJson(`${API_BASE}/configs/${id}/sync`, { method: "POST" });
}

/**
 * Trigger đồng bộ daily-spend on-demand (gọi Google Ads API + upsert vào DB).
 * Truyền `since`/`until` (YYYY-MM-DD) để giới hạn khoảng; bỏ trống để dùng logic
 * mặc định (backfill 365 ngày cho account mới, 7 ngày gần nhất cho account cũ).
 */
export async function syncGoogleAdsDailySpend(
  configId: number,
  params: { datePreset?: string; since?: string; until?: string } = {},
): Promise<SyncDailySpendResult> {
  const body: Record<string, string> = {};
  if (params.since && params.until) {
    body.since = params.since;
    body.until = params.until;
  } else if (params.datePreset) {
    body.date_preset = params.datePreset;
  }
  return fetchJson(`${API_BASE}/configs/${configId}/sync-daily-spend`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export type GoogleAdsDailySpendSummary =
  components["schemas"]["GoogleAdsDailySpendSummaryResponse"];

/**
 * Lấy tổng hợp chi phí theo từng tài khoản (đọc từ DB đã sync sẵn).
 * Truyền `datePreset` hoặc `since`/`until`; `accountIds` để giới hạn TK.
 */
export async function getGoogleAdsDailySpendSummary(
  configId: number,
  params: { datePreset?: string; since?: string; until?: string; accountIds?: number[] },
): Promise<GoogleAdsDailySpendSummary> {
  const qs = new URLSearchParams();
  if (params.since && params.until) {
    qs.set("since", params.since);
    qs.set("until", params.until);
  } else if (params.datePreset) {
    qs.set("date_preset", params.datePreset);
  }
  if (params.accountIds && params.accountIds.length > 0) {
    qs.set("account_ids", params.accountIds.join(","));
  }
  return fetchJson(`${API_BASE}/configs/${configId}/daily-spend?${qs.toString()}`);
}

export async function listGoogleAdsAccounts(configId: number): Promise<GoogleAdsAccount[]> {
  return fetchJson(`${API_BASE}/configs/${configId}/accounts`);
}

export async function listAllGoogleAdsAccounts(): Promise<GoogleAdsAccount[]> {
  return fetchJson(`${API_BASE}/accounts`);
}
