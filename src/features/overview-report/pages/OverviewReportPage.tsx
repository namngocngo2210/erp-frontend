import { useCallback, useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { DateFilter, type DateFilterValue, getDateRange } from "@/components/ui/date-filter";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { useAllProductOptions } from "@/features/products/queries";
import { useI18n } from "@/i18n";
import { useOverviewReport } from "../queries";
import {
  buildProvinceBreakdown,
  buildRegionBreakdown,
  buildSaleChannelBreakdown,
  buildTopProducts,
  computeOverviewKpis,
} from "../overview-selectors";
import { OverviewKpiTiles } from "../components/OverviewKpiTiles";
import { OverviewBreakdownCard } from "../components/OverviewBreakdownCard";
import { ProvinceRevenueCard } from "../components/ProvinceRevenueCard";
import { RevenueTimeseriesCard } from "../components/RevenueTimeseriesCard";
import { TopProductsCard } from "../components/TopProductsCard";
import { colorForRegion } from "../regions";
import {
  SALE_CHANNEL_LABELS,
  SALE_CHANNEL_SOURCE_LABELS,
  saleChannelGroupFor,
  saleChannelOrderFor,
} from "../sale-channels";

// Mặc định "Tháng này" (user chốt 2026-08-11): trang này để lãnh đạo nhìn cả
// tháng đang chạy, không phải chỉ hôm nay.
const THIS_MONTH_RANGE = getDateRange("this_month");
const DEFAULT_DATE_FILTER: DateFilterValue = {
  option: "this_month",
  from: THIS_MONTH_RANGE.from,
  to: THIS_MONTH_RANGE.to,
};

export function OverviewReportPage() {
  const { t } = useI18n();
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(DEFAULT_DATE_FILTER);
  const [productIds, setProductIds] = useState<number[]>([]);
  // Ô "Nguồn" — "" = tất cả; còn lại là key nhóm lớn của BE (nội/ngoại sàn).
  const [saleChannel, setSaleChannel] = useState<string>("");
  // Ô "Kênh bán" — một nhóm TRONG tầng của Nguồn; "" = cả tầng.
  const [saleChannelGroup, setSaleChannelGroup] = useState<string>("");

  // Danh sách kênh bán lấy thẳng từ tầng biểu đồ đang vẽ, nên ô lọc không thể
  // lệch với dữ liệu hiển thị.
  const saleChannelOptions = useMemo(() => saleChannelOrderFor(saleChannel), [saleChannel]);
  // Giá trị kênh bán ĐÃ KIỂM — dùng chung cho request và cho thứ tự lát biểu đồ,
  // để hai thứ không bao giờ nói khác nhau.
  const activeSaleChannelGroup = useMemo(
    () => saleChannelGroupFor(saleChannel, saleChannelGroup),
    [saleChannel, saleChannelGroup],
  );
  // Đổi Nguồn thì kênh cũ thường không còn thuộc tầng mới — reset về cả tầng
  // thay vì gửi đi tổ hợp mâu thuẫn (BE cũng bỏ qua, nhưng ô lọc sẽ hiện một
  // giá trị không có trong danh sách).
  const handleSaleChannelChange = useCallback((value: string) => {
    setSaleChannel(value === "all" ? "" : value);
    setSaleChannelGroup("");
  }, []);

  // Nạp danh mục SP 1 lần (staleTime Infinity) rồi lọc client — cùng cách với
  // multi-select SP ở dialog danh mục.
  const productsQuery = useAllProductOptions(true);
  const productOptions = useMemo(
    () =>
      (productsQuery.data ?? []).map((product) => ({
        value: String(product.id),
        label: product.sku || product.name,
        keywords: product.name,
      })),
    [productsQuery.data],
  );
  const selectedProductValues = useMemo(() => productIds.map(String), [productIds]);
  const handleProductChange = useCallback((values: string[]) => {
    setProductIds(values.map(Number).filter(Number.isFinite));
  }, []);

  const reportParams = useMemo(
    () => ({
      dateFrom: dateFilter.from,
      dateTo: dateFilter.to,
      productIds,
      saleChannel,
      saleChannelGroup: activeSaleChannelGroup,
    }),
    [dateFilter.from, dateFilter.to, productIds, saleChannel, activeSaleChannelGroup],
  );
  const reportQuery = useOverviewReport(reportParams);
  // Hành vi như trang Báo cáo Ads: lỗi → xoá số liệu + hiện thông báo; đang tải
  // → giữ số liệu cũ (keepPreviousData ở queries.ts).
  const data = reportQuery.isError ? null : (reportQuery.data ?? null);
  const error = reportQuery.error
    ? reportQuery.error instanceof Error
      ? reportQuery.error.message
      : String(reportQuery.error)
    : null;

  const kpis = useMemo(() => computeOverviewKpis(data), [data]);
  const revenueRows = useMemo(
    () => buildSaleChannelBreakdown(data?.revenue_by_sale_channel),
    [data],
  );
  const returnedRows = useMemo(
    () => buildSaleChannelBreakdown(data?.returned_by_sale_channel),
    [data],
  );
  const returnRiskRows = useMemo(
    () => buildSaleChannelBreakdown(data?.return_risk_by_sale_channel),
    [data],
  );
  const regionRows = useMemo(() => buildRegionBreakdown(data?.revenue_by_region), [data]);
  const provinceRows = useMemo(() => buildProvinceBreakdown(data?.revenue_by_province), [data]);
  const topProductRows = useMemo(() => buildTopProducts(data?.top_products), [data]);

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("topnav.tabs.overviewReport", "Báo cáo tổng")}
        description={t(
          "overviewReport.hint",
          "Số liệu toàn công ty theo ngày tạo đơn — tổng doanh thu đã chốt và kết quả giao hàng của số tiền đó, kèm chi phí Ads.",
        )}
      />

      <Card className="rounded-xl border-border bg-card">
        <CardContent className="space-y-3 pt-6">
          <DateFilter value={dateFilter} onChange={setDateFilter} />
          {/* 3 ô lọc xếp cùng hàng trên màn rộng, xuống dòng ở màn hẹp. */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex min-w-0 flex-col gap-1">
              <label
                htmlFor="overview-source-filter"
                className="text-xs font-medium text-muted-foreground"
              >
                {t("overviewReport.sourceFilterLabel", "Nguồn")}
              </label>
              <Select value={saleChannel || "all"} onValueChange={handleSaleChannelChange}>
                <SelectTrigger id="overview-source-filter" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("overviewReport.allSources", "Tất cả")}</SelectItem>
                  <SelectItem value="marketplace">
                    {SALE_CHANNEL_SOURCE_LABELS.marketplace}
                  </SelectItem>
                  <SelectItem value="off_marketplace">
                    {SALE_CHANNEL_SOURCE_LABELS.off_marketplace}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex min-w-0 flex-col gap-1">
              <label
                htmlFor="overview-sale-channel-filter"
                className="text-xs font-medium text-muted-foreground"
              >
                {t("overviewReport.saleChannelFilterLabel", "Kênh bán")}
              </label>
              <Select
                value={saleChannelGroup || "all"}
                onValueChange={(v) => setSaleChannelGroup(v === "all" ? "" : v)}
              >
                <SelectTrigger id="overview-sale-channel-filter" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("overviewReport.allSaleChannels", "Tất cả")}
                  </SelectItem>
                  {saleChannelOptions.map((key) => (
                    <SelectItem key={key} value={key}>
                      {SALE_CHANNEL_LABELS[key] ?? key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex min-w-0 flex-col gap-1">
              <label
                htmlFor="overview-product-filter"
                className="text-xs font-medium text-muted-foreground"
              >
                {t("overviewReport.productFilterLabel", "Sản phẩm")}
              </label>
              <MultiSelect
                id="overview-product-filter"
                options={productOptions}
                selected={selectedProductValues}
                onChange={handleProductChange}
                placeholder={t("overviewReport.allProducts", "Tất cả sản phẩm")}
                className="w-full"
                menuPortal
              />
            </div>
          </div>

          {productIds.length > 0 && (
            // Nói rõ 2 điều dễ hiểu nhầm khi đang lọc SP, xem docs/overview-report.md.
            <p className="text-xs text-muted-foreground">
              {t(
                "overviewReport.productFilterHint",
                "Đang lọc theo sản phẩm: mọi số tiền là tiền của riêng sản phẩm đã chọn (đơn mua kèm chỉ tính phần của sản phẩm này). Riêng chi phí Facebook/Google Ads không tách được theo sản phẩm nên vẫn là tổng chi tiêu của kỳ.",
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {error && (
        <Card className="rounded-xl border-destructive/50 bg-destructive/10">
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {reportQuery.isLoading ? (
        // Lần tải đầu chưa có data cũ — spinner thay vì KPI 0 (như AdsReportPage).
        <div className="flex min-h-28 items-center justify-center rounded-xl border border-border bg-card">
          <LogoSpinner size={36} />
        </div>
      ) : (
        <>
          <OverviewKpiTiles kpis={kpis} />

          <RevenueTimeseriesCard
            timeseries={data?.revenue_timeseries}
            saleChannel={saleChannel}
            saleChannelGroup={activeSaleChannelGroup}
            dateFrom={dateFilter.from}
            dateTo={dateFilter.to}
          />

          <div className="grid gap-4 xl:grid-cols-3">
            <OverviewBreakdownCard
              title={t("overviewReport.revenueByChannelTitle", "Doanh thu theo kênh bán")}
              valueHeader={t("overviewReport.revenueHeader", "Doanh thu")}
              centerLabel={t("overviewReport.kpi.totalRevenueShort", "Doanh thu")}
              rows={revenueRows}
              variant="revenue"
            />
            <OverviewBreakdownCard
              title={t("overviewReport.returnedByChannelTitle", "Hoàn theo kênh bán")}
              valueHeader={t("overviewReport.returnedHeader", "Giá trị hoàn")}
              centerLabel={t("overviewReport.kpi.returned", "Hoàn")}
              rows={returnedRows}
              variant="amount"
            />
            <OverviewBreakdownCard
              title={t("overviewReport.returnRiskByChannelTitle", "Rủi ro hoàn theo kênh bán")}
              valueHeader={t("overviewReport.returnRiskHeader", "Giá trị rủi ro hoàn")}
              centerLabel={t("overviewReport.kpi.returnRisk", "Rủi ro hoàn")}
              rows={returnRiskRows}
              variant="amount"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <OverviewBreakdownCard
              title={t("overviewReport.revenueByRegionTitle", "Doanh thu thuần theo vùng miền")}
              nameHeader={t("overviewReport.regionHeader", "Vùng miền")}
              // Key RIÊNG, không dùng lại `revenueHeader`/`totalRevenueShort` của khối
              // kênh bán: hai khối địa lý ở cơ sở THUẦN, khối kênh bán ở cơ sở tổng.
              // Dùng chung key là hai số khác nhau đội cùng một nhãn.
              valueHeader={t("overviewReport.netRevenueHeader", "Doanh thu thuần")}
              centerLabel={t("overviewReport.kpi.netRevenueShort", "DT thuần")}
              rows={regionRows}
              variant="revenue"
              colorOf={colorForRegion}
            />
            <ProvinceRevenueCard rows={provinceRows} />
          </div>

          {/* Dưới cùng (user chốt 2026-09-03): xếp hạng SP là lớp chi tiết nhất,
              đọc sau khi đã nắm tổng, kênh và địa lý. */}
          <TopProductsCard rows={topProductRows} />
        </>
      )}
    </div>
  );
}

export default OverviewReportPage;
