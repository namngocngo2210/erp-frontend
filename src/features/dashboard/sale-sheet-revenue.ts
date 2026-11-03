import { SHEET_LABELS, type SheetKey } from "@/features/orders/landing-tabs";

import type { SaleSheetRevenueRow } from "./types";

/**
 * Ba sheet hiển thị ở Nhóm 10, thứ tự CỐ ĐỊNH và luôn đủ cột kể cả kỳ không
 * phát sinh — bảng không nhảy cột khi đổi kỳ. Phải khớp giá trị `sheet` mà
 * backend annotate từ `sheet_rules.sheet_q`; sheet nào lệch thì hàng của
 * backend rơi vào ô không tồn tại và biến mất khỏi cột nhưng vẫn vào ô Tổng.
 */
export const SALE_SHEET_REPORT_KEYS: readonly SheetKey[] = ["sheet1", "sheet2", "sheet3"];

export const SALE_SHEET_REPORT_LABELS: Record<SheetKey, string> = SHEET_LABELS;

export type SaleSheetCell = {
  closedOrders: number;
  closedRevenue: number;
  returnedOrders: number;
  /**
   * Doanh thu giao thành công = tiền của các đơn đã giao xong (status Đã giao).
   * KHÔNG phải `closedRevenue` trừ đơn hoàn — cách đó (đến 2026-09-01) còn tính
   * cả đơn chưa ra khỏi kho / đang đi đường nên phồng gấp nhiều lần số thật.
   */
  netRevenue: number;
};

export type SaleSheetMatrixRow = {
  staffId: number | null;
  staff__display_name: string | null;
  staff__username: string | null;
  /** Ô theo từng sheet, luôn đủ `SALE_SHEET_REPORT_KEYS` phần tử. */
  cells: SaleSheetCell[];
  /** Cộng ngang 3 sheet — nhóm cột "Tổng" ở cuối bảng. */
  total: SaleSheetCell;
};

export type SaleSheetMatrix = {
  rows: SaleSheetMatrixRow[];
  /** Cộng dọc toàn bộ sale; `totals.total` là tổng toàn bảng. */
  totals: Pick<SaleSheetMatrixRow, "cells" | "total">;
};

function emptyCell(): SaleSheetCell {
  return { closedOrders: 0, closedRevenue: 0, returnedOrders: 0, netRevenue: 0 };
}

function addInto(target: SaleSheetCell, source: SaleSheetCell): void {
  target.closedOrders += source.closedOrders;
  target.closedRevenue += source.closedRevenue;
  target.returnedOrders += source.returnedOrders;
  target.netRevenue += source.netRevenue;
}

function toCell(row: SaleSheetRevenueRow): SaleSheetCell {
  return {
    closedOrders: row.closed_orders || 0,
    closedRevenue: Number(row.closed_revenue || 0),
    returnedOrders: row.returned_orders || 0,
    netRevenue: Number(row.net_revenue || 0),
  };
}

/**
 * Dựng ma trận sale × sheet từ các hàng phẳng `(staff, sheet)` của API.
 *
 * Sắp xếp theo tổng doanh thu chốt toàn sheet giảm dần; bằng nhau thì theo tên
 * hiển thị để thứ tự ổn định giữa các lần render.
 */
export function buildSaleSheetMatrix(
  rows: readonly SaleSheetRevenueRow[] | undefined,
): SaleSheetMatrix {
  const sheetIndex = new Map<string, number>(
    SALE_SHEET_REPORT_KEYS.map((sheet, index) => [sheet, index]),
  );
  const byStaff = new Map<string, SaleSheetMatrixRow>();

  for (const row of rows ?? []) {
    const key = String(row.staff_id ?? `unknown:${row.staff__username ?? ""}`);
    let entry = byStaff.get(key);
    if (!entry) {
      entry = {
        staffId: row.staff_id,
        staff__display_name: row.staff__display_name,
        staff__username: row.staff__username,
        cells: SALE_SHEET_REPORT_KEYS.map(() => emptyCell()),
        total: emptyCell(),
      };
      byStaff.set(key, entry);
    }
    const cell = toCell(row);
    // Đơn không rơi vào sheet nào (backend trả "") vẫn được cộng vào ô Tổng để
    // tổng bảng không âm thầm hụt so với API.
    const index = sheetIndex.get(row.sheet ?? "");
    if (index !== undefined) addInto(entry.cells[index], cell);
    addInto(entry.total, cell);
  }

  const result = [...byStaff.values()].sort(
    (a, b) =>
      b.total.closedRevenue - a.total.closedRevenue ||
      (a.staff__display_name || a.staff__username || "").localeCompare(
        b.staff__display_name || b.staff__username || "",
      ),
  );

  const totals: SaleSheetMatrix["totals"] = {
    cells: SALE_SHEET_REPORT_KEYS.map(() => emptyCell()),
    total: emptyCell(),
  };
  for (const row of result) {
    row.cells.forEach((cell, index) => addInto(totals.cells[index], cell));
    addInto(totals.total, row.total);
  }

  return { rows: result, totals };
}
