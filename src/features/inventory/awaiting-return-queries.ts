import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { fetchJson } from "@/services/http";
import { getApiErrorMessage } from "@/lib/errors";
import type { AwaitingReturnPage } from "@/lib/api/awaiting-return";

const BASE = "/api/inventory/dispatch-history/awaiting-return";

// Danh sách đơn huỷ đang chờ hàng về. Mặc định chỉ lấy dòng "waiting" — dòng đã về
// hoặc đã đóng chỉ xem khi người dùng đổi bộ lọc trạng thái.
export function useAwaitingReturn(params: {
  // Mảng rỗng = tất cả kho (dùng chung ô lọc kho với 2 tab kia).
  warehouseIds: string[];
  status?: string;
  limit: number;
  offset: number;
}) {
  const query = new URLSearchParams({
    limit: String(params.limit),
    offset: String(params.offset),
    status: params.status ?? "waiting",
  });
  if (params.warehouseIds.length > 0) query.set("warehouse_ids", params.warehouseIds.join(","));
  const search = query.toString();
  return useQuery({
    queryKey: ["inventory", "awaiting-return", search],
    queryFn: () => fetchJson(`${BASE}?${search}`) as Promise<AwaitingReturnPage>,
    staleTime: 10_000,
  });
}

// Đóng sổ đơn treo (hàng không bao giờ về). KHÔNG đụng tồn kho — chỉ ghi quyết định.
export function useCloseAwaitingReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, reason, note }: { orderId: number; reason: string; note: string }) =>
      fetchJson(`${BASE}/${orderId}/close`, {
        method: "POST",
        body: JSON.stringify({ reason, note }),
      }) as Promise<{ status: string }>,
    onSuccess: () => {
      toast.success("Đã đóng đơn khỏi danh sách chờ.");
      qc.invalidateQueries({ queryKey: ["inventory", "awaiting-return"] });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Đóng đơn thất bại."));
    },
  });
}
