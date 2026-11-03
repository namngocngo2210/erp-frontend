import { useQuery } from "@tanstack/react-query";

import { fetchJson } from "@/services/http";

import type { LedgerResponse } from "./ledger-types";

const LEDGER_BASE = "/api/inventory/ledger-documents";

export const ledgerKeys = {
  list: (filters: Record<string, string | string[]>) => ["inventory", "ledger", filters] as const,
};

export function useLedgerDocuments(filters: Record<string, string | string[]>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (Array.isArray(v)) v.forEach((x) => x && params.append(k, x));
    else if (v) params.set(k, v);
  }
  return useQuery({
    queryKey: ledgerKeys.list(filters),
    queryFn: () => fetchJson(`${LEDGER_BASE}?${params.toString()}`) as Promise<LedgerResponse>,
    staleTime: 10_000,
  });
}
