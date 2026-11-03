import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { fetchJson } from "@/services/http";
import { getApiErrorMessage } from "@/lib/errors";
import type {
  FlowPendingScans,
  ReturnHistory,
  ReturnSkusHistory,
  ReturnSkuReturns,
} from "@/lib/api/inventory-flow";

import { buildFlowParams, type FlowFilters, type MatchFilter } from "./issue-history-queries";

// Danh sách chính tab Nhập hoàn: theo phiếu trả. Là các phiếu đã khớp đơn nên
// khi lọc "Chưa khớp" thì tắt hẳn danh sách này (enabled=false).
export function useReturnHistory(
  filters: FlowFilters,
  page: { limit: number; offset: number },
  enabled = true,
) {
  const params = buildFlowParams(filters);
  params.set("limit", String(page.limit));
  params.set("offset", String(page.offset));
  return useQuery({
    queryKey: ["inventory", "return-history", params.toString()],
    queryFn: () =>
      fetchJson(`/api/inventory/return-history?${params.toString()}`) as Promise<ReturnHistory>,
    staleTime: 10_000,
    enabled,
  });
}

// Mã vận đơn nhập hoàn đã quét — lọc theo trạng thái khớp.
export function useReturnPending(filters: FlowFilters, match: MatchFilter = "all", enabled = true) {
  const params = buildFlowParams(filters);
  params.set("match", match);
  return useQuery({
    queryKey: ["inventory", "return-pending", params.toString()],
    queryFn: () =>
      fetchJson(
        `/api/inventory/return-history/pending?${params.toString()}`,
      ) as Promise<FlowPendingScans>,
    staleTime: 10_000,
    enabled,
  });
}

// View Theo SKU tab Nhập hoàn: gộp theo SKU.
export function useReturnSkus(
  filters: FlowFilters,
  page: { limit: number; offset: number },
  enabled = true,
) {
  const params = buildFlowParams(filters);
  params.set("limit", String(page.limit));
  params.set("offset", String(page.offset));
  return useQuery({
    queryKey: ["inventory", "return-skus", params.toString()],
    queryFn: () =>
      fetchJson(
        `/api/inventory/return-history/skus?${params.toString()}`,
      ) as Promise<ReturnSkusHistory>,
    staleTime: 10_000,
    enabled,
  });
}

// Drill-down: các phiếu trả chứa một SKU.
export function useReturnSkuReturns(
  productId: number | null,
  filters: FlowFilters,
  enabled: boolean,
) {
  const params = buildFlowParams(filters);
  if (productId) params.set("product_id", String(productId));
  return useQuery({
    queryKey: ["inventory", "return-sku-returns", params.toString()],
    queryFn: () =>
      fetchJson(
        `/api/inventory/return-history/skus/returns?${params.toString()}`,
      ) as Promise<ReturnSkuReturns>,
    staleTime: 10_000,
    enabled,
  });
}

// Sửa ghi chú của một phiếu trả ngay trên bảng lịch sử → invalidate danh sách.
export function useUpdateReturnNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ returnId, note }: { returnId: number; note: string }) =>
      fetchJson(`/api/inventory/return-history/${returnId}/note`, {
        method: "PATCH",
        body: JSON.stringify({ note }),
      }) as Promise<{ return_id: number; note: string }>,
    onSuccess: () => {
      // Ghi chú sửa được ở cả dòng phiếu trả (return-history) lẫn dòng mã đã khớp
      // (return-pending) → làm mới cả hai.
      qc.invalidateQueries({ queryKey: ["inventory", "return-history"] });
      qc.invalidateQueries({ queryKey: ["inventory", "return-pending"] });
    },
    // Passthrough nguyên văn lỗi BE — InlineNoteCell (flow-shared.tsx) bắt qua
    // mutateAsync để revert savedRef, không lưu đè khi lỗi.
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Lưu ghi chú thất bại."));
    },
  });
}
