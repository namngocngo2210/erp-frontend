// eslint-disable-next-line no-restricted-imports -- nợ typed client (audit 2026-09-23 P1-2): còn 6 call fetchJson, migrate dần sang @/api/typed
import { fetchJson } from "@/services/http";

import type {
  BatchListParams,
  CodeListParams,
  ScanLogListParams,
  ScanLogRow,
  WarrantyCodeBatch,
  WarrantyCodeRow,
} from "@/features/warranty-codes/types";

const BASE = "/api/warranty-codes";

function toQuery(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") q.set(key, String(value));
  }
  return q.toString();
}

export async function listBatches(
  params: BatchListParams,
): Promise<{ results: WarrantyCodeBatch[]; total: number }> {
  return fetchJson(`${BASE}/batches?${toQuery(params)}`);
}

export async function createBatch(payload: {
  quantity: number;
  /** null = nối tiếp counter toàn cục; có giá trị = tạo đúng khoảng số. */
  start_seq: number | null;
  product_id: number | null;
}): Promise<WarrantyCodeBatch> {
  return fetchJson(`${BASE}/batches`, { method: "POST", body: JSON.stringify(payload) });
}

export async function assignBatch(id: number, productId: number): Promise<WarrantyCodeBatch> {
  return fetchJson(`${BASE}/batches/${id}/assign`, {
    method: "POST",
    body: JSON.stringify({ product_id: productId }),
  });
}

export async function splitBatch(
  id: number,
  cutSeq: number,
): Promise<{ parent: WarrantyCodeBatch; child: WarrantyCodeBatch }> {
  return fetchJson(`${BASE}/batches/${id}/split`, {
    method: "POST",
    body: JSON.stringify({ cut_seq: cutSeq }),
  });
}

export async function listCodes(
  params: CodeListParams,
): Promise<{ results: WarrantyCodeRow[]; total: number }> {
  return fetchJson(`${BASE}/codes?${toQuery(params)}`);
}

export async function listScanLogs(
  params: ScanLogListParams,
): Promise<{ results: ScanLogRow[]; total: number }> {
  return fetchJson(`${BASE}/scan-logs?${toQuery(params)}`);
}
