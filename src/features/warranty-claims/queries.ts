import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  bulkDeleteWarrantyClaims,
  completeWarrantyClaim,
  createWarrantyClaim,
  deleteWarrantyClaim,
  getWarrantyClaim,
  listWarrantyClaims,
  updateWarrantyClaim,
} from "@/lib/api/warrantyClaims";
import { addJourney, deleteJourney, updateJourney } from "@/lib/api/warrantyJourneys";
import {
  createBestShipment,
  listBestAccounts,
  type CreateBestShipmentRequest,
} from "@/lib/api/bestExpress";
import { searchOrders } from "@/lib/api/orders";
import type {
  WarrantyClaimListParams,
  WarrantyClaimPayload,
  WarrantyJourneyPayload,
} from "@/features/warranty-claims/warranty-claim-types";

export const warrantyClaimKeys = {
  all: ["warranty-claims"] as const,
  list: (params: WarrantyClaimListParams) => ["warranty-claims", "list", params] as const,
  search: (q: string) => ["warranty-claims", "order-search", q] as const,
  detail: (id: number) => ["warranty-claims", "detail", id] as const,
};

export function useWarrantyClaims(params: WarrantyClaimListParams) {
  return useQuery({
    queryKey: warrantyClaimKeys.list(params),
    queryFn: () => listWarrantyClaims(params),
  });
}

export function useCreateWarrantyClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: WarrantyClaimPayload) => createWarrantyClaim(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: warrantyClaimKeys.all }),
  });
}

export function useUpdateWarrantyClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<WarrantyClaimPayload> }) =>
      updateWarrantyClaim(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: warrantyClaimKeys.all }),
  });
}

export function useDeleteWarrantyClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteWarrantyClaim(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: warrantyClaimKeys.all }),
  });
}

export function useBulkDeleteWarrantyClaims() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => bulkDeleteWarrantyClaims(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: warrantyClaimKeys.all }),
  });
}

export function useWarrantyClaim(id: number) {
  return useQuery({
    queryKey: warrantyClaimKeys.detail(id),
    queryFn: () => getWarrantyClaim(id),
    enabled: id > 0,
  });
}

export function useOrderSearch(q: string) {
  return useQuery({
    queryKey: warrantyClaimKeys.search(q),
    queryFn: () => searchOrders(q),
    enabled: q.trim().length >= 2,
    staleTime: 30_000,
  });
}

export function useCompleteClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => completeWarrantyClaim(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: warrantyClaimKeys.all }),
  });
}

export function useAddJourney() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (claimId: number) => addJourney(claimId),
    onSuccess: () => qc.invalidateQueries({ queryKey: warrantyClaimKeys.all }),
  });
}

export function useUpdateJourney() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: WarrantyJourneyPayload }) =>
      updateJourney(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: warrantyClaimKeys.all }),
  });
}

/**
 * `enabled` mặc định true để các nơi gọi hiện có không phải đổi. Khối §7 bung
 * inline (journey-sections-return.tsx) mount cùng JourneyCard bất kể đã bung
 * hay chưa — truyền `enabled: false` lúc chưa bung để khỏi gọi API tài khoản
 * Best (và tránh 403 vô ích) mỗi lần mở trang chi tiết phiếu (review finding 4).
 */
export function useBestAccounts(enabled: boolean = true) {
  return useQuery({
    queryKey: ["best-express", "accounts"] as const,
    queryFn: listBestAccounts,
    staleTime: 5 * 60_000,
    enabled,
  });
}

/** Tạo vận đơn Best — KHÔNG invalidate warranty keys: caller tự PATCH mã vào journey. */
export function useCreateBestShipment() {
  return useMutation({
    mutationFn: (body: CreateBestShipmentRequest) => createBestShipment(body),
  });
}

export function useDeleteJourney() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteJourney(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: warrantyClaimKeys.all }),
  });
}
