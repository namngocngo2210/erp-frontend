import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { fetchJson } from "@/services/http";
import { getApiErrorMessage } from "@/lib/errors";

export type ManualDispatchResult = {
  confirmed: number[];
  skipped: { order_id: number; reason: string }[];
};

// Backend trả mã máy tiếng Anh cho 3 nhánh skip biết trước (hợp đồng API — xem
// `SKIP_NOT_FOUND`/`SKIP_CANCELLED`/`SKIP_ALREADY_DISPATCHED` ở manual_dispatch_service.py,
// ĐỪNG đổi giá trị các mã này). Nhánh còn lại đi qua `str(exc)` nên đã LÀ câu tiếng Việt
// hoàn chỉnh — map dưới đây chỉ dịch 3 mã máy, còn lại hiển thị nguyên văn.
export const MANUAL_DISPATCH_SKIP_LABELS: Record<string, string> = {
  not_found: "Không tìm thấy đơn.",
  cancelled: "Đơn đã bị hủy.",
  already_dispatched: "Đơn đã được xuất kho trước đó.",
};

/**
 * Xuất kho tay cho đơn — TRỪ TỒN thật, không phải đánh dấu suông và không hoàn tác dễ
 * dàng. Chỉ gọi sau khi người dùng xác nhận qua dialog.
 *
 * `silent`: bỏ qua toast success/warning/error của chính hook (query invalidation vẫn
 * chạy bình thường). Dùng cho nơi gọi đã có TIẾNG NÓI DUY NHẤT của riêng nó — ví dụ
 * `ScanDispatchDialog` (Task 7) gộp kết quả nhiều đơn/nhiều kho vào 1 toast tổng kết ở
 * cuối `handleConfirm`; để hook bắn thêm toast riêng sẽ chồng — thậm chí NGƯỢC dấu —
 * với toast tổng kết đó. Mặc định (không truyền, hoặc `silent: false`) giữ nguyên hành
 * vi cũ: `ManualDispatchDialog` (Task 5, trang chi tiết đơn) đây LÀ tiếng nói duy nhất
 * cho thao tác — đổi mặc định sẽ làm dialog đó câm lặng.
 */
export function useManualDispatch(options: { silent?: boolean } = {}) {
  const { silent = false } = options;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderIds, warehouseId }: { orderIds: number[]; warehouseId: number }) =>
      fetchJson("/api/inventory/orders/dispatch", {
        method: "POST",
        body: JSON.stringify({ order_ids: orderIds, warehouse_id: warehouseId }),
      }) as Promise<ManualDispatchResult>,
    onSuccess: (result) => {
      if (!silent) {
        if (result.confirmed.length > 0) toast.success("Đã xuất kho.");
        for (const row of result.skipped) {
          toast.warning(MANUAL_DISPATCH_SKIP_LABELS[row.reason] ?? row.reason);
        }
      }
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (err) => {
      if (!silent) toast.error(getApiErrorMessage(err, "Xuất kho thất bại."));
    },
  });
}
