import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { TablePagination } from "@/components/ui/table-pagination";
import { usePermission } from "@/hooks/usePermission";
import { getApiErrorMessage } from "@/lib/errors";
import type { FlowLineBrief, FlowPendingScanItem } from "@/lib/api/inventory-flow";

import {
  useFlowDeletePending,
  useFlowMarkInvalid,
  useFlowUnmatch,
  useFlowUpdatePendingNote,
} from "../flow-match-queries";
import { useFlowNoteUpdate, type FlowNoteTarget } from "../flow-note-queries";
import { displayQty } from "../flow-quantity";
import { pendingBadge, pendingRowTimestamp } from "../pending-scan-display";
import { useUpdateReturnNote } from "../return-history-queries";
import { formatDateTimeVi } from "@/lib/format";
import { useConfirm } from "@/hooks/use-confirm";

// PAGE_SIZE / PAGE_SIZE_OPTIONS đã chuyển sang ./flow-constants (Fast Refresh chỉ
// hoạt động khi file chỉ export component).

export function ExportButton({ onClick }: { onClick: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="rounded border border-border px-3 py-1.5 text-sm hover:bg-muted/50 disabled:opacity-50"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await Promise.resolve(onClick());
        } catch (err) {
          toast.error(getApiErrorMessage(err, "Xuất Excel thất bại."));
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Đang xuất…" : "Xuất Excel"}
    </button>
  );
}

// Cell mã hóa đơn: mã ở dòng trên, bên dưới liệt kê SKU × SL của đơn/phiếu.
// Tab Xuất lọc `lines` theo bộ lọc sản phẩm ở mức MOVEMENT nên gõ 1 SKU thì chỉ
// hiện SKU đó; tab Nhập hoàn luôn hiện ĐỦ SKU của phiếu vì bộ lọc sản phẩm ở
// mức PHIẾU (Exists) — không lọc từng dòng. Khác biệt này là chủ đích, không
// phải bug (không còn drill-down bung dòng con ở view "Theo đơn" để đối chiếu).
// `lines` khai báo optional với default [] để chịu được payload cũ trong lúc
// rolling deploy (backend instance cũ chưa có field này).
export function SkuLines({ code, lines = [] }: { code: string | null; lines?: FlowLineBrief[] }) {
  return (
    <div className="min-w-[9rem]">
      <div className="font-medium">{code || "—"}</div>
      {lines.length > 0 && (
        <ul className="mt-0.5 space-y-0.5 text-xs text-muted-foreground">
          {lines.map((l) => (
            <li key={l.product_id}>
              {l.sku ?? "—"} × {displayQty(l.qty, l.gross)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PendingBadge({ item }: { item: FlowPendingScanItem }) {
  const s = pendingBadge(item.status);
  return (
    <span title={item.error || undefined} className={`rounded px-1.5 py-0.5 text-xs ${s.cls}`}>
      {s.text}
    </span>
  );
}

// Cột thời gian của 1 dòng chờ khớp: dòng đã khớp hiển thị THỜI ĐIỂM KHỚP
// (matched_at), tooltip kèm lúc quét; dòng chưa khớp hiển thị lúc quét.
export function PendingTime({ item }: { item: FlowPendingScanItem }) {
  const t = pendingRowTimestamp(item);
  const label = formatDateTimeVi(t.iso);
  if (t.kind === "matched") {
    const scannedAt = formatDateTimeVi(item.created_at);
    return <span title={`Quét lúc ${scannedAt}`}>{label}</span>;
  }
  return <>{label}</>;
}

// Nút thao tác cho 1 dòng mã chờ khớp: Khớp / Mã không đúng / Xóa.
// Mã đã đánh dấu "không đúng" chỉ còn nút Xóa; mã đã khớp không còn thao tác.
export function PendingActions({
  item,
  onMatch,
  onReplacementIssue,
}: {
  item: FlowPendingScanItem;
  onMatch: () => void;
  onReplacementIssue?: () => void;
}) {
  const markInvalid = useFlowMarkInvalid();
  const del = useFlowDeletePending();
  const unmatch = useFlowUnmatch();
  const confirm = useConfirm();
  const busy = markInvalid.isPending || del.isPending;
  const btn =
    "rounded border border-border px-2 py-0.5 text-xs hover:bg-muted/50 disabled:opacity-50";
  if (item.status === "matched") {
    // Khớp nhầm đơn: gỡ khớp ngay tại dòng — BE hoàn tồn + trả đơn về "Kho đang
    // xử lý", mã quay về trạng thái lỗi để khớp tay lại đơn đúng.
    const unmatchButton = item.can_unmatch ? (
      <button
        className="rounded border border-destructive/30 px-2 py-0.5 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
        disabled={unmatch.isPending}
        onClick={async () => {
          const target = item.matched_order_code || "đơn đã khớp";
          const ok = await confirm({
            title: `Gỡ khớp mã ${item.code} khỏi ${target}?`,
            description: "Tồn đã trừ sẽ được hoàn lại.",
            confirmText: "Gỡ khớp",
            destructive: true,
          });
          if (!ok) return;
          unmatch.mutate(item.id, {
            onSuccess: () => toast.success("Đã gỡ khớp — chọn lại đơn đúng cho mã này."),
          });
        }}
      >
        Gỡ khớp
      </button>
    ) : null;
    // Ca cũ: khớp vào đơn đã xuất nên guard chặn ghi sổ, mà cũng chưa có phiếu bù —
    // hàng có thể đã rời kho mà báo cáo không thấy. Cho xử lý ngay tại dòng.
    if (item.needs_replacement_issue && onReplacementIssue) {
      return (
        <div className="flex justify-end gap-1">
          <button
            className="rounded border border-action-warning/30 bg-action-warning/10 px-2 py-0.5 text-xs text-action-warning hover:bg-action-warning/15"
            onClick={onReplacementIssue}
          >
            Chưa có phiếu bù
          </button>
          {unmatchButton}
        </div>
      );
    }
    if (unmatchButton) {
      return <div className="flex justify-end gap-1">{unmatchButton}</div>;
    }
    return <span className="text-muted-foreground">—</span>;
  }

  async function handleMarkInvalid() {
    const ok = await confirm({
      title: `Đánh dấu mã ${item.code} là "không đúng"?`,
      confirmText: "Mã sai",
      destructive: true,
    });
    if (!ok) return;
    markInvalid.mutate(item.id);
  }

  async function handleDelete() {
    if (
      !(await confirm({ title: `Xoá mã ${item.code} khỏi danh sách chờ khớp?`, destructive: true }))
    )
      return;
    del.mutate(item.id);
  }

  return (
    <div className="flex justify-end gap-1">
      {item.status !== "invalid" && (
        <>
          <button className={btn} onClick={onMatch}>
            Khớp
          </button>
          <button className={btn} disabled={busy} onClick={handleMarkInvalid}>
            Mã sai
          </button>
        </>
      )}
      <button className={btn} disabled={busy} onClick={handleDelete}>
        Xóa
      </button>
    </div>
  );
}

// Ô ghi chú luôn hiển thị dạng input, TỰ LƯU: debounce khi gõ + lưu ngay khi blur.
// stopPropagation để không bung/gập phần chi tiết SKU của dòng khi thao tác trong ô.
// Trình bày thuần — nguồn dữ liệu (phiếu trả / mã chờ khớp) do wrapper truyền onSave.
const NOTE_SAVE_DEBOUNCE_MS = 700;

export function InlineNoteCell({
  note,
  onSave,
  placeholder = "Ghi chú…",
}: {
  note: string;
  /** Trả về Promise của mutation (mutateAsync) — reject khi lưu lỗi để commit() revert savedRef. */
  onSave: (next: string) => Promise<unknown>;
  placeholder?: string;
}) {
  const [value, setValue] = useState(note);
  const [focused, setFocused] = useState(false);
  // Giá trị đã lưu ở server (để không lưu lại khi không đổi).
  const savedRef = useRef(note);
  // Giá trị note ở lần render trước — chỉ đồng bộ khi server ĐỔI thực sự, không
  // phải khi blur (blur đổi `focused` khiến effect chạy lại lúc `note` còn cũ →
  // sẽ nháy ngược mất chữ vừa gõ nếu đồng bộ vô điều kiện).
  const prevNoteRef = useRef(note);
  const onSaveRef = useRef(onSave);
  useEffect(() => {
    // Latest-ref qua effect (ghi ref trong thân render làm React Compiler bail out).
    // Chỉ đọc trong commit() lúc debounce/blur — không đọc trong render.
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    if (note === prevNoteRef.current) return;
    prevNoteRef.current = note;
    savedRef.current = note;
    if (!focused) setValue(note);
  }, [note, focused]);

  const commit = useCallback((next: string) => {
    const trimmed = next.trim();
    if (trimmed === savedRef.current) return;
    const previous = savedRef.current;
    // Lạc quan: coi như đã lưu để không gửi lặp PATCH khi gõ tiếp lúc đang chờ
    // response. Nếu lỗi (toast nguyên văn đã hiện ở tầng mutation), trả lại giá
    // trị cũ để lần blur/gõ tiếp theo tự thử lưu lại — không nuốt lỗi im lặng.
    savedRef.current = trimmed;
    void onSaveRef.current(trimmed).catch(() => {
      if (savedRef.current === trimmed) savedRef.current = previous;
    });
  }, []);

  // Tự lưu sau khi ngừng gõ (chỉ khi đang focus để tránh lưu thừa lúc refetch).
  useEffect(() => {
    if (!focused) return;
    const t = setTimeout(() => commit(value), NOTE_SAVE_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [value, focused, commit]);

  return (
    <Input
      value={value}
      placeholder={placeholder}
      className="h-7 min-w-[10rem] text-xs"
      onClick={(e) => e.stopPropagation()}
      onFocus={() => setFocused(true)}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        setFocused(false);
        commit(value);
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}

// Ghi chú của phiếu trả (dòng đã khớp / dòng lịch sử phiếu trả).
export function ReturnNoteCell({ returnId, note }: { returnId: number; note: string }) {
  const update = useUpdateReturnNote();
  return (
    <InlineNoteCell note={note} onSave={(next) => update.mutateAsync({ returnId, note: next })} />
  );
}

/**
 * Ghi chú của một dòng bất kỳ trên trang (dòng đơn xuất, phiếu kho, dòng chờ
 * hàng hoàn về). Thiếu quyền `stock:edit` thì hiện chữ thường thay vì ô nhập —
 * gõ xong mới ăn 403 là mất chữ người dùng vừa viết.
 *
 * `targetId` null (dữ liệu cũ chưa có id) → coi như không sửa được.
 */
export function FlowNoteCell({
  targetType,
  targetId,
  note,
}: {
  targetType: FlowNoteTarget;
  targetId: number | null | undefined;
  note: string;
}) {
  const perm = usePermission();
  const update = useFlowNoteUpdate();
  if (!perm("stock:edit") || targetId == null) {
    return <span className="text-muted-foreground">{note || "—"}</span>;
  }
  return (
    <InlineNoteCell
      note={note}
      onSave={(next) => update.mutateAsync({ targetType, targetId, note: next })}
    />
  );
}

// Ghi chú gắn thẳng vào dòng mã CHỜ KHỚP (chưa có phiếu/đơn) — lưu trên PendingScan.
export function PendingNoteCell({ scanId, note }: { scanId: number; note: string }) {
  const update = useFlowUpdatePendingNote();
  return (
    <InlineNoteCell note={note} onSave={(next) => update.mutateAsync({ scanId, note: next })} />
  );
}

// Alias mỏng theo quy ước offset/onChange sẵn có của các tab kho — phần render
// đã gom về TablePagination dùng chung.
export function Pager({
  offset,
  total,
  pageSize,
  onChange,
}: {
  offset: number;
  total: number;
  pageSize: number;
  onChange: (v: number) => void;
}) {
  return (
    <TablePagination
      className="border-t border-border px-3 py-2"
      total={total}
      pageSize={pageSize}
      offset={offset}
      onOffsetChange={onChange}
    />
  );
}
