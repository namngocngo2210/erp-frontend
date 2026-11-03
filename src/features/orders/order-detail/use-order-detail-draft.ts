import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import { INVOICE_LOCK_HINT, pickInvoiceLockedFields } from "../invoice-lock";
import type { OrderRow } from "../order-types";
import {
  applyPendingToOrder,
  mergePendingPatch,
  omitKeys,
  type PendingRows,
} from "./order-detail-draft";

// Manual save mode - when true, changes are stored in pending until user clicks Save
const MANUAL_SAVE_MODE = true;

type Options = {
  orderId: number;
  order: OrderRow | null;
  onPatch: (id: number, payload: Partial<OrderRow>, silent?: boolean) => Promise<void>;
  isReadOnly: boolean;
  isInvoiceLockedOrder: boolean;
};

/** Thay đổi chờ lưu của trang chi tiết đơn: patch → pending, Lưu → gọi API một lần. */
export function useOrderDetailDraft({
  orderId,
  order,
  onPatch,
  isReadOnly,
  isInvoiceLockedOrder,
}: Options) {
  // State for tracking pending changes (non-immediate mode)
  const [pendingRows, setPendingRows] = useState<PendingRows>({});

  // Wrapper patch với orderId đã biết — silent=true để không toast mỗi lần
  // In MANUAL_SAVE_MODE, changes go to pending first.
  // useCallback giữ tham chiếu ổn định để các Block con (React.memo) không
  // re-render thừa.
  const patch = useCallback(
    (incoming: Partial<OrderRow>) => {
      if (isReadOnly) return;
      // Chốt chặn thật phía FE cho đơn đã có mã vận đơn: ô nội dung đã render chỉ đọc,
      // nhưng payload còn đến từ luồng khác (vd sửa "Địa chỉ thô" tự fill 6 field) nên
      // phải lọc ở đây — không thì user bấm Lưu mới ăn 403 và mất cả các sửa hợp lệ.
      let payload = incoming;
      if (isInvoiceLockedOrder) {
        const blocked = pickInvoiceLockedFields(incoming);
        if (blocked.length > 0) {
          toast.error(INVOICE_LOCK_HINT);
          payload = omitKeys(incoming, blocked);
          if (Object.keys(payload).length === 0) return;
        }
      }
      if (MANUAL_SAVE_MODE) {
        // Store in pending - will be saved when user clicks Save button.
        setPendingRows((prev) => mergePendingPatch(prev, payload));
      } else {
        onPatch(orderId, payload, true).catch(() => null);
      }
    },
    [isInvoiceLockedOrder, isReadOnly, onPatch, orderId],
  );

  // Save all pending changes - directly call API, bypassing pending queue
  const [isSaving, setIsSaving] = useState(false);
  const savePendingChanges = useCallback(async () => {
    const rows = { ...pendingRows };
    if (Object.keys(rows).length === 0) return;
    setIsSaving(true);
    try {
      await onPatch(orderId, rows as Partial<OrderRow>, false);
      setPendingRows({});
    } catch {
      // onPatch already shows error toast when silent=false
    } finally {
      setIsSaving(false);
    }
  }, [pendingRows, orderId, onPatch]);

  const effectiveOrder = useMemo(
    () => (order ? applyPendingToOrder(order, pendingRows) : null),
    [order, pendingRows],
  );

  return {
    patch,
    pendingCount: Object.keys(pendingRows).length,
    hasUnsavedChanges: Object.keys(pendingRows).length > 0,
    isSaving,
    savePendingChanges,
    effectiveOrder,
  };
}
