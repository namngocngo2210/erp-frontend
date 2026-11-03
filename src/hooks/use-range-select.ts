import { useCallback, useRef } from "react";

type IdRow = { id: number };
type Setter = (updater: (prev: number[]) => number[]) => void;

export function useRangeSelect<T extends IdRow>(
  rows: T[],
  selectedIds: number[],
  setSelectedIds: Setter,
) {
  const lastIdRef = useRef<number | null>(null);

  return useCallback(
    (id: number, shiftKey: boolean) => {
      const lastId = lastIdRef.current;
      if (shiftKey && lastId !== null && lastId !== id) {
        const ids = rows.map((row) => row.id);
        const a = ids.indexOf(lastId);
        const b = ids.indexOf(id);
        if (a !== -1 && b !== -1) {
          const [lo, hi] = a < b ? [a, b] : [b, a];
          const range = ids.slice(lo, hi + 1);
          const shouldSelect = !selectedIds.includes(id);
          setSelectedIds((prev) => {
            const set = new Set(prev);
            range.forEach((rid) => (shouldSelect ? set.add(rid) : set.delete(rid)));
            return Array.from(set);
          });
          lastIdRef.current = id;
          return;
        }
      }
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
      );
      lastIdRef.current = id;
    },
    [rows, selectedIds, setSelectedIds],
  );
}
