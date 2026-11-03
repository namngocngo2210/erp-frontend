import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

import { I18nProvider, useI18n } from "@/i18n";
import { ClosedRevenueSection } from "../components/ClosedRevenueSection";
import type { SalePerformanceRow } from "../types";

afterEach(cleanup);

function makeRow(overrides: Partial<SalePerformanceRow>): SalePerformanceRow {
  return {
    staff_id: 1,
    staff__username: "sale",
    staff__display_name: null,
    total: 0,
    total_assessed: 0,
    closed: 0,
    not_buying: 0,
    nurture: 0,
    unreached: 0,
    dirty: 0,
    warranty: 0,
    underlying_condition: 0,
    wants_store_visit: 0,
    revenue: "0",
    closed_revenue: "0",
    closed_revenue_orders: 0,
    delivered_count: 0,
    nurture_total_ever: 0,
    nurture_followup_closed: 0,
    ...overrides,
  };
}

// Component nhận `t` từ ngoài (giống các section khác), nên test bọc một
// wrapper nhỏ để lấy `t` thật từ I18nProvider thay vì tự chế hàm dịch.
function Harness({ rows }: { rows: SalePerformanceRow[] }) {
  const { t } = useI18n();
  const totals = rows.reduce(
    (acc, r) => ({
      total: acc.total + r.total,
      closed_revenue_orders: acc.closed_revenue_orders + r.closed_revenue_orders,
      closed_revenue: acc.closed_revenue + Number(r.closed_revenue || 0),
    }),
    { total: 0, closed_revenue_orders: 0, closed_revenue: 0 },
  );
  return (
    <ClosedRevenueSection
      t={t}
      performanceRows={rows}
      performanceTotals={totals}
      unknownStaffLabel="Không xác định"
    />
  );
}

function renderSection(rows: SalePerformanceRow[]) {
  return render(
    <I18nProvider>
      <Harness rows={rows} />
    </I18nProvider>,
  );
}

const ROWS = [
  makeRow({
    staff_id: 1,
    staff__username: "linh",
    staff__display_name: "Linh",
    total: 200,
    closed: 120,
    closed_revenue_orders: 100,
    closed_revenue: "1000000",
  }),
  makeRow({
    staff_id: 2,
    staff__username: "hanh",
    staff__display_name: "Hạnh",
    total: 300,
    closed: 170,
    closed_revenue_orders: 150,
    closed_revenue: "3000000",
  }),
];

describe("ClosedRevenueSection", () => {
  it("sắp xếp theo doanh thu chốt giảm dần", () => {
    renderSection(ROWS);

    const names = screen.getAllByTestId("closed-revenue-staff").map((el) => el.textContent);
    expect(names).toEqual(["Hạnh", "Linh"]);
  });

  it("dòng Tổng cộng đúng data, đơn chốt, doanh thu và % chốt trên tổng", () => {
    renderSection(ROWS);

    const totalRow = screen.getByTestId("closed-revenue-total-row");
    // 500 data, 250 đơn chốt (closed_revenue_orders), 50.0%, 4.000.000 doanh thu
    expect(within(totalRow).getByText("500")).toBeInTheDocument();
    expect(within(totalRow).getByText("250")).toBeInTheDocument();
    expect(within(totalRow).getByText("50.0%")).toBeInTheDocument();
    expect(within(totalRow).getByText("4.000.000")).toBeInTheDocument();
    // 290 = tổng `closed` (120+170) — không được xuất hiện, chứng minh dòng
    // Tổng dùng `closed_revenue_orders` chứ không phải `closed`.
    expect(within(totalRow).queryByText("290")).toBeNull();
  });

  it("không có dòng nào -> hiện empty state", () => {
    renderSection([]);

    expect(screen.getByText("Không có dữ liệu để hiển thị")).toBeInTheDocument();
    expect(screen.queryByTestId("closed-revenue-total-row")).toBeNull();
  });

  it("thiếu tên hiển thị -> dùng nhãn Không xác định", () => {
    renderSection([
      makeRow({ staff_id: null, staff__username: null, total: 10, closed: 5, closed_revenue: "1" }),
    ]);

    expect(screen.getByTestId("closed-revenue-staff")).toHaveTextContent("Không xác định");
  });
});
