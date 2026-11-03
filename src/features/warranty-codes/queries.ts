import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  assignBatch,
  createBatch,
  listBatches,
  listCodes,
  listScanLogs,
  splitBatch,
} from "@/lib/api/warrantyCodes";

import type { BatchListParams, CodeListParams, ScanLogListParams } from "./types";

export const warrantyCodeKeys = {
  all: ["warranty-codes"] as const,
  batches: (params: BatchListParams) => ["warranty-codes", "batches", params] as const,
  codes: (params: CodeListParams) => ["warranty-codes", "codes", params] as const,
  scanLogs: (params: ScanLogListParams) => ["warranty-codes", "scan-logs", params] as const,
};

export function useWarrantyCodeBatches(params: BatchListParams) {
  return useQuery({
    queryKey: warrantyCodeKeys.batches(params),
    queryFn: () => listBatches(params),
    // Lô lớn sinh mã nền — poll để tiến độ "Đang sinh x/y" tự nhích tới khi xong.
    refetchInterval: (query) =>
      query.state.data?.results.some((b) => b.is_generating) ? 3000 : false,
  });
}

export function useWarrantyCodes(params: CodeListParams) {
  return useQuery({ queryKey: warrantyCodeKeys.codes(params), queryFn: () => listCodes(params) });
}

export function useScanLogs(params: ScanLogListParams) {
  return useQuery({
    queryKey: warrantyCodeKeys.scanLogs(params),
    queryFn: () => listScanLogs(params),
  });
}

export function useCreateBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createBatch,
    onSuccess: () => qc.invalidateQueries({ queryKey: warrantyCodeKeys.all }),
  });
}

export function useAssignBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, productId }: { id: number; productId: number }) =>
      assignBatch(id, productId),
    onSuccess: () => qc.invalidateQueries({ queryKey: warrantyCodeKeys.all }),
  });
}

export function useSplitBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cutSeq }: { id: number; cutSeq: number }) => splitBatch(id, cutSeq),
    onSuccess: () => qc.invalidateQueries({ queryKey: warrantyCodeKeys.all }),
  });
}
