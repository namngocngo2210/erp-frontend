import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { fetchJson } from "@/services/http";
import { getApiErrorMessage } from "@/lib/errors";
import type { FlowManualMatchResult, FlowOrderLookup } from "@/lib/api/inventory-flow";

// Tìm đơn theo mã hóa đơn / mã đơn / mã vận đơn (server-side, min 2 ký tự).
export function useFlowOrderLookup(q: string, enabled: boolean) {
  const term = q.trim();
  return useQuery({
    queryKey: ["inventory", "flow-order-lookup", term],
    queryFn: () =>
      fetchJson(
        `/api/inventory/flow-order-lookup?q=${encodeURIComponent(term)}`,
      ) as Promise<FlowOrderLookup>,
    enabled: enabled && term.length >= 2,
    staleTime: 10_000,
  });
}

// Dòng hàng của một lần gửi bù (đổi lỗi 2 chiều) → sinh Phiếu Xuất kho.
export type ReplacementPayload = {
  lines: { product_id: number; quantity: number }[];
  note: string;
};

// Khớp thủ công 1 mã chờ khớp với đơn đã chọn; refresh danh sách sau khi khớp.
// Khớp = ghi sổ thật (xuất kho / nhập hoàn) nên phải làm mới cả tồn kho, phiếu kho
// và danh sách phiếu trả, không chỉ 2 bảng của trang Lịch sử nhập xuất.
export function useFlowManualMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      scanId,
      orderId,
      replacement,
    }: {
      scanId: number;
      orderId: number;
      replacement?: ReplacementPayload;
    }) =>
      fetchJson(`/api/inventory/flow-pending/${scanId}/match`, {
        method: "POST",
        body: JSON.stringify(
          replacement ? { order_id: orderId, replacement } : { order_id: orderId },
        ),
      }) as Promise<FlowManualMatchResult>,
    onSuccess: () => {
      for (const key of [
        "issue-pending",
        "return-pending",
        "issue-orders",
        "return-history",
        "stock",
        "ledger",
        "returns",
        // Hàng gửi bù sinh Phiếu Xuất kho → danh sách phiếu phải tươi lại.
        "documents",
      ]) {
        void qc.invalidateQueries({ queryKey: ["inventory", key] });
      }
    },
  });
}

// Tạo phiếu bù cho mã ĐÃ khớp từ trước (ca cũ). Tách khỏi `useFlowManualMatch` vì đây
// không phải hành động khớp — mã đã khớp rồi, chỉ thiếu chứng từ xuất kho.
export function useFlowReplacementIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ scanId, replacement }: { scanId: number; replacement: ReplacementPayload }) =>
      fetchJson(`/api/inventory/flow-pending/${scanId}/replacement-issue`, {
        method: "POST",
        body: JSON.stringify({ replacement }),
      }) as Promise<{ ok: boolean; stock_doc_code: string }>,
    onSuccess: () => {
      for (const key of ["issue-pending", "issue-orders", "documents", "stock", "ledger"]) {
        void qc.invalidateQueries({ queryKey: ["inventory", key] });
      }
    },
  });
}

// Gỡ khớp mã XUẤT đã khớp nhầm đơn: hoàn tồn + trả đơn về "Kho đang xử lý", mã
// quay về trạng thái lỗi để khớp tay lại. Đảo bút toán thật nên làm mới cả tồn
// kho + lịch sử xuất, không chỉ bảng chờ.
export function useFlowUnmatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scanId: number) =>
      fetchJson(`/api/inventory/flow-pending/${scanId}/unmatch`, {
        method: "POST",
      }) as Promise<{ ok: boolean; released_stock: boolean; order_id: number }>,
    onSuccess: () => {
      for (const key of ["issue-pending", "issue-orders", "stock", "ledger"]) {
        void qc.invalidateQueries({ queryKey: ["inventory", key] });
      }
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Gỡ khớp thất bại."));
    },
  });
}

function useInvalidatePending() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["inventory", "issue-pending"] });
    void qc.invalidateQueries({ queryKey: ["inventory", "return-pending"] });
  };
}

// Đánh dấu mã chờ khớp là "không đúng" (cron ngừng thử, giữ bản ghi).
export function useFlowMarkInvalid() {
  const invalidate = useInvalidatePending();
  return useMutation({
    mutationFn: (scanId: number) =>
      fetchJson(`/api/inventory/flow-pending/${scanId}/mark-invalid`, { method: "POST" }),
    onSuccess: invalidate,
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Đánh dấu mã sai thất bại."));
    },
  });
}

// Sửa ghi chú của 1 dòng mã chờ khớp (PendingScan) → làm mới danh sách chờ khớp.
export function useFlowUpdatePendingNote() {
  const invalidate = useInvalidatePending();
  return useMutation({
    mutationFn: ({ scanId, note }: { scanId: number; note: string }) =>
      fetchJson(`/api/inventory/flow-pending/${scanId}/note`, {
        method: "PATCH",
        body: JSON.stringify({ note }),
      }) as Promise<{ id: number; note: string }>,
    onSuccess: invalidate,
    // Passthrough nguyên văn lỗi BE — InlineNoteCell (flow-shared.tsx) bắt qua
    // mutateAsync để revert savedRef, không lưu đè khi lỗi.
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Lưu ghi chú thất bại."));
    },
  });
}

// Xoá mã chờ khớp (chỉ khi chưa khớp đơn).
export function useFlowDeletePending() {
  const invalidate = useInvalidatePending();
  return useMutation({
    mutationFn: (scanId: number) =>
      fetchJson(`/api/inventory/flow-pending/${scanId}`, { method: "DELETE" }),
    onSuccess: invalidate,
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Xoá mã thất bại."));
    },
  });
}
