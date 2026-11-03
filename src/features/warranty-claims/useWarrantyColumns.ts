import { useCallback, useMemo, useState } from "react";

import {
  DEFAULT_WARRANTY_COLUMNS,
  WARRANTY_COLUMN_OPTIONS,
  type WarrantyColumnKey,
} from "@/features/warranty-claims/warranty-claim-columns";
import {
  getStoredColumns,
  getStoredLocked,
  getStoredOrder,
  setStoredColumns,
  setStoredLocked,
  setStoredOrder,
} from "@/features/warranty-claims/warranty-claims-storage";

const ALL_ORDER = WARRANTY_COLUMN_OPTIONS.map((o) => o.key);

export function useWarrantyColumns() {
  const [visibleColumns, setVisible] = useState<WarrantyColumnKey[]>(getStoredColumns);
  const [lockedColumns, setLocked] = useState<WarrantyColumnKey[]>(getStoredLocked);
  const [order, setOrder] = useState<WarrantyColumnKey[]>(getStoredOrder);

  // Full order = stored order first (known keys), then any options not yet in it.
  const fullOrder = useMemo(() => {
    const seen = new Set(order);
    return [...order, ...ALL_ORDER.filter((k) => !seen.has(k))];
  }, [order]);

  const orderedColumns = useMemo(() => {
    const vis = new Set(visibleColumns);
    const locked = lockedColumns.filter((k) => vis.has(k));
    const rest = fullOrder.filter((k) => vis.has(k) && !lockedColumns.includes(k));
    return [...locked, ...rest];
  }, [visibleColumns, lockedColumns, fullOrder]);

  const toggleColumn = useCallback((key: WarrantyColumnKey) => {
    setVisible((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      setStoredColumns(next);
      return next;
    });
    setLocked((prev) => {
      // a hidden column cannot stay locked
      const next = prev.filter((k) => k !== key);
      if (next.length !== prev.length) setStoredLocked(next);
      return next;
    });
  }, []);

  const toggleLock = useCallback((key: WarrantyColumnKey) => {
    setLocked((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      setStoredLocked(next);
      return next;
    });
  }, []);

  /**
   * Ghi đè cả danh sách cột đang hiện (kéo đổi thứ tự, bật/tắt cả nhóm).
   * Cột bị ẩn phải rời khỏi danh sách ghim, nếu không lần bật lại sau đó nó tự
   * dính sticky mà user không hề ghim.
   */
  const setColumns = useCallback(
    (next: WarrantyColumnKey[]) => {
      if (next.length === 0) return;
      const nextOrder = [...next, ...ALL_ORDER.filter((key) => !next.includes(key))];
      const nextLocked = lockedColumns.filter((key) => next.includes(key));
      setStoredColumns(next);
      setStoredOrder(nextOrder);
      setVisible(next);
      setOrder(nextOrder);
      if (nextLocked.length !== lockedColumns.length) {
        setStoredLocked(nextLocked);
        setLocked(nextLocked);
      }
    },
    [lockedColumns],
  );

  const resetColumns = useCallback(() => {
    setStoredColumns(DEFAULT_WARRANTY_COLUMNS);
    setStoredLocked([]);
    setStoredOrder(ALL_ORDER);
    setVisible(DEFAULT_WARRANTY_COLUMNS);
    setLocked([]);
    setOrder(ALL_ORDER);
  }, []);

  return {
    visibleColumns,
    lockedColumns,
    orderedColumns,
    toggleColumn,
    toggleLock,
    setColumns,
    resetColumns,
  };
}
