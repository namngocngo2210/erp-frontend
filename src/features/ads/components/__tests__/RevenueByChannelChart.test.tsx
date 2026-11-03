import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { I18nProvider } from "@/i18n";
import { RevenueByChannelChart } from "../RevenueByChannelChart";
import type { ChannelRevenueRow, TopProductRow } from "../../ads-report-selectors";
import type { DailyBreakdownRow } from "../../report-grouping";

afterEach(cleanup);

const CHANNELS: ChannelRevenueRow[] = [
  {
    channel_id: 1,
    channel__code: "fb-1",
    channel__name: "Kênh A",
    closed_orders: 2,
    revenue: "1000",
    delivered_orders: 1,
    delivered_revenue: "600",
  },
];
const PRODUCTS: TopProductRow[] = [
  {
    product_id: 10,
    product__name: "SP A",
    product__sku: "SKU-A",
    closed_orders: 2,
    quantity: 3,
    revenue: "1000",
    delivered_orders: 1,
    delivered_revenue: "600",
    channels: [
      {
        channel_id: 1,
        channel__code: "fb-1",
        channel__name: "Kênh A",
        closed_orders: 2,
        quantity: 3,
        revenue: "1000",
        delivered_orders: 1,
        delivered_revenue: "600",
      },
    ],
  },
];
const DAILY: DailyBreakdownRow[] = [];

function renderChart(channels: ChannelRevenueRow[]) {
  return render(
    <I18nProvider>
      <RevenueByChannelChart channelRows={channels} topProducts={PRODUCTS} dailyRows={DAILY} />
    </I18nProvider>,
  );
}

describe("RevenueByChannelChart", () => {
  it("renders the channel name in both the donut legend and the detail table", () => {
    renderChart(CHANNELS);
    // Một lần ở legend của donut, một lần trong bảng chi tiết.
    expect(screen.getAllByText("Kênh A")).toHaveLength(2);
    expect(screen.getByText("Xem bảng chi tiết")).toBeInTheDocument();
  });

  it("shows the empty state when there are no channels", () => {
    renderChart([]);
    expect(screen.getByText("Chưa có dữ liệu.")).toBeInTheDocument();
  });

  it("shows delivered orders and delivered revenue on expanded per-SKU rows", () => {
    renderChart(CHANNELS);
    const channelRow = screen.getByText("fb-1").closest("tr");
    expect(channelRow).not.toBeNull();
    fireEvent.click(channelRow!);

    const skuRow = screen.getByText("SKU-A").closest("tr");
    expect(skuRow).not.toBeNull();
    const cells = Array.from(skuRow!.querySelectorAll("td")).map((cell) => cell.textContent);
    // [SKU, đơn chốt, SL, đơn giao TC, doanh thu, chi phí, %, doanh thu giao TC]
    expect(cells[2]).toBe("3");
    expect(cells[3]).toBe("1");
    expect(cells[7]).not.toBe("—");
    expect(cells[7]).toContain("600");
  });

  it("shows channel and grand-total quantity summed from per-SKU rows", () => {
    renderChart(CHANNELS);
    const channelRow = screen.getByText("fb-1").closest("tr");
    const channelCells = Array.from(channelRow!.querySelectorAll("td")).map(
      (cell) => cell.textContent,
    );
    // [kênh, đơn chốt, SL, đơn giao TC, ...]
    expect(channelCells[2]).toBe("3");

    const totalRow = screen.getByText("Tổng").closest("tr");
    const totalCells = Array.from(totalRow!.querySelectorAll("td")).map((cell) => cell.textContent);
    expect(totalCells[2]).toBe("3");
  });
});
