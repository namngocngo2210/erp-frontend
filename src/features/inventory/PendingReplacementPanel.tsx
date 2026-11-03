import { useState } from "react";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/lib/errors";

import { useFlowReplacementIssue } from "./flow-match-queries";
import { ReplacementIssueForm, type ReplacementLine } from "./ReplacementIssueForm";

// Xử lý TAY các ca cũ: mã đã khớp vào đơn đã xuất kho từ trước nên guard chặn ghi sổ,
// và lúc đó hệ thống chưa hỏi "hàng gửi bù?" — hàng đã rời kho mà không có phiếu nào.
// Chỉ hiện với dòng được backend đánh dấu `needs_replacement_issue` (nghi ngờ, không
// phải kết luận): quét trùng cùng một kiện cũng để lại đúng dấu vết đó, nên người dùng
// mới là nơi quyết định.

export function PendingReplacementPanel({
  scanId,
  code,
  orderCode,
  lines,
  onDone,
}: {
  scanId: number;
  code: string;
  orderCode: string;
  lines: ReplacementLine[];
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const create = useFlowReplacementIssue();

  return (
    <ReplacementIssueForm
      title={
        <>
          Mã {code} đã khớp vào đơn {orderCode || "—"} (đã xuất kho trước đó) nhưng{" "}
          <b>chưa có phiếu xuất kho bù</b>. Tạo phiếu cho hàng gửi bù?
        </>
      }
      initialLines={lines}
      busy={create.isPending}
      error={error}
      confirmLabel="Tạo phiếu xuất kho bù"
      onConfirm={(picked, note) => {
        setError(null);
        create.mutate(
          {
            scanId,
            replacement: {
              lines: picked.map(({ product_id, quantity }) => ({ product_id, quantity })),
              note,
            },
          },
          {
            onSuccess: (res) => {
              toast.success(`Đã tạo phiếu xuất kho ${res.stock_doc_code} — chờ duyệt.`);
              onDone();
            },
            onError: (e) => setError(getApiErrorMessage(e, "Tạo phiếu bù thất bại.")),
          },
        );
      }}
      onCancel={onDone}
    />
  );
}
