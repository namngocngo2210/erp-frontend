import { describe, expect, it } from "vitest";

import type { OverviewReportSummary } from "@/lib/api/overview-report";
import {
  buildProvinceBreakdown,
  buildRegionBreakdown,
  buildSaleChannelBreakdown,
  buildTopProducts,
  computeOverviewKpis,
  sumBreakdownRows,
  sumTopProducts,
} from "../overview-selectors";
import {
  SALE_CHANNEL_ORDER,
  colorForSaleChannel,
  saleChannelGroupFor,
  saleChannelOrderFor,
  saleChannelSeriesFor,
} from "../sale-channels";
import { colorForRegion } from "../regions";

const payload: OverviewReportSummary = {
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
  ads_cost: "250000",
  ads_cost_facebook: "150000",
  ads_cost_google: "100000",
  // BE trả ngoại sàn trước để test phần sắp lại thứ tự cố định (nội → ngoại).
  revenue_by_sale_channel: [
    {
      sale_channel: "off_other",
      revenue: "400000",
      orders: 4,
      delivered_revenue: "300000",
      delivered_orders: 3,
    },
    {
      sale_channel: "shopee",
      revenue: "300000",
      orders: 3,
      delivered_revenue: "120000",
      delivered_orders: 1,
    },
  ],
  returned_by_sale_channel: [
    { sale_channel: "off_other", revenue: "150000", orders: 1 },
    { sale_channel: "shopee", revenue: "50000", orders: 1 },
  ],
  return_risk_by_sale_channel: [{ sale_channel: "shopee", revenue: "50000", orders: 1 }],
  // BE trả vùng theo thứ tự Bắc→Nam; ở đây cố tình đảo để test phần sắp xếp.
  revenue_by_region: [
    {
      region: "southeast",
      revenue: "300000",
      orders: 3,
      delivered_revenue: "120000",
      delivered_orders: 1,
    },
    {
      region: "red_river_delta",
      revenue: "400000",
      orders: 4,
      delivered_revenue: "300000",
      delivered_orders: 3,
    },
  ],
  revenue_timeseries: { by_day: [], by_hour: [], by_weekday: [] },
  top_products: [],
  revenue_by_province: [
    {
      province: "Hà Nội",
      revenue: "400000",
      orders: 4,
      delivered_revenue: "300000",
      delivered_orders: 3,
    },
    {
      province: "Hồ Chí Minh",
      revenue: "300000",
      orders: 3,
      delivered_revenue: "120000",
      delivered_orders: 1,
    },
  ],
};

describe("computeOverviewKpis", () => {
  it("% giao thành công / chờ giao / chi phí tính trên tổng doanh thu", () => {
    const kpis = computeOverviewKpis(payload);
    expect(kpis.totalRevenue).toBe(1000000);
    expect(kpis.totalOrders).toBe(10);
    expect(kpis.deliveredPct).toBeCloseTo(60);
    expect(kpis.awaitingPct).toBeCloseTo(20);
    // Chi phí Ads đứng NGOÀI phép cộng, vẫn lấy tổng doanh thu làm mẫu số.
    expect(kpis.adsCostFacebookPct).toBeCloseTo(15);
    expect(kpis.adsCostGooglePct).toBeCloseTo(10);
  });

  it("chi phí Ads tách hai nền tảng, cộng lại đúng tổng cũ", () => {
    const kpis = computeOverviewKpis(payload);
    expect(kpis.adsCostFacebook).toBe(150000);
    expect(kpis.adsCostGoogle).toBe(100000);
    // Gộp lại phải khớp đúng con số một ô "FB + Google" trước đây.
    expect(kpis.adsCostFacebook + kpis.adsCostGoogle).toBe(250000);
  });

  it("doanh thu thuần = tổng trừ rổ hoàn, KHÔNG trừ rủi ro hoàn", () => {
    const kpis = computeOverviewKpis(payload);
    // 1.000.000 − 150.000 = 850.000; rủi ro hoàn 50.000 vẫn nằm trong.
    expect(kpis.netRevenue).toBe(850000);
    expect(kpis.netOrders).toBe(9);
    expect(kpis.netPct).toBeCloseTo(85);
    expect(kpis.netRevenue).toBe(kpis.totalRevenue - kpis.returnedRevenue);
    // Không được lẫn với doanh thu đã có kết quả giao (mẫu số của % hoàn).
    expect(kpis.netRevenue).not.toBe(kpis.settledRevenue);
  });

  it("doanh thu đã có kết quả giao = tổng trừ rổ chờ giao", () => {
    const kpis = computeOverviewKpis(payload);
    expect(kpis.settledRevenue).toBe(800000);
    expect(kpis.settledOrders).toBe(8);
    expect(kpis.settledRevenue).toBe(
      kpis.deliveredRevenue + kpis.returnedRevenue + kpis.returnRiskRevenue,
    );
  });

  it("% hoàn và % rủi ro hoàn tính trên doanh thu đã có kết quả giao", () => {
    const kpis = computeOverviewKpis(payload);
    // 150k/800k và 50k/800k — KHÔNG phải 15%/5% trên tổng 1tr: đơn còn đang trên
    // đường chưa từng tới tay khách nên không được làm loãng mẫu số.
    expect(kpis.returnedPct).toBeCloseTo(18.75);
    expect(kpis.returnRiskPct).toBeCloseTo(6.25);
    const sum =
      (kpis.deliveredSettledPct ?? 0) + (kpis.returnedPct ?? 0) + (kpis.returnRiskPct ?? 0);
    expect(sum).toBeCloseTo(100);
  });

  it("kỳ mà mọi đơn còn đang trên đường → % hoàn null, không chia 0", () => {
    const kpis = computeOverviewKpis({
      ...payload,
      total_revenue: "200000",
      total_orders: 2,
      delivered_revenue: "0",
      delivered_orders: 0,
      awaiting_revenue: "200000",
      awaiting_orders: 2,
      returned_revenue: "0",
      returned_orders: 0,
      return_risk_revenue: "0",
      return_risk_orders: 0,
    });
    expect(kpis.settledRevenue).toBe(0);
    expect(kpis.returnedPct).toBeNull();
    expect(kpis.returnRiskPct).toBeNull();
    // Ô chờ giao vẫn đọc được vì mẫu số của nó là tổng doanh thu.
    expect(kpis.awaitingPct).toBeCloseTo(100);
  });

  it("4 rổ cộng lại đúng bằng tổng doanh thu", () => {
    const kpis = computeOverviewKpis(payload);
    expect(
      kpis.deliveredRevenue + kpis.awaitingRevenue + kpis.returnedRevenue + kpis.returnRiskRevenue,
    ).toBe(kpis.totalRevenue);
    expect(
      kpis.deliveredOrders + kpis.awaitingOrders + kpis.returnedOrders + kpis.returnRiskOrders,
    ).toBe(kpis.totalOrders);
  });

  it("null payload → số 0 và % null (không chia 0)", () => {
    const kpis = computeOverviewKpis(null);
    expect(kpis.totalRevenue).toBe(0);
    expect(kpis.settledRevenue).toBe(0);
    expect(kpis.deliveredPct).toBeNull();
    expect(kpis.deliveredSettledPct).toBeNull();
    expect(kpis.awaitingPct).toBeNull();
    expect(kpis.returnedPct).toBeNull();
    expect(kpis.returnRiskPct).toBeNull();
    expect(kpis.netRevenue).toBe(0);
    expect(kpis.netPct).toBeNull();
    expect(kpis.adsCostFacebookPct).toBeNull();
    expect(kpis.adsCostGooglePct).toBeNull();
  });
});

describe("buildSaleChannelBreakdown", () => {
  it("sắp lại thứ tự cố định nội sàn → ngoại sàn, gắn nhãn tiếng Việt", () => {
    const rows = buildSaleChannelBreakdown(payload.revenue_by_sale_channel);
    expect(rows.map((r) => r.key)).toEqual(["shopee", "off_other"]);
    expect(rows.map((r) => r.label)).toEqual(["Shopee", "Ngoại sàn khác"]);
  });

  it("giữ đủ 5 nhóm theo đúng thứ tự Shopee → TikTok → Facebook → Web → Khác", () => {
    const rows = buildSaleChannelBreakdown([
      { sale_channel: "off_other", revenue: "10", orders: 1 },
      { sale_channel: "web", revenue: "20", orders: 1 },
      { sale_channel: "facebook", revenue: "30", orders: 1 },
      { sale_channel: "tiktok", revenue: "40", orders: 1 },
      { sale_channel: "shopee", revenue: "50", orders: 1 },
    ]);
    expect(rows.map((r) => r.key)).toEqual(["shopee", "tiktok", "facebook", "web", "off_other"]);
    expect(rows.map((r) => r.label)).toEqual([
      "Shopee",
      "TikTok",
      "Facebook",
      "Web",
      "Ngoại sàn khác",
    ]);
  });

  it("tính % trên tổng của chính khối + giữ cột giao thành công", () => {
    const rows = buildSaleChannelBreakdown(payload.revenue_by_sale_channel);
    expect(rows[1]).toMatchObject({
      label: "Ngoại sàn khác",
      orders: 4,
      revenue: 400000,
      deliveredOrders: 3,
      deliveredRevenue: 300000,
    });
    expect(rows[1].sharePct).toBeCloseTo(57.14, 1);
    expect(rows[0].sharePct).toBeCloseTo(42.86, 1);
  });

  it("khối hoàn/rủi ro hoàn không có cột giao thành công", () => {
    const rows = buildSaleChannelBreakdown(payload.returned_by_sale_channel);
    expect(rows.map((r) => r.key)).toEqual(["shopee", "off_other"]);
    expect(rows[0].deliveredRevenue).toBeUndefined();
    expect(rows[0].sharePct).toBeCloseTo(25);
  });

  it("bỏ nhóm 0 đơn (donut không có lát rỗng) và chịu được payload rỗng", () => {
    expect(
      buildSaleChannelBreakdown([
        { sale_channel: "shopee", revenue: "0", orders: 0 },
        { sale_channel: "off_other", revenue: "1000", orders: 1 },
      ]).map((r) => r.key),
    ).toEqual(["off_other"]);
    expect(buildSaleChannelBreakdown(undefined)).toEqual([]);
  });
});

describe("sumBreakdownRows", () => {
  it("dòng Tổng khớp tổng các lát", () => {
    const totals = sumBreakdownRows(buildSaleChannelBreakdown(payload.revenue_by_sale_channel));
    expect(totals).toEqual({
      orders: 7,
      revenue: 700000,
      deliveredOrders: 4,
      deliveredRevenue: 420000,
    });
  });
});

describe("buildRegionBreakdown", () => {
  it("sắp lại theo thứ tự Bắc → Nam, gắn nhãn tiếng Việt", () => {
    const rows = buildRegionBreakdown(payload.revenue_by_region);
    expect(rows.map((r) => r.key)).toEqual(["red_river_delta", "southeast"]);
    expect(rows[0].label).toBe("Đồng bằng sông Hồng");
    expect(rows[0].sharePct).toBeCloseTo(57.14, 1);
    expect(rows[0].deliveredRevenue).toBe(300000);
  });

  it("vùng không xác định xếp cuối và có nhãn riêng", () => {
    const rows = buildRegionBreakdown([
      {
        region: "unknown",
        revenue: "10000",
        orders: 1,
        delivered_revenue: "0",
        delivered_orders: 0,
      },
      {
        region: "mekong_delta",
        revenue: "20000",
        orders: 1,
        delivered_revenue: "0",
        delivered_orders: 0,
      },
    ]);
    expect(rows.map((r) => r.key)).toEqual(["mekong_delta", "unknown"]);
    expect(rows[1].label).toBe("Không xác định");
  });

  it("bỏ vùng 0 đơn, chịu được payload rỗng", () => {
    expect(
      buildRegionBreakdown([
        {
          region: "southeast",
          revenue: "0",
          orders: 0,
          delivered_revenue: "0",
          delivered_orders: 0,
        },
      ]),
    ).toEqual([]);
    expect(buildRegionBreakdown(undefined)).toEqual([]);
  });
});

describe("buildProvinceBreakdown", () => {
  it("giữ nguyên thứ tự giảm dần của backend + tính % trên tổng", () => {
    const rows = buildProvinceBreakdown(payload.revenue_by_province);
    expect(rows.map((r) => r.label)).toEqual(["Hà Nội", "Hồ Chí Minh"]);
    expect(rows[0].sharePct).toBeCloseTo(57.14, 1);
    expect(rows[1].deliveredOrders).toBe(1);
    expect(buildProvinceBreakdown(undefined)).toEqual([]);
  });
});

describe("colorForSaleChannel", () => {
  it("trong MỖI TẦNG các nhóm khác màu đôi một", () => {
    expect(colorForSaleChannel("shopee")).toBe(colorForSaleChannel("shopee"));
    // Luật là khác màu TRONG TẦNG, không phải khác màu trên toàn bộ 7 khóa: hai
    // tầng không bao giờ hiện cùng lúc nên `marketplace` dùng lại hex của
    // `facebook`. Trùng màu trong CÙNG một tầng mới là lỗi câm — donut vẫn vẽ,
    // người đọc không phân biệt được lát nào là lát nào.
    for (const filter of ["", "marketplace", "off_marketplace"]) {
      const groups = saleChannelOrderFor(filter);
      expect(new Set(groups.map(colorForSaleChannel)).size).toBe(groups.length);
    }
  });

  it("mỗi tầng trả đúng bộ nhóm và đúng thứ tự", () => {
    expect(saleChannelOrderFor("")).toEqual(["marketplace", "off_marketplace"]);
    expect(saleChannelOrderFor("marketplace")).toEqual(["shopee", "tiktok"]);
    expect(saleChannelOrderFor("off_marketplace")).toEqual(["facebook", "web", "off_other"]);
    // Giá trị lạ coi như không lọc — khớp cách BE xử lý bộ lọc.
    expect(saleChannelOrderFor("abc")).toEqual(["marketplace", "off_marketplace"]);
  });

  it("SALE_CHANNEL_ORDER là 3 tầng nối lại, không xen kẽ", () => {
    // buildSaleChannelBreakdown sắp lát bằng danh sách phẳng này. Nó ra đúng thứ
    // tự CHỈ KHI các tầng nằm liền khối — xen kẽ là lát nhảy vị trí âm thầm.
    expect([...SALE_CHANNEL_ORDER]).toEqual([
      ...saleChannelOrderFor(""),
      ...saleChannelOrderFor("marketplace"),
      ...saleChannelOrderFor("off_marketplace"),
    ]);
  });

  it("ô Kênh bán chỉ nhận nhóm THUỘC tầng của Nguồn đang chọn", () => {
    expect(saleChannelGroupFor("off_marketplace", "web")).toBe("web");
    expect(saleChannelGroupFor("", "marketplace")).toBe("marketplace");
    // Mâu thuẫn (Nguồn nội sàn mà chọn Facebook) và giá trị lạ đều coi như không
    // lọc — GƯƠNG của `sale_channel_group_filter` ở BE.
    expect(saleChannelGroupFor("marketplace", "facebook")).toBe("");
    expect(saleChannelGroupFor("off_marketplace", "abc")).toBe("");
  });

  it("lọc một kênh thì chỉ còn đúng lát đó, không lọc thì cả tầng", () => {
    expect(saleChannelSeriesFor("off_marketplace", "facebook")).toEqual(["facebook"]);
    expect(saleChannelSeriesFor("off_marketplace", "")).toEqual(["facebook", "web", "off_other"]);
    expect(saleChannelSeriesFor("", "off_marketplace")).toEqual(["off_marketplace"]);
  });

  it("mỗi vùng có màu riêng, vùng lạ dùng màu 'không xác định'", () => {
    expect(colorForRegion("red_river_delta")).not.toBe(colorForRegion("southeast"));
    expect(colorForRegion("vung-la")).toBe(colorForRegion("unknown"));
  });
});

describe("buildTopProducts", () => {
  const ROWS = [
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
      sku: "",
      name: "Ghế massage A",
      quantity: 1,
      orders: 1,
      revenue: "150000",
      delivered_orders: 1,
      delivered_revenue: "150000",
    },
    // Quà tặng: có số lượng, không có tiền → không vào bảng xếp hạng theo tiền.
    {
      product_id: 9,
      sku: "GIFT",
      name: "Quà tặng",
      quantity: 5,
      orders: 5,
      revenue: "0",
      delivered_orders: 5,
      delivered_revenue: "0",
    },
  ];

  it("giữ thứ tự giảm dần của backend, nhãn là SKU (rơi về tên khi trống), tính % trên tổng", () => {
    const rows = buildTopProducts(ROWS);
    expect(rows.map((r) => r.label)).toEqual(["SKU-B", "Ghế massage A"]);
    expect(rows[0]).toMatchObject({
      key: "7",
      productId: 7,
      sku: "SKU-B",
      name: "Đệm B",
      quantity: 3,
      orders: 2,
      revenue: 350000,
      deliveredOrders: 1,
      deliveredRevenue: 200000,
      sharePct: 70,
    });
    expect(rows[1].sharePct).toBe(30);
  });

  it("bỏ dòng doanh thu 0 và chịu được payload rỗng", () => {
    expect(buildTopProducts(ROWS).map((r) => r.sku)).not.toContain("GIFT");
    expect(buildTopProducts(undefined)).toEqual([]);
  });

  it("dòng Tổng cộng cả số lượng", () => {
    expect(sumTopProducts(buildTopProducts(ROWS))).toEqual({
      quantity: 4,
      orders: 3,
      revenue: 500000,
      deliveredOrders: 2,
      deliveredRevenue: 350000,
    });
  });
});
