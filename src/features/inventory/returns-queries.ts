import { useMutation, useQueryClient } from "@tanstack/react-query";

import { fetchJson } from "@/services/http";
import type { CreateReturnEntryPayload, ReturnEntryRow } from "@/features/inventory/returns-types";

const RETURNS_BASE = "/api/inventory/returns";

/**
 * Invalidate mọi nơi hiển thị đơn hoàn sau khi tạo (quét) / huỷ: tab "Nhập hàng
 * hoàn về" của Lịch sử nhập xuất (return-history/return-pending) + tồn kho.
 */
function invalidateReturns(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["inventory", "return-history"] });
  void qc.invalidateQueries({ queryKey: ["inventory", "return-pending"] });
  void qc.invalidateQueries({ queryKey: ["inventory", "stock"] });
}

/** Tạo nhóm đơn hoàn — chỉ còn luồng QUÉT trả hàng dùng (auto_post ghi sổ ngay). */
export function useCreateReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateReturnEntryPayload): Promise<ReturnEntryRow> =>
      fetchJson(RETURNS_BASE, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => invalidateReturns(qc),
  });
}

/** Điều chỉnh SL dòng hàng của nhóm đơn ĐÃ ghi sổ — cần quyền `returns:approve`. */
export function useAdjustReturnEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      lines,
    }: {
      id: number;
      lines: { product_id: number; quantity: number }[];
    }): Promise<ReturnEntryRow> =>
      fetchJson(`${RETURNS_BASE}/${id}/adjust`, {
        method: "POST",
        body: JSON.stringify({ lines }),
      }),
    onSuccess: () => invalidateReturns(qc),
  });
}

/** Huỷ 1 nhóm đơn hoàn (đảo bút toán tồn) — cần quyền `returns:approve`. */
export function useCancelReturnEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number): Promise<ReturnEntryRow> =>
      fetchJson(`${RETURNS_BASE}/${id}/cancel`, { method: "POST" }),
    onSuccess: () => invalidateReturns(qc),
  });
}
