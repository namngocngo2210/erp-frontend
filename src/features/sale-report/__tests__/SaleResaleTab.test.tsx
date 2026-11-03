import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "@/i18n";
import { SaleResaleTab } from "../components/SaleResaleTab";
import type { SaleResaleReportPayload } from "../queries";

afterEach(cleanup);

const useSaleResaleReport = vi.hoisted(() => vi.fn());
vi.mock("../queries", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../queries")>()),
  useSaleResaleReport: (...args: unknown[]) => useSaleResaleReport(...args),
}));

function mockQuery(overrides: Record<string, unknown>) {
  useSaleResaleReport.mockClear();
  useSaleResaleReport.mockReturnValue({
    isLoading: false,
    isError: false,
    error: null,
    data: undefined,
    ...overrides,
  });
}

function renderTab(props: { dateFrom?: string; dateTo?: string } = {}) {
  return render(
    <I18nProvider>
      <SaleResaleTab {...props} />
    </I18nProvider>,
  );
}

const PAYLOAD: SaleResaleReportPayload = {
  kpis: {
    total_revenue: "100000",
    total_orders: 10,
    delivered_revenue: "60000",
    delivered_orders: 6,
    awaiting_revenue: "20000",
    awaiting_orders: 2,
    returned_revenue: "15000",
    returned_orders: 1,
    return_risk_revenue: "5000",
    return_risk_orders: 1,
  },
  by_staff: [
    {
      staff_id: 1,
      staff__username: "sale1",
      staff__display_name: "Sale Một",
      total_revenue: "100000",
      total_orders: 10,
      delivered_revenue: "60000",
      delivered_orders: 6,
      awaiting_revenue: "20000",
      awaiting_orders: 2,
      returned_revenue: "15000",
      returned_orders: 1,
      return_risk_revenue: "5000",
      return_risk_orders: 1,
    },
  ],
};

describe("SaleResaleTab", () => {
  it("renders the five KPI tiles", () => {
    mockQuery({ data: PAYLOAD });
    renderTab();

    for (const label of ["Tổng doanh thu", "Giao thành công", "Chờ giao", "Hoàn", "Rủi ro hoàn"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("renders a staff row with its delivered revenue and percent", () => {
    mockQuery({ data: PAYLOAD });
    renderTab();

    const staffCell = screen.getByText("Sale Một");
    const row = staffCell.closest("tr");
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText("60.0%")).toBeInTheDocument();
  });

  it("shows an empty state instead of a table when there is no data", () => {
    mockQuery({ data: { kpis: PAYLOAD.kpis, by_staff: [] } });
    renderTab();

    expect(screen.getByText("Chưa có dữ liệu.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("surfaces the error message", () => {
    mockQuery({ isError: true, error: new Error("Sập rồi") });
    renderTab();

    expect(screen.getByText("Sập rồi")).toBeInTheDocument();
  });

  it("passes the page date filter through to the query", () => {
    mockQuery({ data: PAYLOAD });
    renderTab({ dateFrom: "2026-08-01", dateTo: "2026-08-25" });

    expect(useSaleResaleReport).toHaveBeenCalledWith({
      dateFrom: "2026-08-01",
      dateTo: "2026-08-25",
    });
  });
});
