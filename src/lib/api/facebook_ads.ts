// eslint-disable-next-line no-restricted-imports -- nợ typed client (audit 2026-09-23 P1-2): còn 9 call fetchJson, migrate dần sang @/api/typed
import { fetchJson } from "@/services/http";
import type { components } from "@/api/typed";

const API_BASE = "/api/facebook-ads";

/**
 * Type derive từ hợp đồng OpenAPI (D9). Field schema đánh optional vì có
 * default (note, spend_cap, currency, status, last_synced_at) được nắn lại
 * required vì BE luôn trả trong response.
 */
export type FacebookApp = Omit<components["schemas"]["FacebookApp"], "note"> & { note: string };

export type FacebookAppUpsertPayload = Omit<components["schemas"]["FacebookAppUpsert"], "note"> & {
  note?: string;
};

export type FacebookAppPartialPayload = components["schemas"]["PatchedFacebookAppPartialUpdate"];

export type FacebookAdAccount = Omit<
  components["schemas"]["FacebookAdAccount"],
  "spend_cap" | "currency" | "status" | "last_synced_at"
> & {
  spend_cap: string;
  currency: string;
  status: components["schemas"]["Status5b1Enum"];
  last_synced_at: string | null;
};

export type SyncResult = components["schemas"]["FacebookSyncAdAccountsResult"];

export async function listFacebookApps(): Promise<FacebookApp[]> {
  return fetchJson(`${API_BASE}/apps`);
}

export async function createFacebookApp(payload: FacebookAppUpsertPayload): Promise<FacebookApp> {
  return fetchJson(`${API_BASE}/apps`, { method: "POST", body: JSON.stringify(payload) });
}

export async function updateFacebookApp(
  id: number,
  payload: FacebookAppPartialPayload,
): Promise<FacebookApp> {
  return fetchJson(`${API_BASE}/apps/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export async function deleteFacebookApp(id: number): Promise<void> {
  return fetchJson(`${API_BASE}/apps/${id}`, { method: "DELETE" });
}

export async function syncFacebookAdAccounts(id: number): Promise<SyncResult> {
  return fetchJson(`${API_BASE}/apps/${id}/sync`, { method: "POST" });
}

export type SyncDailySpendResult = components["schemas"]["FacebookSyncDailySpendResult"];

/**
 * Trigger đồng bộ daily-spend on-demand (gọi FB Graph + upsert vào DB).
 * Truyền `datePreset` hoặc `since`/`until` để giới hạn khoảng. Bỏ trống để
 * dùng logic mặc định (full backfill cho account mới, last_7d cho account cũ).
 */
export async function syncFacebookDailySpend(
  appId: number,
  params: { datePreset?: string; since?: string; until?: string } = {},
): Promise<SyncDailySpendResult> {
  const body: Record<string, string> = {};
  if (params.since && params.until) {
    body.since = params.since;
    body.until = params.until;
  } else if (params.datePreset) {
    body.date_preset = params.datePreset;
  }
  return fetchJson(`${API_BASE}/apps/${appId}/sync-daily-spend`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export type InsightLevel = "account" | "campaign" | "adset" | "ad";

export interface InsightRow {
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  cpm?: string;
  reach?: string;
  date_start?: string;
  date_stop?: string;
}

/** Schema mô tả `data`/`level` generic nên override bằng shape cụ thể của FE. */
export type InsightsResponse = Omit<
  components["schemas"]["FacebookAdAccountInsightsResponse"],
  "ad_account" | "level" | "data"
> & {
  ad_account: FacebookAdAccount;
  level: InsightLevel;
  data: InsightRow[];
};

export interface InsightsParams {
  level?: InsightLevel;
  datePreset?: string;
  since?: string;
  until?: string;
  timeIncrement?: string;
}

export interface InsightsBatchParams {
  adAccountIds: number[];
  level?: InsightLevel;
  datePreset?: string;
  since?: string;
  until?: string;
  timeIncrement?: string;
}

export type DailySpendSummary = components["schemas"]["FacebookDailySpendSummaryResponse"];

export async function getDailySpendSummary(
  appId: number,
  params: { datePreset?: string; since?: string; until?: string; adAccountIds?: number[] },
): Promise<DailySpendSummary> {
  const qs = new URLSearchParams();
  if (params.since && params.until) {
    qs.set("since", params.since);
    qs.set("until", params.until);
  } else if (params.datePreset) {
    qs.set("date_preset", params.datePreset);
  }
  if (params.adAccountIds && params.adAccountIds.length > 0) {
    qs.set("ad_account_ids", params.adAccountIds.join(","));
  }
  return fetchJson(`${API_BASE}/apps/${appId}/daily-spend?${qs.toString()}`);
}

export async function listFacebookAdAccounts(
  id: number,
  options?: { includeRemoved?: boolean },
): Promise<FacebookAdAccount[]> {
  const qs = options?.includeRemoved ? "?include_removed=1" : "";
  return fetchJson(`${API_BASE}/apps/${id}/ad-accounts${qs}`);
}

export async function listAllFacebookAdAccounts(options?: {
  includeRemoved?: boolean;
}): Promise<FacebookAdAccount[]> {
  const qs = options?.includeRemoved ? "?include_removed=1" : "";
  return fetchJson(`${API_BASE}/ad-accounts${qs}`);
}
