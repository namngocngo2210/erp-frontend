import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { I18nProvider } from "@/i18n";
import type { SaleStaffReportPayload } from "@/features/sale-report/queries";

afterEach(cleanup);

// Mock hook query để kiểm soát payload mà không cần dựng network/QueryClient.
const mockUseSaleStaffReport = vi.fn();
const mockUseSaleResaleReport = vi.fn();
vi.mock("@/features/sale-report/queries", () => ({
  useSaleStaffReport: (...args: unknown[]) => mockUseSaleStaffReport(...args),
  useSaleResaleReport: (...args: unknown[]) => mockUseSaleResaleReport(...args),
}));

import { DashboardPage } from "../DashboardPage";

const PAYLOAD: SaleStaffReportPayload = {
  by_staff_daily: [
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
      lead_time_seconds: 7200,
      lead_time_orders: 2,
      queue_wait_seconds: 1800,
    },
  ],
};

function renderPage() {
  mockUseSaleStaffReport.mockClear();
  mockUseSaleStaffReport.mockReturnValue({
    isLoading: false,
    isError: false,
    data: PAYLOAD,
    error: null,
  });
  mockUseSaleResaleReport.mockClear();
  mockUseSaleResaleReport.mockReturnValue({
    isLoading: false,
    isError: false,
    data: {
      kpis: {
        total_revenue: "0",
        total_orders: 0,
        delivered_revenue: "0",
        delivered_orders: 0,
        awaiting_revenue: "0",
        awaiting_orders: 0,
        returned_revenue: "0",
        returned_orders: 0,
        return_risk_revenue: "0",
        return_risk_orders: 0,
      },
      by_staff: [],
    },
    error: null,
  });
  return render(
    <I18nProvider>
      <DashboardPage
        summary={null}
        loading={false}
        filters={{ dateFrom: "2026-03-01", dateTo: "2026-03-31" }}
        onApplyFilters={vi.fn()}
      />
    </I18nProvider>,
  );
}

describe("DashboardPage — tab", () => {
  it("hiện đủ 4 tab, mặc định mở Tổng quan", () => {
    renderPage();
    for (const label of [
      "Tổng quan",
      "Resale",
      "Báo cáo theo sale",
      "Báo cáo chi tiết theo sale",
    ]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("tab theo sale hiện bảng chỉ số của nhân viên", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Báo cáo theo sale" }));

    expect(screen.getByText("Sale A")).toBeInTheDocument();
    expect(screen.getByText("Doanh thu xác nhận đơn")).toBeInTheDocument();
    expect(screen.getByText("Số data nhận")).toBeInTheDocument();
  });

  it("chỉ gọi API báo cáo theo sale khi tab đó được mở", () => {
    renderPage();
    // Tabs chỉ mount panel đang mở -> ở tab Tổng quan không tốn request nào.
    expect(mockUseSaleStaffReport).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Báo cáo theo sale" }));
    expect(mockUseSaleStaffReport).toHaveBeenCalledWith({
      dateFrom: "2026-03-01",
      dateTo: "2026-03-31",
    });
  });

  it("chỉ gọi API resale khi mở tab Resale", () => {
    renderPage();
    expect(mockUseSaleResaleReport).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Resale" }));
    expect(mockUseSaleResaleReport).toHaveBeenCalledWith({
      dateFrom: "2026-03-01",
      dateTo: "2026-03-31",
    });
  });

  it("tab chi tiết ẩn bộ lọc ngày chung và hiện ô chọn tháng riêng", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Báo cáo chi tiết theo sale" }));

    expect(screen.getByLabelText("Tháng")).toBeInTheDocument();
  });
});
