import { useState, type ReactNode } from "react";

// Form xác nhận HÀNG GỬI BÙ (đổi lỗi 2 chiều) → sinh Phiếu Xuất kho.
// Thuần trình bày, dùng chung 2 đường vào: khớp tay ngay lúc quét (PendingMatchPanel) và
// xử lý tay ca cũ đã khớp từ trước (PendingReplacementPanel). SL sửa/xoá được vì hàng gửi
// bù có thể "gửi ngoài, không vào điện" nên lệch với dòng hàng của đơn.

export type ReplacementLine = { product_id: number; sku: string; quantity: number };

export function ReplacementIssueForm({
  title,
  initialLines,
  busy,
  error,
  confirmLabel,
  declineLabel,
  onConfirm,
  onDecline,
  onCancel,
}: {
  title: ReactNode;
  initialLines: ReplacementLine[];
  busy: boolean;
  error: string | null;
  confirmLabel: string;
  declineLabel?: string;
  onConfirm: (lines: ReplacementLine[], note: string) => void;
  onDecline?: () => void;
  onCancel: () => void;
}) {
  const [lines, setLines] = useState<ReplacementLine[]>(() => initialLines.map((l) => ({ ...l })));
  const [note, setNote] = useState("");

  return (
    <div className="flex flex-col gap-2 py-1">
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-action-warning">
        Chỉ xác nhận khi kho đã gửi <b>thêm</b> một kiện nữa. Nếu chỉ là quét trùng cùng một kiện
        thì đừng tạo phiếu — sẽ trừ tồn oan.
      </div>
      <div className="flex flex-col gap-1">
        {lines.map((l, i) => (
          <div key={l.product_id} className="flex items-center gap-2 text-xs">
            <span className="w-24 font-medium">{l.sku}</span>
            <label className="text-muted-foreground" htmlFor={`repl-qty-${l.product_id}`}>
              SL {l.sku}
            </label>
            <input
              id={`repl-qty-${l.product_id}`}
              type="number"
              min={0}
              value={l.quantity}
              onChange={(e) =>
                setLines((prev) =>
                  prev.map((row, idx) =>
                    idx === i ? { ...row, quantity: Number(e.target.value) } : row,
                  ),
                )
              }
              className="h-7 w-20 rounded border border-input bg-background px-2"
            />
            <button
              className="rounded border border-border px-2 py-0.5 hover:bg-muted/50"
              onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
            >
              Xoá
            </button>
          </div>
        ))}
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Ghi chú (tuỳ chọn)"
        className="h-8 w-96 rounded border border-input bg-background px-2 text-sm"
      />
      {error && <div className="text-xs text-action-danger">{error}</div>}
      <div className="flex items-center gap-2">
        {onDecline && (
          <button
            className="rounded border border-border px-2 py-1 text-xs hover:bg-muted/50"
            disabled={busy}
            onClick={onDecline}
          >
            {declineLabel}
          </button>
        )}
        <button
          className="rounded bg-sky-600 px-2 py-1 text-xs text-white hover:bg-sky-700 disabled:opacity-50"
          disabled={busy || lines.every((l) => l.quantity <= 0)}
          onClick={() =>
            onConfirm(
              lines.filter((l) => l.quantity > 0),
              note,
            )
          }
        >
          {confirmLabel}
        </button>
        <button
          className="rounded border border-border px-2 py-1 text-xs hover:bg-muted/50"
          onClick={onCancel}
        >
          Quay lại
        </button>
      </div>
    </div>
  );
}
