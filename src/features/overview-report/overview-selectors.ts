import type {
  OverviewProvinceRevenue,
  OverviewRegionRevenue,
  OverviewReportSummary,
  OverviewSaleChannelAmount,
  OverviewSaleChannelRevenue,
  OverviewTopProduct,
} from "@/lib/api/overview-report";
import { REGION_ORDER, UNKNOWN_REGION_KEY, labelForRegion } from "./regions";
import { SALE_CHANNEL_ORDER, labelForSaleChannel } from "./sale-channels";

export type OverviewKpis = {
  /** Tiền đội sale đã chốt trong kỳ — mẫu số của % giao TC, % chờ giao, % chi phí. */
  totalRevenue: number;
  totalOrders: number;
  /**
   * Tiền đã chốt ĐÃ CÓ KẾT QUẢ GIAO = tổng trừ rổ chờ giao, tức giao TC + hoàn +
   * rủi ro hoàn. Là mẫu số của % hoàn và % rủi ro hoàn (user chốt 2026-08-17):
   * đơn còn ở khâu mới/chờ xử lý/đang lấy/đang giao chưa từng tới tay khách nên
   * không được làm loãng tỉ lệ hoàn.
   */
  settledRevenue: number;
  settledOrders: number;
  /**
   * DOANH THU THUẦN = tổng TRỪ rổ hoàn (user chốt 2026-08-22). Dựng để đối chiếu
   * với "Doanh thu thuần" bên KiotViet — số bên đó đã trừ trả hàng, còn ô Tổng
   * doanh thu của trang thì CỘNG cả tiền đơn hoàn.
   *
   * KHÔNG trừ rủi ro hoàn (mã 10): hàng chưa quay về kho nên KiotViet chưa lập
   * phiếu trả. Vẫn KHÔNG khớp tuyệt đối với KiotViet vì bên đó trừ trả hàng theo
   * NGÀY TRẢ, gánh cả đơn bán từ kỳ trước — đo 08/2026 phần đó ~508 triệu. Dòng
   * chú thích dưới hàng tile nói rõ điều này.
   *
   * Cùng cơ sở với 2 khối địa lý (vùng miền, tỉnh/thành); 3 khối theo kênh bán
   * thì vẫn ở cơ sở TỔNG.
   */
  netRevenue: number;
  netOrders: number;
  /** % trên TỔNG doanh thu — bằng 100% trừ % hoàn tính trên cùng mẫu số đó. */
  netPct: number | null;
  /** Đơn giao thành công (status 3). */
  deliveredRevenue: number;
  deliveredOrders: number;
  deliveredPct: number | null;
  /** % giao TC trên mẫu số đã-có-kết-quả — cùng gốc với 2 ô hoàn, cộng lại 100%. */
  deliveredSettledPct: number | null;
  /** Đơn đã chốt còn trên đường, chưa có kết quả cuối. */
  awaitingRevenue: number;
  awaitingOrders: number;
  awaitingPct: number | null;
  /** Đơn đang/đã chuyển hoàn (status 4/5/12/13). */
  returnedRevenue: number;
  returnedOrders: number;
  returnedPct: number | null;
  /** Đơn chờ giao lại (status 10) — đã quay đầu một lần, nguy cơ thành hoàn. */
  returnRiskRevenue: number;
  returnRiskOrders: number;
  returnRiskPct: number | null;
  /**
   * Tiền chi quảng cáo, TÁCH theo nền tảng — KHÔNG nằm trong 4 rổ trên. BE trả
   * 0 cho cả hai khi không lọc ngoại sàn (user chốt 2026-08-20): tiền FB/Google
   * chỉ đẻ ra đơn ngoại sàn nên đặt cạnh doanh thu có cả Shopee/TikTok là sai
   * mẫu số.
   */
  adsCostFacebook: number;
  adsCostFacebookPct: number | null;
  adsCostGoogle: number;
  adsCostGooglePct: number | null;
};

/** Một dòng của khối phân bổ (dùng cho cả donut lẫn bảng). */
export type BreakdownRow = {
  key: string;
  label: string;
  orders: number;
  revenue: number;
  /** % trên tổng của chính khối đó. */
  sharePct: number;
  /** Chỉ khối doanh thu có — khối hoàn/rủi ro hoàn để undefined. */
  deliveredOrders?: number;
  deliveredRevenue?: number;
};

function pctOf(value: number, base: number): number | null {
  return base > 0 ? (value / base) * 100 : null;
}

/**
 * Payload → view model các ô KPI. HAI mẫu số, cố ý khác nhau (xem
 * docs/overview-report.md):
 *
 * - Giao TC / chờ giao / hai ô chi phí Ads: chia cho TỔNG doanh thu đã chốt.
 * - Hoàn / rủi ro hoàn: chia cho `settledRevenue` — tổng TRỪ rổ chờ giao. Đơn
 *   còn đang trên đường (mới, chờ xử lý, đang lấy hàng, chờ lấy lại, đang giao,
 *   đã lấy hàng, chờ chuyển hàng) chưa có kết quả với khách; để chúng trong mẫu
 *   số làm % hoàn tụt xuống giả tạo, càng lệch mạnh ở đầu kỳ khi phần lớn đơn
 *   chưa giao xong.
 *
 * Hệ quả phải chấp nhận: 4 ô % không còn cộng lại đúng 100%. Bất biến mới là
 * `deliveredSettledPct + returnedPct + returnRiskPct = 100`.
 */
export function computeOverviewKpis(data: OverviewReportSummary | null): OverviewKpis {
  const totalRevenue = Number(data?.total_revenue || 0);
  const deliveredRevenue = Number(data?.delivered_revenue || 0);
  const awaitingRevenue = Number(data?.awaiting_revenue || 0);
  const returnedRevenue = Number(data?.returned_revenue || 0);
  const returnRiskRevenue = Number(data?.return_risk_revenue || 0);
  const adsCostFacebook = Number(data?.ads_cost_facebook || 0);
  const adsCostGoogle = Number(data?.ads_cost_google || 0);
  const totalOrders = data?.total_orders ?? 0;
  const awaitingOrders = data?.awaiting_orders ?? 0;
  // Lấy bằng PHÉP TRỪ, không cộng 3 rổ kia: bốn rổ do BE bảo đảm rời nhau và phủ
  // kín tổng (test_four_buckets_partition_every_order_status), nên trừ rổ chờ
  // giao là cách duy nhất tự đúng khi KiotViet thêm mã trạng thái lạ — mã lạ rơi
  // vào rổ chờ giao ở BE và tự động bị loại khỏi mẫu số ở đây.
  const settledRevenue = totalRevenue - awaitingRevenue;
  const settledOrders = totalOrders - awaitingOrders;

  return {
    totalRevenue,
    totalOrders,
    settledRevenue,
    settledOrders,
    netRevenue: totalRevenue - returnedRevenue,
    netOrders: totalOrders - (data?.returned_orders ?? 0),
    netPct: pctOf(totalRevenue - returnedRevenue, totalRevenue),
    deliveredRevenue,
    deliveredOrders: data?.delivered_orders ?? 0,
    deliveredPct: pctOf(deliveredRevenue, totalRevenue),
    deliveredSettledPct: pctOf(deliveredRevenue, settledRevenue),
    awaitingRevenue,
    awaitingOrders,
    awaitingPct: pctOf(awaitingRevenue, totalRevenue),
    returnedRevenue,
    returnedOrders: data?.returned_orders ?? 0,
    returnedPct: pctOf(returnedRevenue, settledRevenue),
    returnRiskRevenue,
    returnRiskOrders: data?.return_risk_orders ?? 0,
    returnRiskPct: pctOf(returnRiskRevenue, settledRevenue),
    adsCostFacebook,
    adsCostFacebookPct: pctOf(adsCostFacebook, totalRevenue),
    adsCostGoogle,
    adsCostGooglePct: pctOf(adsCostGoogle, totalRevenue),
  };
}

/**
 * Rows theo NHÓM KÊNH BÁN (nội sàn / ngoại sàn) cho một khối.
 *
 * Giữ THỨ TỰ CỐ ĐỊNH nội → ngoại thay vì sort theo giá trị: một nhóm luôn nằm
 * cùng vị trí và cùng màu ở cả 3 biểu đồ nên so sánh giữa các khối mới đọc
 * được (màu theo entity, không theo thứ hạng). Nhóm 0 đơn bị loại để donut
 * không có lát rỗng.
 */
export function buildSaleChannelBreakdown(
  rows: readonly (OverviewSaleChannelRevenue | OverviewSaleChannelAmount)[] | undefined,
): BreakdownRow[] {
  const byKey = new Map<string, BreakdownRow>();
  for (const row of rows ?? []) {
    if ((row.orders || 0) <= 0) continue;
    const delivered = row as OverviewSaleChannelRevenue;
    byKey.set(row.sale_channel, {
      key: row.sale_channel,
      label: labelForSaleChannel(row.sale_channel),
      orders: row.orders || 0,
      revenue: Number(row.revenue || 0),
      sharePct: 0,
      ...(delivered.delivered_revenue !== undefined
        ? {
            deliveredOrders: delivered.delivered_orders || 0,
            deliveredRevenue: Number(delivered.delivered_revenue || 0),
          }
        : {}),
    });
  }

  const ordered = SALE_CHANNEL_ORDER.map((key) => byKey.get(key)).filter(
    (row): row is BreakdownRow => row !== undefined,
  );
  return withShares(ordered);
}

function withShares<T extends BreakdownRow>(rows: T[]): T[] {
  const total = rows.reduce((sum, row) => sum + row.revenue, 0);
  for (const row of rows) {
    row.sharePct = total > 0 ? (row.revenue / total) * 100 : 0;
  }
  return rows;
}

/**
 * Tổng doanh thu theo vùng miền — giữ thứ tự Bắc → Nam của `REGION_ORDER` (màu
 * và vị trí lát cố định theo vùng, không theo thứ hạng); vùng "Không xác định"
 * xếp cuối.
 */
export function buildRegionBreakdown(
  rows: readonly OverviewRegionRevenue[] | undefined,
): BreakdownRow[] {
  const order = [...REGION_ORDER, UNKNOWN_REGION_KEY] as readonly string[];
  const mapped = (rows ?? [])
    .filter((row) => (row.orders || 0) > 0)
    .map((row) => ({
      key: row.region,
      label: labelForRegion(row.region),
      orders: row.orders || 0,
      revenue: Number(row.revenue || 0),
      sharePct: 0,
      deliveredOrders: row.delivered_orders || 0,
      deliveredRevenue: Number(row.delivered_revenue || 0),
    }))
    .sort((a, b) => {
      const rank = (key: string) => {
        const idx = order.indexOf(key);
        return idx === -1 ? order.length : idx;
      };
      return rank(a.key) - rank(b.key);
    });
  return withShares(mapped);
}

/** Tổng doanh thu theo tỉnh/thành — giữ nguyên thứ tự giảm dần từ backend. */
export function buildProvinceBreakdown(
  rows: readonly OverviewProvinceRevenue[] | undefined,
): BreakdownRow[] {
  const mapped = (rows ?? [])
    .filter((row) => (row.orders || 0) > 0)
    .map((row) => ({
      key: row.province,
      label: row.province,
      orders: row.orders || 0,
      revenue: Number(row.revenue || 0),
      sharePct: 0,
      deliveredOrders: row.delivered_orders || 0,
      deliveredRevenue: Number(row.delivered_revenue || 0),
    }));
  return withShares(mapped);
}

/** Cộng dồn dòng Tổng của bảng chi tiết (khớp tổng các lát donut). */
export function sumBreakdownRows(rows: readonly BreakdownRow[]) {
  return rows.reduce(
    (acc, row) => ({
      orders: acc.orders + row.orders,
      revenue: acc.revenue + row.revenue,
      deliveredOrders: acc.deliveredOrders + (row.deliveredOrders ?? 0),
      deliveredRevenue: acc.deliveredRevenue + (row.deliveredRevenue ?? 0),
    }),
    { orders: 0, revenue: 0, deliveredOrders: 0, deliveredRevenue: 0 },
  );
}

/** Một dòng của khối Top sản phẩm — `BreakdownRow` cộng thêm SKU/tên/số lượng. */
export type TopProductRow = BreakdownRow & {
  productId: number;
  sku: string;
  name: string;
  quantity: number;
};

/**
 * Top sản phẩm theo doanh thu THUẦN cộng theo dòng hàng — giữ nguyên thứ tự
 * giảm dần của backend. `label` là SKU (rơi về tên khi SKU trống) vì trục biểu
 * đồ hẹp; tên đầy đủ nằm ở cột riêng trong bảng.
 *
 * Bỏ dòng doanh thu ≤ 0: quà tặng/kèm theo có số lượng nhưng không có tiền,
 * để lại chỉ làm dài bảng của một khối xếp hạng theo tiền.
 */
export function buildTopProducts(rows: readonly OverviewTopProduct[] | undefined): TopProductRow[] {
  const mapped = (rows ?? [])
    .filter((row) => Number(row.revenue || 0) > 0)
    .map((row) => ({
      key: String(row.product_id),
      productId: row.product_id,
      sku: row.sku,
      name: row.name,
      label: row.sku || row.name,
      quantity: row.quantity || 0,
      orders: row.orders || 0,
      revenue: Number(row.revenue || 0),
      sharePct: 0,
      deliveredOrders: row.delivered_orders || 0,
      deliveredRevenue: Number(row.delivered_revenue || 0),
    }));
  return withShares(mapped);
}

/** Dòng Tổng của bảng top sản phẩm — `sumBreakdownRows` cộng thêm số lượng. */
export function sumTopProducts(rows: readonly TopProductRow[]) {
  return {
    ...sumBreakdownRows(rows),
    quantity: rows.reduce((sum, row) => sum + row.quantity, 0),
  };
}
