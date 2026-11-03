import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/lib/errors";
import { fetchJson } from "@/services/http";

/**
 * Loại dòng trên trang Lịch sử nhập xuất — quyết định backend ghi ghi chú vào
 * đâu (bảng `stock_flow_notes` hay field sẵn có của thực thể).
 */
export type FlowNoteTarget =
  | "order_dispatch"
  | "awaiting_return"
  | "stock_document"
  | "return_entry"
  | "pending_scan";

export type FlowNoteInput = {
  targetType: FlowNoteTarget;
  targetId: number;
  note: string;
};

/**
 * Sửa ghi chú của một dòng bất kỳ trên trang. Một endpoint chung cho cả 5 loại
 * dòng — FE không cần biết note nằm ở bảng nào.
 */
export function useFlowNoteUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ targetType, targetId, note }: FlowNoteInput) =>
      fetchJson("/api/inventory/flow-notes", {
        method: "PATCH",
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          note,
        }),
      }) as Promise<{ target_type: string; target_id: number; note: string }>,
    onSuccess: () => {
      // Cùng một ghi chú có thể đang hiện ở nhiều danh sách (dòng phiếu chuyển
      // kho nằm ở cả tab Xuất lẫn tab Nhập hoàn) → làm mới tất cả.
      qc.invalidateQueries({ queryKey: ["inventory", "issue-orders"] });
      qc.invalidateQueries({ queryKey: ["inventory", "return-history"] });
      qc.invalidateQueries({ queryKey: ["inventory", "awaiting-return"] });
    },
    // Passthrough nguyên văn lỗi BE — InlineNoteCell bắt qua mutateAsync để
    // revert giá trị đã lưu, không nuốt lỗi im lặng.
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Lưu ghi chú thất bại."));
    },
  });
}
