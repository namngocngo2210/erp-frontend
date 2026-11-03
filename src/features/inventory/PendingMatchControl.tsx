import { useEffect, useState } from "react";
import { toast } from "sonner";

import type { FlowOrderLookupItem } from "@/lib/api/inventory-flow";

import { useFlowManualMatch, useFlowOrderLookup } from "./flow-match-queries";
import { ReplacementIssueForm, type ReplacementLine } from "./ReplacementIssueForm";

// Panel khớp mã vận đơn chờ khớp: nhập mã hóa đơn → chọn đơn để khớp.
// Render dạng hàng full-width dưới dòng chờ khớp (tránh lệch/che do overflow của bảng).
//
// Đơn ĐÃ xuất kho: guard `already_dispatched` chặn trừ tồn lần 2 (đúng), nên nếu đây là
// hàng gửi bù của đơn đổi lỗi 2 chiều thì cái thay thế phải trừ tồn bằng Phiếu Xuất kho
// riêng. Hỏi ngay tại đây thay vì để nhân viên nhớ sang màn Phiếu kho — đã có ca quên và
// làm báo cáo thiếu 1 (xem docs/superpowers/specs/2026-07-24-replacement-issue-…-design.md).
//
// Bước hỏi đó CHỈ dành cho mã quét XUẤT (spec §2/§7 giới hạn ở kind=dispatch). Ở tab Nhập
// hoàn, đơn hoàn gần như luôn "đã xuất kho trước đó" nên câu hỏi sẽ bật ở hầu hết mọi lần
// khớp, trong khi chiều thu hàng về không bao giờ sinh phiếu xuất (BE luôn trả
// `order_was_not_dispatched`) — hỏi ở đó chỉ làm nhân viên hoang mang, nên bỏ hẳn.

const SKIP_MESSAGES: Record<string, string> = {
  order_was_not_dispatched:
    "Đơn này chưa từng xuất kho — đã xuất kho bình thường, KHÔNG tạo phiếu bù (tránh trừ tồn 2 lần).",
  already_created: "Mã này đã sinh phiếu xuất kho trước đó — không tạo thêm.",
  invalid_lines: "Dòng hàng gửi bù không hợp lệ — không tạo phiếu.",
};

export function PendingMatchPanel({
  scanId,
  kind,
  onDone,
}: {
  scanId: number;
  /** Loại mã đang khớp — quyết định có hỏi "hàng gửi bù?" hay không. */
  kind: "dispatch" | "return";
  onDone: () => void;
}) {
  const asksReplacement = kind === "dispatch";
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Đơn đã xuất đang chờ người dùng trả lời "có phải hàng gửi bù không".
  const [confirming, setConfirming] = useState<FlowOrderLookupItem | null>(null);
  const [lines, setLines] = useState<ReplacementLine[]>([]);

  const lookup = useFlowOrderLookup(debounced, true);
  const match = useFlowManualMatch();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  function doMatch(orderId: number, replacement?: { lines: ReplacementLine[]; note: string }) {
    setError(null);
    match.mutate(
      {
        scanId,
        orderId,
        replacement: replacement
          ? {
              lines: replacement.lines.map((l) => ({
                product_id: l.product_id,
                quantity: l.quantity,
              })),
              note: replacement.note,
            }
          : undefined,
      },
      {
        onSuccess: (res) => {
          if (res.replacement_skipped) {
            setError(SKIP_MESSAGES[res.replacement_skipped] ?? res.replacement_skipped);
            return; // giữ panel mở: người dùng phải đọc được lý do
          }
          if (res.stock_doc_code) {
            toast.success(`Đã tạo phiếu xuất kho ${res.stock_doc_code} — chờ duyệt.`);
          }
          onDone();
        },
        onError: (e) => setError(e instanceof Error ? e.message : "Khớp thất bại."),
      },
    );
  }

  function pick(order: FlowOrderLookupItem) {
    if (!asksReplacement || !order.already_dispatched) {
      doMatch(order.id);
      return;
    }
    setConfirming(order);
    setLines(order.items.map((it) => ({ ...it })));
  }

  const items = lookup.data?.items ?? [];

  if (confirming) {
    const orderLabel = confirming.invoice_code || confirming.order_code || `#${confirming.id}`;
    return (
      <ReplacementIssueForm
        title={
          <>
            Đơn {orderLabel} đã xuất kho trước đó. Đây có phải <b>hàng gửi bù</b> (đổi lỗi 2 chiều)
            không?
          </>
        }
        initialLines={lines}
        busy={match.isPending}
        error={error}
        declineLabel="Không — chỉ khớp"
        confirmLabel="Có — tạo phiếu xuất kho"
        onDecline={() => doMatch(confirming.id)}
        onConfirm={(picked, note) => doMatch(confirming.id, { lines: picked, note })}
        onCancel={() => setConfirming(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2 py-1">
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nhập mã hóa đơn để tìm đơn…"
          className="h-8 w-64 rounded border border-input bg-background px-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-ring/50"
        />
        <button
          className="rounded border border-border px-2 py-1 text-xs hover:bg-muted/50"
          onClick={onDone}
        >
          Hủy
        </button>
        {match.isPending && <span className="text-xs text-muted-foreground">Đang khớp…</span>}
      </div>
      {error && <div className="text-xs text-action-danger">{error}</div>}
      <div className="max-h-56 overflow-auto rounded-md border border-border">
        {debounced.trim().length < 2 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            Nhập ≥ 2 ký tự để tìm đơn theo mã hóa đơn.
          </div>
        ) : lookup.isLoading ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">Đang tìm…</div>
        ) : items.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">Không tìm thấy đơn.</div>
        ) : (
          items.map((o) => (
            <button
              key={o.id}
              disabled={match.isPending}
              onClick={() => pick(o)}
              className="flex w-full items-center gap-2 border-t border-border/60 px-3 py-1.5 text-left text-xs first:border-t-0 hover:bg-muted/60 disabled:opacity-50"
            >
              <span className="font-medium">{o.invoice_code || o.order_code || `#${o.id}`}</span>
              {asksReplacement && o.already_dispatched ? (
                <span className="rounded bg-action-warning/10 px-1 py-0.5 text-xs text-action-warning">
                  đã xuất kho
                </span>
              ) : null}
              {o.kiotviet_channel ? (
                <span className="rounded bg-sky-100 px-1 py-0.5 text-xs text-sky-700">
                  {o.kiotviet_channel}
                </span>
              ) : null}
              {o.name ? <span className="text-muted-foreground">· {o.name}</span> : null}
              {o.shipping_code ? (
                <span className="text-muted-foreground">· {o.shipping_code}</span>
              ) : null}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
