import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { I18nProvider } from "@/i18n";
import { buildDigitalProductRows, buildDigitalRows } from "../../digital-report-selectors";
import type { DailyBreakdownRow } from "../../report-grouping";
import { DigitalMetricTable } from "../DigitalMetricTable";

afterEach(cleanup);

const ROWS: DailyBreakdownRow[] = [
  {
    date: "2026-03-01",
    revenue: "0",
    cost: "0",
    closed_orders: 0,
    leads: 0,
    ratio_pct: null,
    channels: [
      {
        channel_id: 1,
        channel__code: "fb-1",
        channel__name: "Kênh A",
        revenue: "4000",
        cost: "800",
        closed_orders: 5,
        leads: 20,
        ratio_pct: 20,
      },
    ],
  },
];

function renderTable(rows = buildDigitalRows(ROWS)) {
  return render(
    <I18nProvider>
      <DigitalMetricTable rows={rows} firstColumnHeader="Digital" />
    </I18nProvider>,
  );
}

describe("DigitalMetricTable", () => {
  it("hiển thị các cột đúng thứ tự nghiệp vụ", () => {
    renderTable();
    const headers = screen.getAllByRole("columnheader").map((th) => th.textContent);
    expect(headers).toEqual([
      "Digital",
      "Doanh thu",
      "Chi phí",
      "ME/RE",
      "Số data",
      "CPL",
      "Số đơn hàng",
      "AOV",
      "Tỉ lệ chốt",
    ]);
  });

  it("hiển thị tên và mã kênh cùng các chỉ số đã tính", () => {
    renderTable();
    const row = screen.getByText("Kênh A").closest("tr") as HTMLTableRowElement;
    const cells = within(row)
      .getAllByRole("cell")
      .map((td) => td.textContent);
    expect(cells[0]).toContain("fb-1");
    expect(cells).toEqual([
      expect.stringContaining("Kênh A"),
      "4.000",
      "800",
      "20.0%",
      "20",
      "40",
      "5",
      "800",
      "25.0%",
    ]);
  });

  it("hiện dòng Tổng ở ĐẦU bảng, trước mọi dòng dữ liệu", () => {
    renderTable();
    const bodyRows = screen.getAllByRole("row").slice(1); // bỏ hàng tiêu đề
    expect(within(bodyRows[0]).getByText("Tổng")).toBeInTheDocument();
    expect(within(bodyRows[1]).getByText("Kênh A")).toBeInTheDocument();
  });

  it("hiện thông báo rỗng khi không có kênh nào", () => {
    renderTable([]);
    expect(screen.getByText("Chưa có dữ liệu.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it('hiển thị "—" cho CPL/AOV khi mẫu số bằng 0 thay vì số 0 gây hiểu nhầm', () => {
    const rows = buildDigitalRows([
      {
        ...ROWS[0],
        channels: [{ ...ROWS[0].channels[0], revenue: "0", closed_orders: 0, leads: 0 }],
      },
    ]);
    renderTable(rows);
    const row = screen.getByText("Kênh A").closest("tr") as HTMLTableRowElement;
    const cells = within(row)
      .getAllByRole("cell")
      .map((td) => td.textContent);
    expect(cells[3]).toBe("—"); // ME/RE
    expect(cells[5]).toBe("—"); // CPL
    expect(cells[7]).toBe("—"); // AOV
  });
});

describe("DigitalMetricTable — bung theo sản phẩm", () => {
  const PRODUCT_ROWS = [
    {
      date: null,
      channel_id: 1,
      product_id: 10,
      product__sku: "DC30",
      product__name: "Bồn ngâm chân",
      revenue: "3000",
      cost: "500",
      closed_orders: 3,
      leads: 12,
    },
  ];

  function renderExpandable(expansionRows: typeof PRODUCT_ROWS | null = PRODUCT_ROWS) {
    const rows = buildDigitalRows(ROWS);
    function Harness() {
      const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
      return (
        <DigitalMetricTable
          rows={rows}
          firstColumnHeader="Digital"
          expandedKeys={expanded}
          onToggleRow={(key) =>
            setExpanded((prev) => {
              const next = new Set(prev);
              if (!next.delete(key)) next.add(key);
              return next;
            })
          }
          getExpansion={(row) =>
            expansionRows === null
              ? null
              : buildDigitalProductRows(
                  expansionRows,
                  row,
                  { channelKey: row.key },
                  "Chưa gán chiến dịch",
                )
          }
        />
      );
    }
    return render(
      <I18nProvider>
        <Harness />
      </I18nProvider>,
    );
  }

  it("chưa bấm thì không hiện dòng sản phẩm nào", () => {
    renderExpandable();
    expect(screen.queryByText("DC30")).not.toBeInTheDocument();
  });

  it("bấm nút bung thì hiện dòng sản phẩm và rổ chưa gán", () => {
    renderExpandable();

    fireEvent.click(screen.getByRole("button", { name: "Xem theo sản phẩm" }));

    expect(screen.getByText("DC30")).toBeInTheDocument();
    // 800 (dòng cha) − 500 (đã gán) = 300 rơi vào rổ chưa gán.
    const unassigned = screen.getByText("Chưa gán chiến dịch").closest("tr") as HTMLTableRowElement;
    expect(within(unassigned).getAllByRole("cell")[2].textContent).toBe("300");
  });

  it("dòng con dùng đúng số cột của dòng cha", () => {
    renderExpandable();
    fireEvent.click(screen.getByRole("button", { name: "Xem theo sản phẩm" }));

    const child = screen.getByText("DC30").closest("tr") as HTMLTableRowElement;
    expect(within(child).getAllByRole("cell")).toHaveLength(9);
  });

  it("bấm lại thì thu gọn", () => {
    renderExpandable();
    fireEvent.click(screen.getByRole("button", { name: "Xem theo sản phẩm" }));
    fireEvent.click(screen.getByRole("button", { name: "Thu gọn" }));

    expect(screen.queryByText("DC30")).not.toBeInTheDocument();
  });

  it("hiện trạng thái tải khi phần bung chưa có dữ liệu", () => {
    renderExpandable(null);
    fireEvent.click(screen.getByRole("button", { name: "Xem theo sản phẩm" }));

    expect(screen.queryByText("DC30")).not.toBeInTheDocument();
    expect(screen.queryByText("Chưa gán chiến dịch")).not.toBeInTheDocument();
  });

  it("không có nút bung khi trang không truyền handler", () => {
    render(
      <I18nProvider>
        <DigitalMetricTable rows={buildDigitalRows(ROWS)} firstColumnHeader="Digital" />
      </I18nProvider>,
    );
    expect(screen.queryByRole("button", { name: "Xem theo sản phẩm" })).not.toBeInTheDocument();
  });
});
