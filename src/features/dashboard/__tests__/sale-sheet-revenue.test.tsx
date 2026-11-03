import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { I18nProvider, useI18n } from "@/i18n";
import { SaleSheetRevenueSection } from "../components/SaleSheetRevenueSection";
import { buildSaleSheetMatrix, SALE_SHEET_REPORT_KEYS } from "../sale-sheet-revenue";
import type { SaleSheetRevenueRow } from "../types";

function makeRow(overrides: Partial<SaleSheetRevenueRow>): SaleSheetRevenueRow {
  return {
    staff_id: 1,
    staff__username: "sale",
    staff__display_name: null,
    sheet: "sheet1",
    closed_orders: 0,
    closed_revenue: "0",
    returned_orders: 0,
    net_revenue: "0",
    ...overrides,
  };
}

function Harness({ rows }: { rows: SaleSheetRevenueRow[] }) {
  const { t } = useI18n();
  return <SaleSheetRevenueSection t={t} rows={rows} unknownStaffLabel="Không xác định" />;
}

function renderSection(rows: SaleSheetRevenueRow[]) {
  return render(
    <I18nProvider>
      <Harness rows={rows} />
    </I18nProvider>,
  );
}

const ROWS = [
  makeRow({
    staff_id: 1,
    staff__display_name: "Linh",
    sheet: "sheet1",
    closed_orders: 10,
    closed_revenue: "1000000",
    returned_orders: 2,
    net_revenue: "800000",
  }),
  makeRow({
    staff_id: 2,
    staff__display_name: "Hạnh",
    sheet: "sheet3",
    closed_orders: 30,
    closed_revenue: "3000000",
    returned_orders: 5,
    net_revenue: "2500000",
  }),
];

describe("SaleSheetRevenueSection", () => {
  it("mỗi sheet 4 cột + nhóm cột Tổng, cột đầu là tên nhân viên", () => {
    renderSection(ROWS);

    const headerCells = screen.getAllByRole("columnheader");
    const groupCount = SALE_SHEET_REPORT_KEYS.length + 1; // + nhóm "Tổng"
    expect(groupCount).toBe(4);
    // tầng 1: 1 (Nhân viên, rowSpan) + mỗi nhóm 1 ô; tầng 2: mỗi nhóm 4 chỉ số
    expect(headerCells).toHaveLength(1 + groupCount + groupCount * 4);
    expect(headerCells[0]).toHaveTextContent("Nhân viên");
    expect(screen.getAllByText("Landing xác nhận đơn").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Messenger xác nhận đơn").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tư vấn").length).toBeGreaterThan(0);
    // Trục nguồn đơn đã bị thay hẳn.
    expect(screen.queryByText("Hotline")).toBeNull();
    expect(screen.queryByText("Zalo")).toBeNull();
  });

  it("sắp xếp theo tổng doanh thu giảm dần", () => {
    renderSection(ROWS);

    const names = screen.getAllByTestId("sale-sheet-staff").map((el) => el.textContent);
    expect(names).toEqual(["Hạnh", "Linh"]);
  });

  it("hàng Tổng cộng đúng doanh thu, đơn chốt và đơn hoàn", () => {
    renderSection(ROWS);

    const totalRow = screen.getByTestId("sale-sheet-total-row");
    expect(within(totalRow).getByText("4.000.000")).toBeInTheDocument();
    expect(within(totalRow).getByText("3.300.000")).toBeInTheDocument();
    expect(within(totalRow).getAllByText("40").length).toBeGreaterThan(0);
    expect(within(totalRow).getAllByText("7").length).toBeGreaterThan(0);
  });

  it("không có dòng nào -> hiện empty state", () => {
    renderSection([]);

    expect(screen.getByText("Không có dữ liệu để hiển thị")).toBeInTheDocument();
    expect(screen.queryByTestId("sale-sheet-total-row")).toBeNull();
  });

  it("thiếu tên hiển thị -> dùng nhãn Không xác định", () => {
    renderSection([makeRow({ staff_id: null, staff__username: null, closed_orders: 1 })]);

    expect(screen.getByTestId("sale-sheet-staff")).toHaveTextContent("Không xác định");
  });
});

describe("buildSaleSheetMatrix", () => {
  it("trải đủ 3 sheet kể cả sheet không phát sinh trong kỳ", () => {
    const { rows } = buildSaleSheetMatrix([
      makeRow({ sheet: "sheet3", closed_orders: 3, closed_revenue: "300" }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].cells).toHaveLength(3);
    const sheet3Index = SALE_SHEET_REPORT_KEYS.indexOf("sheet3");
    expect(rows[0].cells[sheet3Index]).toEqual({
      closedOrders: 3,
      closedRevenue: 300,
      returnedOrders: 0,
      netRevenue: 0,
    });
    const sheet1Index = SALE_SHEET_REPORT_KEYS.indexOf("sheet1");
    expect(rows[0].cells[sheet1Index]).toEqual({
      closedOrders: 0,
      closedRevenue: 0,
      returnedOrders: 0,
      netRevenue: 0,
    });
  });

  it("ô Tổng của mỗi sale là cộng ngang các sheet", () => {
    const { rows } = buildSaleSheetMatrix([
      makeRow({
        sheet: "sheet1",
        closed_orders: 2,
        closed_revenue: "200",
        returned_orders: 1,
        net_revenue: "100",
      }),
      makeRow({
        sheet: "sheet3",
        closed_orders: 5,
        closed_revenue: "500",
        returned_orders: 4,
        net_revenue: "400",
      }),
    ]);

    expect(rows[0].total).toEqual({
      closedOrders: 7,
      closedRevenue: 700,
      returnedOrders: 5,
      netRevenue: 500,
    });
  });

  it("hàng Tổng là cộng dọc toàn bộ sale", () => {
    const { totals } = buildSaleSheetMatrix([
      makeRow({ staff_id: 1, closed_orders: 2, closed_revenue: "200", net_revenue: "150" }),
      makeRow({ staff_id: 2, closed_orders: 3, closed_revenue: "300", net_revenue: "250" }),
    ]);

    const sheet1Index = SALE_SHEET_REPORT_KEYS.indexOf("sheet1");
    expect(totals.cells[sheet1Index].closedOrders).toBe(5);
    expect(totals.total).toEqual({
      closedOrders: 5,
      closedRevenue: 500,
      returnedOrders: 0,
      netRevenue: 400,
    });
  });

  it("sắp xếp sale theo tổng doanh thu giảm dần", () => {
    const { rows } = buildSaleSheetMatrix([
      makeRow({ staff_id: 1, staff__display_name: "Linh", closed_revenue: "1000" }),
      makeRow({ staff_id: 2, staff__display_name: "Hạnh", closed_revenue: "3000" }),
    ]);

    expect(rows.map((row) => row.staff__display_name)).toEqual(["Hạnh", "Linh"]);
  });

  it("đơn không rơi vào sheet nào vẫn được cộng vào ô Tổng", () => {
    // Backend trả sheet="" cho đơn ngoài 3 tab -> không được âm thầm hụt tổng.
    const { rows, totals } = buildSaleSheetMatrix([
      makeRow({ sheet: "", closed_orders: 4, closed_revenue: "400" }),
    ]);

    expect(rows[0].total.closedRevenue).toBe(400);
    expect(rows[0].cells.every((cell) => cell.closedRevenue === 0)).toBe(true);
    expect(totals.total.closedRevenue).toBe(400);
  });

  it("payload rỗng hoặc undefined -> không có hàng nào", () => {
    expect(buildSaleSheetMatrix([]).rows).toEqual([]);
    expect(buildSaleSheetMatrix(undefined).rows).toEqual([]);
  });
});
