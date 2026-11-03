import { describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { I18nProvider } from "@/i18n";
import type { DailyBreakdownRow, DailyChannelRow } from "../../report-grouping";
import { ChannelDailyTable } from "../ChannelDailyTable";
import { DailyBreakdownTable } from "../DailyBreakdownTable";

function channel(id: number, name: string, revenue: string, cost: string): DailyChannelRow {
  return {
    channel_id: id,
    channel__code: `ch-${id}`,
    channel__name: name,
    revenue,
    cost,
    closed_orders: 1,
    leads: 1,
    ratio_pct: null,
  };
}

describe("ChannelDailyTable", () => {
  // 2 kênh, dữ liệu trải 2 tháng — đủ để kiểm tra kênh → tháng → ngày.
  const ROWS: DailyBreakdownRow[] = [
    {
      date: "2026-01-10",
      revenue: "3000",
      cost: "300",
      closed_orders: 2,
      leads: 2,
      ratio_pct: 10,
      channels: [channel(1, "Kênh A", "1000", "100"), channel(2, "Kênh B", "2000", "200")],
    },
    {
      date: "2026-02-05",
      revenue: "500",
      cost: "50",
      closed_orders: 1,
      leads: 1,
      ratio_pct: 10,
      channels: [channel(1, "Kênh A", "500", "50")],
    },
  ];

  function renderTable(groupByMonth: boolean) {
    return render(
      <I18nProvider>
        <ChannelDailyTable dailyRows={ROWS} groupByMonth={groupByMonth} />
      </I18nProvider>,
    );
  }

  it("chế độ theo ngày: click kênh xổ ra từng ngày (không có dòng tháng)", () => {
    renderTable(false);
    expect(screen.queryByText("2026-01-10")).toBeNull();

    fireEvent.click(screen.getByText("Kênh A"));
    expect(screen.getByText("2026-01-10")).toBeTruthy();
    expect(screen.getByText("2026-02-05")).toBeTruthy();
    expect(screen.queryByText("01/2026")).toBeNull();
  });

  it("bỏ ngày kênh không phát sinh và xếp ngày gần nhất lên đầu", () => {
    render(
      <I18nProvider>
        <ChannelDailyTable
          dailyRows={[
            ...ROWS,
            // Ngày kênh A không tiêu đồng nào, không có doanh thu → không liệt kê.
            {
              date: "2026-02-06",
              revenue: "0",
              cost: "0",
              closed_orders: 0,
              leads: 0,
              ratio_pct: null,
              channels: [channel(1, "Kênh A", "0", "0")],
            },
          ]}
          groupByMonth={false}
        />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByText("Kênh A"));
    expect(screen.queryByText("2026-02-06")).toBeNull();
    const dates = screen
      .getAllByRole("row")
      .map((row) => row.textContent ?? "")
      .filter((text) => text.includes("2026-"));
    expect(dates[0]).toContain("2026-02-05");
    expect(dates[1]).toContain("2026-01-10");
  });

  it("dòng Tổng nằm ngay đầu bảng", () => {
    renderTable(false);
    const bodyRows = screen.getAllByRole("row").slice(1);
    expect(within(bodyRows[0]).getByText("Tổng")).toBeTruthy();
  });

  it("chế độ gộp tháng: kênh → tháng → ngày, expand tháng chỉ áp cho kênh đó", () => {
    renderTable(true);
    fireEvent.click(screen.getByText("Kênh A"));
    expect(screen.getByText("01/2026")).toBeTruthy();
    expect(screen.getByText("02/2026")).toBeTruthy();
    expect(screen.queryByText("2026-01-10")).toBeNull();

    fireEvent.click(screen.getByText("01/2026"));
    expect(screen.getAllByText("2026-01-10")).toHaveLength(1);
    // Tháng 02 của kênh A vẫn đóng.
    expect(screen.queryByText("2026-02-05")).toBeNull();

    // Mở kênh B: dòng tháng 01/2026 của B xuất hiện nhưng KHÔNG tự xổ ngày
    // (key expand phải namespaced theo kênh, không dùng chung "2026-01").
    fireEvent.click(screen.getByText("Kênh B"));
    expect(screen.getAllByText("01/2026")).toHaveLength(2);
    expect(screen.getAllByText("2026-01-10")).toHaveLength(1);
  });
});

describe("DailyBreakdownTable", () => {
  const ROWS: DailyBreakdownRow[] = [
    {
      date: "2026-01-10",
      revenue: "1000",
      cost: "100",
      closed_orders: 2,
      leads: 2,
      ratio_pct: 10,
      channels: [
        {
          channel_id: 1,
          channel__code: "fb-1",
          channel__name: "Kênh FB 1",
          revenue: "1000",
          cost: "100",
          closed_orders: 2,
          leads: 2,
          ratio_pct: 10,
        },
      ],
    },
    {
      date: "2026-02-05",
      revenue: "2000",
      cost: "400",
      closed_orders: 3,
      leads: 3,
      ratio_pct: 20,
      channels: [],
    },
  ];

  function renderTable(groupByMonth: boolean) {
    return render(
      <I18nProvider>
        <DailyBreakdownTable rows={ROWS} groupByMonth={groupByMonth} />
      </I18nProvider>,
    );
  }

  it("chế độ theo ngày: liệt kê từng ngày, click ngày xổ ra kênh", () => {
    renderTable(false);
    expect(screen.getByText("2026-01-10")).toBeTruthy();
    expect(screen.getByText("2026-02-05")).toBeTruthy();
    expect(screen.queryByText("Kênh FB 1")).toBeNull();

    fireEvent.click(screen.getByText("2026-01-10"));
    expect(screen.getByText("Kênh FB 1")).toBeTruthy();
  });

  it("ngày gần nhất lên đầu, bỏ ngày không phát sinh, dòng Tổng ở đầu bảng", () => {
    render(
      <I18nProvider>
        <DailyBreakdownTable
          rows={[
            ...ROWS,
            {
              date: "2026-02-06",
              revenue: "0",
              cost: "0",
              closed_orders: 0,
              leads: 0,
              ratio_pct: null,
              channels: [],
            },
          ]}
          groupByMonth={false}
        />
      </I18nProvider>,
    );
    expect(screen.queryByText("2026-02-06")).toBeNull();
    const bodyRows = screen.getAllByRole("row").slice(1);
    expect(within(bodyRows[0]).getByText("Tổng")).toBeTruthy();
    expect(within(bodyRows[1]).getByText("2026-02-05")).toBeTruthy();
    expect(within(bodyRows[2]).getByText("2026-01-10")).toBeTruthy();
  });

  it("chế độ gộp tháng: tháng gần nhất lên đầu", () => {
    renderTable(true);
    const monthRows = screen
      .getAllByRole("row")
      .map((row) => row.textContent ?? "")
      .filter((text) => text.includes("/2026"));
    expect(monthRows[0]).toContain("02/2026");
    expect(monthRows[1]).toContain("01/2026");
  });

  it("chế độ gộp tháng: hiện dòng tháng, click tháng → ngày, click ngày → kênh", () => {
    renderTable(true);
    // Chỉ có dòng tháng, chưa có ngày.
    expect(screen.getByText("01/2026")).toBeTruthy();
    expect(screen.getByText("02/2026")).toBeTruthy();
    expect(screen.queryByText("2026-01-10")).toBeNull();

    fireEvent.click(screen.getByText("01/2026"));
    expect(screen.getByText("2026-01-10")).toBeTruthy();
    // Tháng khác không bị xổ theo.
    expect(screen.queryByText("2026-02-05")).toBeNull();
    expect(screen.queryByText("Kênh FB 1")).toBeNull();

    fireEvent.click(screen.getByText("2026-01-10"));
    expect(screen.getByText("Kênh FB 1")).toBeTruthy();
  });

  it("tiêu đề đổi theo chế độ", () => {
    renderTable(true);
    expect(screen.getByText("Doanh thu / chi phí theo tháng")).toBeTruthy();
    cleanup();
    renderTable(false);
    expect(screen.getByText("Doanh thu / chi phí theo ngày")).toBeTruthy();
  });
});
