import { useMutation, useQueryClient } from "@tanstack/react-query";

import { fetchJson } from "@/services/http";

import type { DispatchResult, LookupResponse } from "./scan-types";

export type LookupMode = "dispatch" | "return" | "return_scan";

/**
 * Tra đơn theo mã vận đơn / mã thu hồi.
 *
 * `mode="dispatch"` (mặc định của backend): xác minh realtime với KiotViet → 409
 * `order_cancelled` / 503 `verify_unavailable`.
 *
 * `mode="return"`: KHÔNG xác minh — đơn hủy vẫn phải nhập hoàn được (hàng quay về
 * kho). Dùng cho màn KÉO DÒNG HÀNG của đơn vào phiếu kho thủ công.
 *
 * `mode="return_scan"`: như `return`, THÊM chặn mã đã có lần nhập hoàn còn sống →
 * 409 `return_already_scanned`. Chỉ dùng cho quét nhập hoàn — đừng đổi màn phiếu
 * kho sang mode này, nó sẽ không kéo được dòng hàng của đơn đã từng hoàn.
 *
 * Luôn truyền mode tường minh để không vô tình dính gate xác minh ở các luồng nhập.
 */
export async function lookupByShippingCode(
  code: string,
  mode: LookupMode = "dispatch",
): Promise<LookupResponse> {
  // `invoice_match=1`: cửa khoá triển khai ở backend (shipping_lookup_view.py) —
  // CHỈ bundle FE biết đọc `matched_by` (đọc được shape response mới) mới được gửi
  // cờ này, để một tab quét cũ để mở qua lúc deploy (build cũ, không hiểu
  // `matched_by`) không bao giờ nhận một đơn khớp theo mã hoá đơn mà nó sẽ xử lý
  // sai (gửi thẳng vào dispatch-batch với kho màn quét). Vì đây LÀ bundle mới nên
  // luôn gửi cờ này cho mode=dispatch; backend tự bỏ qua với mode khác. Gỡ cờ này
  // khi không còn bundle cũ nào lưu hành (đồng thời gỡ gate ở backend).
  let url = `/api/orders/lookup-by-shipping-code?code=${encodeURIComponent(code)}&mode=${mode}`;
  if (mode === "dispatch") url += "&invoice_match=1";
  return fetchJson(url) as Promise<LookupResponse>;
}

export function isMultiple(
  r: LookupResponse,
): r is { multiple: true; orders: import("./scan-types").LookupOrder[] } {
  return (r as { multiple?: boolean }).multiple === true;
}

export function useDispatchBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { fulfillment_warehouse_id: number; order_ids: number[] }) =>
      fetchJson("/api/orders/dispatch-batch", {
        method: "POST",
        body: JSON.stringify(payload),
      }) as Promise<{ results: DispatchResult[] }>,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["inventory", "stock"] });
      // Đơn vừa xuất kho có thể trùng mã với 1 dòng đang "chờ khớp" (quét trước khi
      // đơn sync) — làm mới cả 2 view pending (trang Lịch sử nhập xuất) lẫn bảng
      // pending-scans trung tâm (PendingScansDialog/ShipmentsPage) để không hiện
      // stale sau khi dispatch-batch xong.
      void qc.invalidateQueries({ queryKey: ["inventory", "issue-pending"] });
      void qc.invalidateQueries({ queryKey: ["inventory", "return-pending"] });
      void qc.invalidateQueries({ queryKey: ["inventory", "pending-scans"] });
    },
  });
}
