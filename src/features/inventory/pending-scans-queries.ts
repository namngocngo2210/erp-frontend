import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createPendingScans,
  deletePendingScan,
  listPendingScans,
  retryPendingScan,
  type CreatePendingScansPayload,
  type PendingScanBatchResponse,
  type PendingScanListResponse,
  type PendingScanRow,
} from "@/lib/api/pending-scans";

export const pendingScanKeys = {
  list: (filters: Record<string, string>) => ["inventory", "pending-scans", filters] as const,
};

/** GET /api/inventory/pending-scans — danh sách mã chờ khớp (mặc định pending+failed). */
export function usePendingScans(
  filters: Record<string, string> = {},
  opts?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: pendingScanKeys.list(filters),
    queryFn: (): Promise<PendingScanListResponse> => listPendingScans(filters),
    enabled: opts?.enabled ?? true,
  });
}

/** POST /api/inventory/pending-scans/batch — tạo hàng loạt mã chờ khớp từ 1 lượt quét. */
export function useCreatePendingScans() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePendingScansPayload): Promise<PendingScanBatchResponse> =>
      createPendingScans(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["inventory", "pending-scans"] });
    },
  });
}

/** POST /api/inventory/pending-scans/:id/retry — thử lại 1 dòng lỗi. */
export function useRetryPendingScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number): Promise<PendingScanRow> => retryPendingScan(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["inventory", "pending-scans"] });
    },
  });
}

/** DELETE /api/inventory/pending-scans/:id — xoá 1 dòng chờ khớp. */
export function useDeletePendingScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number): Promise<void> => deletePendingScan(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["inventory", "pending-scans"] });
    },
  });
}
