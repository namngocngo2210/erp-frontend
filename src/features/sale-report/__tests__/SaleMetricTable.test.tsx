import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

import { I18nProvider } from "@/i18n";
import { SaleMetricTable } from "../components/SaleMetricTable";
import type { SaleStaffDailyRow } from "../queries";
import { buildSaleStaffRows } from "../sale-report-selectors";

afterEach(cleanup);

const ROWS: SaleStaffDailyRow[] = [
  {
    date: "2026-03-01",
    staff_id: 1,
    staff__username: "sale-a",
    staff__display_name: "Sale A",
    data_count: 20,
    orders: 8,
    total_revenue: "2000",
    closed_revenue: "1000",
    confirmed_revenue: "1600",
    lead_time_seconds: 8 * 3600 + 8 * 60,
    lead_time_orders: 4,
    queue_wait_seconds: 2 * 3600,
  },
];

function renderTable(rows = buildSaleStaffRows(ROWS, "Không xác định")) {
  return render(
    <I18nProvider>
      <SaleMetricTable rows={rows} firstColumnHeader="Sale" />
    </I18nProvider>,
  );
}

describe("SaleMetricTable", () => {
  it("hiển thị các cột đúng thứ tự nghiệp vụ", () => {
    renderTable();
    expect(screen.getAllByRole("columnheader").map((th) => th.textContent)).toEqual([
      "Sale",
      "Doanh thu tổng",
      "Doanh thu xác nhận đơn",
      "Doanh thu chốt đơn",
      "Tỉ lệ chốt đơn",
      "Số data nhận",
      "Số đơn hàng",
      "AOV",
      "Thời gian chờ chia data",
      "Lead time xử lý data",
    ]);
  });

  it("hiển thị 3 mốc doanh thu tách rời nhau và các chỉ số dẫn xuất", () => {
    renderTable();
    const row = screen.getByText("Sale A").closest("tr") as HTMLTableRowElement;
    expect(
      within(row)
        .getAllByRole("cell")
        .map((td) => td.textContent),
      // chờ chia: 7.200s / 4 đơn = 1.800s = 30p; lead time: 29.280s / 4 = 7.320s = 2h 2p
    ).toEqual(["Sale A", "2.000", "1.600", "1.000", "40.0%", "20", "8", "325", "30p", "2h 2p"]);
  });

  it("hiện dòng Tổng ở chân bảng", () => {
    renderTable();
    expect(screen.getByText("Tổng")).toBeInTheDocument();
  });

  it("hiện thông báo rỗng khi không có nhân viên nào", () => {
    renderTable([]);
    expect(screen.getByText("Chưa có dữ liệu.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
