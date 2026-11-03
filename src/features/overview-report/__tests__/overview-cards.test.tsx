import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { I18nProvider } from "@/i18n";
import { OverviewBreakdownCard } from "../components/OverviewBreakdownCard";
import { OverviewKpiTiles } from "../components/OverviewKpiTiles";
import { ColumnTotalTooltip } from "../components/RevenueTimeseriesCard";
import { ProvinceRevenueCard } from "../components/ProvinceRevenueCard";
import { TopProductsCard } from "../components/TopProductsCard";
import {
  buildProvinceBreakdown,
  buildSaleChannelBreakdown,
  buildTopProducts,
  computeOverviewKpis,
} from "../overview-selectors";
import { formatChangePct } from "../timeseries-selectors";

describe("OverviewBreakdownCard", () => {
  const REVENUE_ROWS = buildSaleChannelBreakdown([
    {
      sale_channel: "off_other",
      revenue: "400000",
      orders: 4,
      delivered_revenue: "300000",
      delivered_orders: 3,
    },
    {
      sale_channel: "shopee",
      revenue: "100000",
      orders: 1,
      delivered_revenue: "0",
      delivered_orders: 0,
    },
  ]);

  const AMOUNT_ROWS = buildSaleChannelBreakdown([
    { sale_channel: "off_other", revenue: "150000", orders: 1 },
    { sale_channel: "shopee", revenue: "50000", orders: 1 },
  ]);

  function renderCard(props: Partial<Parameters<typeof OverviewBreakdownCard>[0]> = {}) {
    return render(
      <I18nProvider>
        <OverviewBreakdownCard
          title="Doanh thu theo kênh bán"
          valueHeader="Doanh thu"
          centerLabel="Doanh thu"
          rows={REVENUE_ROWS}
          variant="revenue"
          {...props}
        />
      </I18nProvider>,
    );
  }

  it("khối doanh thu: có cột giao thành công + dòng Tổng khớp tổng các nguồn", () => {
    renderCard();

    expect(screen.getByText("Doanh thu theo kênh bán")).toBeInTheDocument();
    expect(screen.getByText("Đơn giao thành công")).toBeInTheDocument();
    // Legend donut + cột đầu bảng đều có tên nguồn.
    expect(screen.getAllByText("Ngoại sàn khác").length).toBeGreaterThanOrEqual(2);
    // 400.000 + 100.000 = 500.000 ở tâm donut và dòng Tổng.
    expect(screen.getAllByText("500.000").length).toBeGreaterThanOrEqual(2);
  });

  it("khối hoàn/rủi ro hoàn: thay cột giao thành công bằng % trên tổng", () => {
    renderCard({
      title: "Hoàn theo kênh bán",
      valueHeader: "Giá trị hoàn",
      centerLabel: "Hoàn",
      rows: AMOUNT_ROWS,
      variant: "amount",
    });

    expect(screen.getByText("% trên tổng")).toBeInTheDocument();
    expect(screen.queryByText("Đơn giao thành công")).not.toBeInTheDocument();
    expect(screen.getByText("75.0%")).toBeInTheDocument();
    expect(screen.getByText("25.0%")).toBeInTheDocument();
    expect(screen.getByText("100.0%")).toBeInTheDocument();
  });

  it("không có dữ liệu → thông báo rỗng, không render bảng", () => {
    renderCard({ rows: [] });

    expect(screen.getByText("Chưa có dữ liệu.")).toBeInTheDocument();
    expect(screen.queryByText("Kênh bán")).not.toBeInTheDocument();
  });
});

describe("ProvinceRevenueCard", () => {
  const ROWS = buildProvinceBreakdown([
    {
      province: "Hà Nội",
      revenue: "400000",
      orders: 4,
      delivered_revenue: "300000",
      delivered_orders: 3,
    },
    {
      province: "Hồ Chí Minh",
      revenue: "100000",
      orders: 1,
      delivered_revenue: "0",
      delivered_orders: 0,
    },
  ]);

  function renderCard(rows = ROWS) {
    return render(
      <I18nProvider>
        <ProvinceRevenueCard rows={rows} />
      </I18nProvider>,
    );
  }

  it("hiện tên tỉnh + số liệu và dòng Tổng", () => {
    renderCard();

    expect(screen.getByText("Doanh thu thuần theo tỉnh/thành")).toBeInTheDocument();
    expect(screen.getAllByText("Hà Nội").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("500.000")).toBeInTheDocument();
    expect(screen.getByText("80.0%")).toBeInTheDocument();
    expect(screen.getByText("20.0%")).toBeInTheDocument();
  });

  it("không có dữ liệu → thông báo rỗng", () => {
    renderCard([]);

    expect(screen.getByText("Chưa có dữ liệu.")).toBeInTheDocument();
    expect(screen.queryByText("Tỉnh/thành")).not.toBeInTheDocument();
  });
});

describe("OverviewKpiTiles", () => {
  const PAYLOAD = {
    total_revenue: "1000000",
    total_orders: 10,
    delivered_revenue: "600000",
    delivered_orders: 6,
    awaiting_revenue: "200000",
    awaiting_orders: 2,
    returned_revenue: "150000",
    returned_orders: 1,
    return_risk_revenue: "50000",
    return_risk_orders: 1,
    // Số cố tình KHÔNG trùng với bất kỳ ô nào khác để getByText không mơ hồ.
    ads_cost: "250000",
    ads_cost_facebook: "180000",
    ads_cost_google: "70000",
    revenue_by_sale_channel: [],
    returned_by_sale_channel: [],
    return_risk_by_sale_channel: [],
    revenue_by_region: [],
    revenue_by_province: [],
    revenue_timeseries: { by_day: [], by_hour: [], by_weekday: [] },
    top_products: [],
  };

  function renderTiles(payload = PAYLOAD) {
    return render(
      <I18nProvider>
        <OverviewKpiTiles kpis={computeOverviewKpis(payload)} />
      </I18nProvider>,
    );
  }

  it("có ô Doanh thu thuần = tổng trừ hoàn", () => {
    renderTiles();

    expect(screen.getByText("Doanh thu thuần")).toBeInTheDocument();
    // 1.000.000 − 150.000 = 850.000
    expect(screen.getByText("850.000")).toBeInTheDocument();
  });

  it("8 ô chia đúng 2 dòng, mỗi dòng 4 ô — dòng 2 gom trọn 4 ô đỏ", () => {
    const { container } = renderTiles();

    const rows = container.querySelectorAll(":scope > div > div.grid");
    expect(rows).toHaveLength(2);
    expect(rows[0].children).toHaveLength(4);
    expect(rows[1].children).toHaveLength(4);
    // Ranh giới 2 dòng trùng ranh giới màu: dòng 1 không có ô đỏ nào, dòng 2 đủ 4.
    expect(rows[0].querySelectorAll(".text-action-danger")).toHaveLength(0);
    expect(rows[1].querySelectorAll(".text-action-danger")).toHaveLength(4);
  });

  it("chi phí Ads là HAI ô rời, mỗi ô có % riêng trên tổng doanh thu", () => {
    renderTiles();

    expect(screen.getByText("Chi phí Facebook Ads")).toBeInTheDocument();
    expect(screen.getByText("Chi phí Google Ads")).toBeInTheDocument();
    // Ô gộp "FB + Google" cũ không còn.
    expect(screen.queryByText("Chi phí FB + Google Ads")).not.toBeInTheDocument();
    expect(screen.getByText("180.000")).toBeInTheDocument();
    expect(screen.getByText("70.000")).toBeInTheDocument();
    expect(screen.getByText("18.0%")).toBeInTheDocument();
    expect(screen.getByText("7.0%")).toBeInTheDocument();
  });

  it("không lọc ngoại sàn → BE trả 0, hai ô vẫn hiện với số 0", () => {
    renderTiles({ ...PAYLOAD, ads_cost: "0", ads_cost_facebook: "0", ads_cost_google: "0" });

    expect(screen.getByText("Chi phí Facebook Ads")).toBeInTheDocument();
    expect(screen.getByText("Chi phí Google Ads")).toBeInTheDocument();
    expect(screen.getAllByText("0")).toHaveLength(2);
  });
});

describe("ColumnTotalTooltip", () => {
  // `graphicalItemId` là field recharts bắt buộc trong TooltipPayloadEntry —
  // không dùng ở đây nhưng thiếu là tsc đỏ.
  const entry = (dataKey: string, name: string, value: number, color: string) => ({
    graphicalItemId: dataKey,
    dataKey,
    name,
    value,
    color,
  });
  const PAYLOAD = [
    entry("facebook", "Facebook", 128692000, "#2a78d6"),
    entry("web", "Web", 23513000, "#1baf7a"),
    entry("off_other", "Ngoại sàn khác", 17569300, "#eda100"),
  ];

  it("dòng đầu là TỔNG của cột, không phải nhãn trục X", () => {
    render(
      <I18nProvider>
        <ColumnTotalTooltip active payload={PAYLOAD} label="20" />
      </I18nProvider>,
    );

    // 128.692.000 + 23.513.000 + 17.569.300 = 169.774.300
    expect(screen.getByText("169.774.300")).toBeInTheDocument();
    // Nhãn trục X cũ ("20") không còn đứng làm tiêu đề tooltip.
    expect(screen.queryByText("20")).not.toBeInTheDocument();
    // Từng nhóm vẫn hiện đủ, đã format tiền.
    expect(screen.getByText("Facebook")).toBeInTheDocument();
    expect(screen.getByText("128.692.000")).toBeInTheDocument();
  });

  it("không có dữ liệu → không render gì", () => {
    const { container } = render(
      <I18nProvider>
        <ColumnTotalTooltip active payload={[]} label="20" />
      </I18nProvider>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("bỏ mục của line tổng khỏi phép cộng và danh sách; kèm % so với cột trước", () => {
    const bar = { bucket: "2026-08-20", label: "20", total: 169774300, changePct: 12.34 };
    const withLine = [
      ...PAYLOAD.map((e) => ({ ...e, payload: bar })),
      { ...entry("total", "Tổng", 169774300, "#000"), payload: bar },
    ];
    render(
      <I18nProvider>
        <ColumnTotalTooltip active payload={withLine} label="20" grain="by_day" />
      </I18nProvider>,
    );

    // Tổng KHÔNG bị đội đôi (339.548.600) và có dòng tăng/giảm.
    expect(screen.getByText("169.774.300 · +12,3% so với ngày trước")).toBeInTheDocument();
    expect(screen.queryByText("Tổng")).not.toBeInTheDocument();
  });

  it("cột đầu kỳ (changePct null) → chỉ hiện tổng, không hiện %", () => {
    const bar = { bucket: "2026-08-01", label: "01", total: 169774300, changePct: null };
    render(
      <I18nProvider>
        <ColumnTotalTooltip
          active
          payload={PAYLOAD.map((e) => ({ ...e, payload: bar }))}
          label="01"
        />
      </I18nProvider>,
    );
    expect(screen.getByText("169.774.300")).toBeInTheDocument();
  });
});

describe("formatChangePct", () => {
  it("dấu + / − thật, một chữ số lẻ, dấu phẩy thập phân", () => {
    expect(formatChangePct(12.34)).toBe("+12,3%");
    expect(formatChangePct(-4)).toBe("\u22124,0%");
    expect(formatChangePct(0)).toBe("0,0%");
  });
});

describe("TopProductsCard", () => {
  const ROWS = buildTopProducts([
    {
      product_id: 7,
      sku: "SKU-B",
      name: "Đệm B",
      quantity: 3,
      orders: 2,
      revenue: "350000",
      delivered_orders: 1,
      delivered_revenue: "200000",
    },
    {
      product_id: 3,
      sku: "SKU-A",
      name: "Ghế massage A",
      quantity: 1,
      orders: 1,
      revenue: "150000",
      delivered_orders: 1,
      delivered_revenue: "150000",
    },
  ]);

  it("có tiêu đề, cột số lượng/tên SP và dòng Tổng khớp tổng các SP", () => {
    render(
      <I18nProvider>
        <TopProductsCard rows={ROWS} />
      </I18nProvider>,
    );

    expect(screen.getByText("Top sản phẩm")).toBeInTheDocument();
    expect(screen.getByText("Tên sản phẩm")).toBeInTheDocument();
    expect(screen.getByText("Số lượng")).toBeInTheDocument();
    expect(screen.getByText("Đệm B")).toBeInTheDocument();
    expect(screen.getByText("Ghế massage A")).toBeInTheDocument();
    // 350.000 + 150.000 = 500.000; số lượng 3 + 1 = 4.
    expect(screen.getByText("500.000")).toBeInTheDocument();
    expect(screen.getByText("70.0%")).toBeInTheDocument();
    expect(screen.getByText("100.0%")).toBeInTheDocument();
  });

  it("không có dữ liệu → hiện thông báo trống", () => {
    render(
      <I18nProvider>
        <TopProductsCard rows={[]} />
      </I18nProvider>,
    );
    expect(screen.getByText("Chưa có dữ liệu.")).toBeInTheDocument();
  });
});
