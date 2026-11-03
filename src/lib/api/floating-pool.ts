// eslint-disable-next-line no-restricted-imports -- nợ typed client (audit 2026-09-23 P1-2): còn 2 call fetchJson, migrate dần sang @/api/typed
import { fetchJson } from "@/services/http";
import { apiGet, apiPut, type components } from "@/api/typed";

const BASE = "/api/orders/floating-pool";

export type FloatingPoolEntriesResponse = components["schemas"]["FloatingPoolEntriesResponse"];
export type FloatingPoolEntryItem = components["schemas"]["FloatingPoolEntryItem"];
export type FloatingPoolConfig = components["schemas"]["FloatingPoolConfigResponse"];
export type FloatingPoolClaimResponse = components["schemas"]["FloatingPoolClaimResponse"];
export type FloatingPoolStatusOption = components["schemas"]["FloatingPoolStatusOption"];

export type FloatingPoolEntriesParams = {
  page: number;
  page_size: number;
  q?: string;
  entered_from?: string;
  entered_to?: string;
  channel?: string;
};

/**
 * GET có query string — spec CÓ khai query params nhưng `apiGet` chưa hỗ trợ
 * query nên giữ `fetchJson`; response vẫn type theo schema.
 */
export async function listFloatingPoolEntries(
  params: FloatingPoolEntriesParams,
): Promise<FloatingPoolEntriesResponse> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  });
  return fetchJson(`${BASE}/entries?${qs.toString()}`);
}

/** POST không body (`requestBody?: never`) — giữ `fetchJson` (cùng lối `retryPendingScan`). */
export async function claimFloatingPoolEntry(id: number): Promise<FloatingPoolClaimResponse> {
  return fetchJson(`${BASE}/entries/${id}/claim`, { method: "POST" });
}

export async function getFloatingPoolConfig(): Promise<FloatingPoolConfig> {
  return apiGet("/api/orders/floating-pool/config");
}

export async function putFloatingPoolConfig(
  payload: Omit<FloatingPoolConfig, "saved_status_options">,
): Promise<FloatingPoolConfig> {
  return apiPut("/api/orders/floating-pool/config", payload);
}
