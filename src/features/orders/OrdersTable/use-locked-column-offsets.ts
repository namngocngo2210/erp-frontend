import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { OrderColumnKey } from "@/features/orders/order-types";

// Key đo width của cột checkbox (không nằm trong OrderColumnKey).
export const CHECKBOX_MEASURE_KEY = "__checkbox__";

// Fallback khi chưa đo được (first paint / môi trường không có ResizeObserver).
// Giữ đúng các hằng số của công thức cũ để không đổi hành vi trước khi đo xong.
export const CHECKBOX_FALLBACK_WIDTH = 72;
export const LOCKED_COLUMN_FALLBACK_WIDTH = 120;

/** Cột định danh tự dính khi người dùng chưa ghim cột nào (theo thứ tự ưu tiên hiển thị). */
const IMPLICIT_STICKY_COLUMNS: ReadonlySet<OrderColumnKey> = new Set(["name", "phone"]);

/**
 * Tập cột dính trái thực tế. Người dùng đã ghim cột → giữ nguyên lựa chọn đó.
 * Chưa ghim → tự dính cột định danh (tên/SĐT) đầu tiên đang hiển thị, để cuộn
 * ngang vẫn biết đang ở đơn nào. Không áp ở điện thoại: cột ~200px chiếm quá nửa màn.
 * Chỉ ảnh hưởng hiển thị — không ghi vào cấu hình cột đã lưu.
 */
export function resolveStickyColumns(
  lockedSet: ReadonlySet<OrderColumnKey>,
  orderedColumns: readonly OrderColumnKey[],
  isMobileViewport: boolean,
): ReadonlySet<OrderColumnKey> {
  if (lockedSet.size > 0 || isMobileViewport) return lockedSet;
  const identityColumn = orderedColumns.find((key) => IMPLICIT_STICKY_COLUMNS.has(key));
  return identityColumn ? new Set([identityColumn]) : lockedSet;
}

/**
 * Tính offset `left` cộng dồn cho các cột ghim từ width THẬT đã đo.
 * Cột chưa đo được dùng fallback 120px (khớp công thức cũ) — sẽ tự đúng lại
 * ngay khi ResizeObserver trả về width thật.
 */
export function computeLockedLefts(
  lockedColumns: OrderColumnKey[],
  widths: Record<string, number>,
): Partial<Record<OrderColumnKey, number>> {
  const lefts: Partial<Record<OrderColumnKey, number>> = {};
  let left = widths[CHECKBOX_MEASURE_KEY] ?? CHECKBOX_FALLBACK_WIDTH;
  for (const key of lockedColumns) {
    lefts[key] = left;
    left += widths[key] ?? LOCKED_COLUMN_FALLBACK_WIDTH;
  }
  return lefts;
}

/**
 * Đo width thật của các header cell bị ghim (th checkbox + th cột khóa) bằng
 * ResizeObserver rồi trả về map `left` cộng dồn cho từng cột. Fix lỗi cột ghim
 * đè lên nhau do công thức cũ hardcode mọi cột rộng 120px.
 */
export function useLockedColumnOffsets(lockedColumns: OrderColumnKey[]) {
  const [widths, setWidths] = useState<Record<string, number>>({});
  const observerRef = useRef<ResizeObserver | null>(null);
  const keyByElement = useRef(new Map<Element, string>());
  const refCallbacks = useRef(new Map<string, (el: HTMLTableCellElement | null) => void>());

  const storeWidth = useCallback((key: string, width: number) => {
    // Giữ 1 số lẻ: làm tròn nguyên gây drift cộng dồn ±0.5px giữa các cột ghim.
    const rounded = Math.round(width * 10) / 10;
    if (rounded <= 0) return;
    setWidths((previous) =>
      previous[key] === rounded ? previous : { ...previous, [key]: rounded },
    );
  }, []);

  const getObserver = useCallback(() => {
    if (observerRef.current === null && typeof ResizeObserver !== "undefined") {
      observerRef.current = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const key = keyByElement.current.get(entry.target);
          if (key !== undefined) storeWidth(key, entry.target.getBoundingClientRect().width);
        }
      });
    }
    return observerRef.current;
  }, [storeWidth]);

  /** Callback-ref ổn định theo key — gắn vào th checkbox và các th cột ghim. */
  const registerHeaderCell = useCallback(
    (key: string) => {
      let callback = refCallbacks.current.get(key);
      if (!callback) {
        callback = (el: HTMLTableCellElement | null) => {
          const observer = getObserver();
          for (const [element, elementKey] of keyByElement.current) {
            if (elementKey === key && element !== el) {
              observer?.unobserve(element);
              keyByElement.current.delete(element);
            }
          }
          if (el) {
            keyByElement.current.set(el, key);
            observer?.observe(el);
            // Đo ngay lần đầu — ResizeObserver chỉ fire async sau frame đầu.
            storeWidth(key, el.getBoundingClientRect().width);
          }
        };
        refCallbacks.current.set(key, callback);
      }
      return callback;
    },
    [getObserver, storeWidth],
  );

  useEffect(() => () => observerRef.current?.disconnect(), []);

  const lockedLeftByKey = useMemo(
    () => computeLockedLefts(lockedColumns, widths),
    [lockedColumns, widths],
  );

  return { registerHeaderCell, lockedLeftByKey };
}
