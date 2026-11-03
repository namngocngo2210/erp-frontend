import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchJson } from "@/services/http";

export type BlocklistReason = "spam" | "bomb" | "blacklist" | "duplicate_abuse" | "other";

export type BlocklistEntry = {
  id: number;
  phone_normalized: string;
  reason: BlocklistReason;
  notes: string;
  created_by_username: string;
  created_at: string;
  updated_at: string;
};

export type BlocklistListParams = {
  q?: string;
  reason?: BlocklistReason;
  limit: number;
  offset: number;
};

export type BlocklistListResponse = {
  items: BlocklistEntry[];
  total: number;
};

export const blocklistKeys = {
  all: ["blocklist"] as const,
  list: (params: BlocklistListParams) => ["blocklist", "list", params] as const,
};

/**
 * GET /api/orders/blocklist — danh sách số bị chặn có phân trang/lọc.
 * keepPreviousData: giữ trang cũ hiển thị trong khi tải trang/bộ lọc mới.
 */
export function useBlocklist(params: BlocklistListParams) {
  return useQuery({
    queryKey: blocklistKeys.list(params),
    queryFn: async ({ signal }): Promise<BlocklistListResponse> => {
      const search = new URLSearchParams({
        limit: String(params.limit),
        offset: String(params.offset),
      });
      if (params.q) search.set("q", params.q);
      if (params.reason) search.set("reason", params.reason);
      return (await fetchJson(`/api/orders/blocklist?${search.toString()}`, {
        signal,
      })) as BlocklistListResponse;
    },
    placeholderData: keepPreviousData,
  });
}

export function useAddBlocklistEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { phone: string; reason: BlocklistReason; notes: string }) =>
      fetchJson("/api/orders/blocklist", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: blocklistKeys.all });
    },
  });
}

export function useDeleteBlocklistEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => fetchJson(`/api/orders/blocklist/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: blocklistKeys.all });
    },
  });
}

export function useUpdateBlocklistReason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: BlocklistReason }) =>
      fetchJson(`/api/orders/blocklist/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: blocklistKeys.all });
    },
  });
}
