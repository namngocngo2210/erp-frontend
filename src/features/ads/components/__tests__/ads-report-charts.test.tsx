import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { I18nProvider } from "@/i18n";
import { AdsKpiRow } from "../AdsKpiRow";
import { DailyTrendChart } from "../DailyTrendChart";
import { TopProductsChart } from "../TopProductsChart";
import { RevenueBreakdownCard } from "../RevenueBreakdownCard";
import { ChannelDailyChart } from "../ChannelDailyChart";
import type { AdsKpis, BreakdownRevenueRow } from "../../ads-report-selectors";
import {
  makeDailyBreakdownRow,
  makeDailyChannelRow,
  makeTopProductRow,
} from "../../__tests__/fixtures";

const KPIS: AdsKpis = {
  totalRevenue: 4000,
  totalCost: 700,
  ratioPct: 17.5,
  closedOrders: 7,
  deliveredOrders: 5,
  deliveredRevenue: 3100,
};

describe("AdsKpiRow", () => {
  it("renders all six tile values", () => {
    render(
      <I18nProvider>
        <AdsKpiRow kpis={KPIS} />
      </I18nProvider>,
    );
    expect(screen.getByText("17.5%")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });
});

describe("DailyTrendChart", () => {
  const ROWS = [makeDailyBreakdownRow()];

  it("renders the title and the detail table toggle", () => {
    render(
      <I18nProvider>
        <DailyTrendChart rows={ROWS} groupByMonth={false} />
      </I18nProvider>,
    );
    expect(screen.getByText("Diễn biến doanh thu / chi phí")).toBeInTheDocument();
    expect(screen.getByText("Xem bảng chi tiết")).toBeInTheDocument();
  });

  it("shows the empty state without rows", () => {
    render(
      <I18nProvider>
        <DailyTrendChart rows={[]} groupByMonth={false} />
      </I18nProvider>,
    );
    expect(screen.getByText("Chưa có dữ liệu.")).toBeInTheDocument();
  });
});

describe("TopProductsChart", () => {
  const PRODUCTS = [makeTopProductRow()];

  it("renders the SKU in the detail table", () => {
    render(
      <I18nProvider>
        <TopProductsChart topProducts={PRODUCTS} />
      </I18nProvider>,
    );
    expect(screen.getAllByText("SKU1").length).toBeGreaterThan(0);
    expect(screen.getByText("Xem bảng chi tiết")).toBeInTheDocument();
  });

  it("shows the empty state without products", () => {
    render(
      <I18nProvider>
        <TopProductsChart topProducts={[]} />
      </I18nProvider>,
    );
    expect(screen.getByText("Chưa có dữ liệu.")).toBeInTheDocument();
  });
});

describe("RevenueBreakdownCard", () => {
  const ROWS: BreakdownRevenueRow[] = [
    {
      label: "Hà Nội",
      closed_orders: 2,
      revenue: "150000",
      delivered_orders: 1,
      delivered_revenue: "100000",
    },
    {
      label: "Không rõ",
      closed_orders: 1,
      revenue: "30000",
      delivered_orders: 0,
      delivered_revenue: "0",
    },
  ];

  function renderCard(rows: BreakdownRevenueRow[]) {
    return render(
      <I18nProvider>
        <RevenueBreakdownCard
          title="Đơn đã chốt & doanh thu theo tỉnh/thành"
          nameHeader="Tỉnh/thành"
          rows={rows}
        />
      </I18nProvider>,
    );
  }

  it("renders each label in both the donut legend and the detail table", () => {
    renderCard(ROWS);
    expect(screen.getAllByText("Hà Nội")).toHaveLength(2);
    expect(screen.getAllByText("Không rõ")).toHaveLength(2);
    expect(screen.getByText("Tỉnh/thành")).toBeInTheDocument();
    expect(screen.getByText("Xem bảng chi tiết")).toBeInTheDocument();
  });

  it("shows the empty state when there are no rows", () => {
    renderCard([]);
    expect(screen.getByText("Chưa có dữ liệu.")).toBeInTheDocument();
  });
});

describe("ChannelDailyChart", () => {
  const ROWS = [makeDailyBreakdownRow({ channels: [makeDailyChannelRow()] })];

  it("renders the detail toggle for admin pivot", () => {
    render(
      <I18nProvider>
        <ChannelDailyChart dailyRows={ROWS} groupByMonth={false} />
      </I18nProvider>,
    );
    expect(screen.getByText("Xem bảng chi tiết")).toBeInTheDocument();
  });

  it("shows the empty state without rows", () => {
    render(
      <I18nProvider>
        <ChannelDailyChart dailyRows={[]} groupByMonth={false} />
      </I18nProvider>,
    );
    expect(screen.getByText("Chưa có dữ liệu.")).toBeInTheDocument();
  });
});
