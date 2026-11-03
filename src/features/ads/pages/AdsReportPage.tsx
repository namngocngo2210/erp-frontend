import { useCallback, useMemo, useState } from "react";

import type { ChannelRow } from "@/features/channels/components/ChannelManagement";
import { Card, CardContent } from "@/components/ui/card";
import { MultiSelect } from "@/components/ui/multi-select";
import { DateFilter, type DateFilterValue, getDateRange } from "@/components/ui/date-filter";
import { PageHeader } from "@/components/ui/page-header";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { useI18n } from "@/i18n";
import { mergeCampaignRows } from "@/lib/api/ads_campaign_report";
import { useAdsReport, useCampaignCostReport, usePageCostReport } from "@/features/ads/queries";
import {
  type AdsReportPayload,
  buildGenderBreakdownRows,
  buildProvinceBreakdownRows,
  computeAdsKpis,
} from "../ads-report-selectors";
import { AdsKpiRow } from "../components/AdsKpiRow";
import { CampaignCostTable } from "../components/CampaignCostTable";
import { CampaignProductTable } from "../components/CampaignProductTable";
import { ChannelDailyChart } from "../components/ChannelDailyChart";
import { DailyTrendChart } from "../components/DailyTrendChart";
import { DigitalDetailTab } from "../components/DigitalDetailTab";
import { DigitalReportTab } from "../components/DigitalReportTab";
import { PageCostTable } from "../components/PageCostTable";
import { RevenueBreakdownCard } from "../components/RevenueBreakdownCard";
import { RevenueByChannelChart } from "../components/RevenueByChannelChart";
import { TopProductsChart } from "../components/TopProductsChart";
import { shouldGroupByMonth } from "../report-grouping";

type AdsReportDimension = "channel" | "page";

const SALE_FB_CHANNEL_CODE = "sale-fb";
// Kênh hàng mẫu KOC không tính vào báo cáo ads (đồng bộ với backend).
const KOC_CHANNEL_CODE = "koc";

type ChannelOption = { value: string; label: string };

/** Chuẩn hoá lỗi react-query về chuỗi hiển thị, cùng cách với `error`/`pageError` phía trên. */
function toErrorMessage(err: unknown): string | null {
  if (!err) return null;
  return err instanceof Error ? err.message : String(err);
}

const TODAY_RANGE = getDateRange("today");
const DEFAULT_DATE_FILTER: DateFilterValue = {
  option: "today",
  from: TODAY_RANGE.from,
  to: TODAY_RANGE.to,
};

type AdsReportPageProps = {
  channels: ChannelRow[];
  isAdmin?: boolean;
};

export function AdsReportPage({ channels, isAdmin = false }: AdsReportPageProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(DEFAULT_DATE_FILTER);
  const [selectedChannelIds, setSelectedChannelIds] = useState<number[]>([]);
  const [dimension, setDimension] = useState<AdsReportDimension>("channel");

  const pageReport = usePageCostReport({
    since: dateFilter.from,
    until: dateFilter.to,
    // Chỉ gọi khi người dùng thực sự mở chiều Page — tránh một request thừa mỗi
    // lần đổi bộ lọc ở chiều Kênh.
    enabled: dimension === "page",
  });

  const reportParams = useMemo(
    () => ({
      dateFrom: dateFilter.from,
      dateTo: dateFilter.to,
      channelIds: selectedChannelIds,
      // Mảng rỗng tường minh: tab digital ở chế độ "Tất cả sản phẩm" gọi useAdsReport
      // với đúng bộ tham số này nên dùng chung cache, không bắn thêm request.
      productIds: [] as number[],
    }),
    [dateFilter.from, dateFilter.to, selectedChannelIds],
  );
  // Cùng cách xử lý với chiều Kênh bên dưới: lỗi → xoá số liệu + hiện thông báo.
  // Bảng chi phí theo page có empty state ghi "Chưa có dữ liệu chi phí trong khoảng
  // đã chọn." — render nó khi request 500/403/mất mạng là TUYÊN BỐ ads không tiêu
  // đồng nào, do một request đã hỏng sinh ra. Số sai âm thầm còn tệ hơn số thiếu.
  const pageError = pageReport.error
    ? pageReport.error instanceof Error
      ? pageReport.error.message
      : String(pageReport.error)
    : null;

  const reportQuery = useAdsReport<AdsReportPayload>(reportParams);
  // Hành vi cũ: lỗi → xoá số liệu + hiện thông báo; đang tải → giữ số liệu cũ.
  const data: AdsReportPayload | null = reportQuery.isError ? null : (reportQuery.data ?? null);
  const error = reportQuery.error
    ? reportQuery.error instanceof Error
      ? reportQuery.error.message
      : String(reportQuery.error)
    : null;

  // Tab "Chiến dịch": hai nguồn (facebook/google) độc lập, gộp bằng mergeCampaignRows —
  // một nền tảng lỗi không được xoá số của nền tảng còn lại.
  const campaignQuery = useCampaignCostReport({
    since: dateFilter.from,
    until: dateFilter.to,
  });
  const campaignRows = useMemo(
    () =>
      mergeCampaignRows(
        campaignQuery.facebook.data?.rows ?? null,
        campaignQuery.google.data?.rows ?? null,
      ),
    [campaignQuery.facebook.data, campaignQuery.google.data],
  );

  const channelOptions = useMemo<ChannelOption[]>(
    () =>
      channels
        .filter((ch) => ch.code !== SALE_FB_CHANNEL_CODE && ch.code !== KOC_CHANNEL_CODE)
        // Backend chỉ tính kênh CÓ NV Ads gán — ẩn kênh chưa gán khỏi bộ lọc
        // để không chọn phải kênh chắc chắn rỗng.
        .filter((ch) => ch.assigned_user_count > 0)
        .map((ch) => ({ value: String(ch.id), label: ch.name || ch.code })),
    [channels],
  );
  const selectedChannelValues = useMemo(() => selectedChannelIds.map(String), [selectedChannelIds]);
  const handleChannelChange = useCallback((values: string[]) => {
    setSelectedChannelIds(values.map(Number));
  }, []);

  // useMemo để giữ identity ổn định giữa các render — các mảng này là dep của
  // nhiều useMemo trong các khối chart bên dưới.
  const channelRows = useMemo(() => data?.revenue_by_channel ?? [], [data]);
  const topProducts = useMemo(() => data?.top_products ?? [], [data]);
  const dailyRows = useMemo(() => data?.daily_breakdown ?? [], [data]);
  const provinceRows = useMemo(
    () =>
      buildProvinceBreakdownRows(
        data?.revenue_by_province ?? [],
        t("adsReport.unknownBucket", "Không rõ"),
      ),
    [data, t],
  );
  const genderRows = useMemo(
    () =>
      buildGenderBreakdownRows(data?.revenue_by_gender ?? [], {
        male: t("adsReport.genderMale", "Nam"),
        female: t("adsReport.genderFemale", "Nữ"),
        unknown: t("adsReport.unknownBucket", "Không rõ"),
      }),
    [data, t],
  );

  const kpis = useMemo(() => computeAdsKpis(channelRows, dailyRows), [channelRows, dailyRows]);

  // Khoảng lọc dài (> ~2 tháng, vd quý/năm): chart + bảng gộp dòng theo tháng.
  const groupByMonth = useMemo(
    () => shouldGroupByMonth(dateFilter.from, dateFilter.to, dailyRows),
    [dateFilter.from, dateFilter.to, dailyRows],
  );

  // "Tổng quan" tự chia thêm một cấp Tabs theo chiều Kênh/Page — chiều Page dùng
  // page grain (usePageCostReport) độc lập với reportQuery của chiều Kênh.
  const overviewPanel = (
    <div className="space-y-4 pt-4">
      <Tabs
        active={dimension}
        onChange={(key) => setDimension(key as AdsReportDimension)}
        tabs={[
          {
            key: "channel",
            label: "Theo kênh",
            content: (
              <div className="space-y-4 py-4">
                {reportQuery.isLoading ? (
                  // Lần tải đầu tiên (chưa có data cũ để keep-previous) — hiện spinner thay vì
                  // KPI 0, tránh nhìn như "không có dữ liệu". Đổi filter sau đó dùng
                  // placeholderData: keepPreviousData (queries.ts) nên isLoading không bật lại.
                  <div className="flex min-h-28 items-center justify-center rounded-xl border border-border bg-card">
                    <LogoSpinner size={36} />
                  </div>
                ) : (
                  <AdsKpiRow kpis={kpis} />
                )}

                <RevenueByChannelChart
                  channelRows={channelRows}
                  topProducts={topProducts}
                  dailyRows={dailyRows}
                />

                <DailyTrendChart rows={dailyRows} groupByMonth={groupByMonth} />

                <TopProductsChart topProducts={topProducts} />

                {isAdmin && <ChannelDailyChart dailyRows={dailyRows} groupByMonth={groupByMonth} />}

                <div className="grid gap-4 lg:grid-cols-2">
                  <RevenueBreakdownCard
                    title={t(
                      "adsReport.revenueByProvinceTitle",
                      "Đơn đã chốt & doanh thu theo tỉnh/thành",
                    )}
                    nameHeader={t("adsReport.provinceHeader", "Tỉnh/thành")}
                    rows={provinceRows}
                  />
                  <RevenueBreakdownCard
                    title={t(
                      "adsReport.revenueByGenderTitle",
                      "Đơn đã chốt & doanh thu theo giới tính",
                    )}
                    nameHeader={t("adsReport.genderHeader", "Giới tính")}
                    rows={genderRows}
                  />
                </div>
              </div>
            ),
          },
          {
            key: "page",
            label: "Theo page",
            content: (
              <div className="space-y-4 py-4">
                {pageError && (
                  <Card className="rounded-xl border-destructive/50 bg-destructive/10">
                    <CardContent className="py-4 text-sm text-destructive">{pageError}</CardContent>
                  </Card>
                )}

                {pageReport.isLoading ? (
                  <div className="flex min-h-28 items-center justify-center rounded-xl border border-border bg-card">
                    <LogoSpinner size={36} />
                  </div>
                ) : pageReport.isError ? null : (
                  // Chỉ render bảng khi request THÀNH CÔNG: bảng rỗng đọc như
                  // "không tốn đồng nào", không được dùng để biểu diễn lỗi.
                  <PageCostTable
                    rows={pageReport.data?.rows ?? []}
                    revenueAvailableFrom={pageReport.data?.revenue_available_from ?? null}
                  />
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );

  const tabs: TabItem[] = [
    {
      key: "overview",
      label: t("adsReport.tabOverview", "Tổng quan"),
      content: overviewPanel,
    },
    {
      key: "digital",
      label: t("adsReport.tabByDigital", "Báo cáo theo digital"),
      content: (
        <div className="pt-4">
          <DigitalReportTab
            dateFrom={dateFilter.from}
            dateTo={dateFilter.to}
            channelIds={selectedChannelIds}
          />
        </div>
      ),
    },
    {
      key: "digital-detail",
      label: t("adsReport.tabDigitalDetail", "Báo cáo chi tiết theo digital"),
      content: (
        <div className="pt-4">
          <DigitalDetailTab />
        </div>
      ),
    },
    {
      key: "campaign",
      label: t("adsReport.tabCampaign", "Chiến dịch"),
      content: (
        <div className="pt-4">
          <CampaignCostTable
            rows={campaignRows}
            loading={campaignQuery.facebook.isLoading || campaignQuery.google.isLoading}
            errors={{
              facebook: toErrorMessage(campaignQuery.facebook.error),
              google: toErrorMessage(campaignQuery.google.error),
            }}
            truncated={
              Boolean(campaignQuery.facebook.data?.truncated) ||
              Boolean(campaignQuery.google.data?.truncated)
            }
            // `?? null` là cố ý: lúc chưa tải xong `data` là `undefined` → thành
            // `null` → không cảnh báo. Cảnh báo sớm khi chưa có dữ liệu còn tệ hơn
            // không cảnh báo.
            accessibleAccounts={{
              facebook: campaignQuery.facebook.data?.accessible_accounts ?? null,
              google: campaignQuery.google.data?.accessible_accounts ?? null,
            }}
          />
        </div>
      ),
    },
  ];

  tabs.push({
    key: "campaign-products",
    label: t("adsReport.tabCampaignProducts", "Gán sản phẩm"),
    content: (
      <div className="pt-4">
        <CampaignProductTable dateFrom={dateFilter.from} dateTo={dateFilter.to} />
      </div>
    ),
  });

  // Tab chi tiết có bộ lọc tháng + digital riêng nên ẩn bộ lọc chung của trang.
  const showSharedFilters = activeTab !== "digital-detail";

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("topnav.tabs.adsReport")}
        description={t(
          "adsReport.hint",
          "Thống kê đơn đã chốt từ nguồn Landing — chỉ tính kênh có NV Ads phụ trách (loại trừ Sale FB, KOC).",
        )}
      />

      {showSharedFilters && (
        <Card className="rounded-xl border-border bg-card">
          <CardContent className="space-y-3 pt-6">
            <DateFilter value={dateFilter} onChange={setDateFilter} />
            <div className="flex flex-col gap-1">
              <label
                htmlFor="ads-report-channel-filter"
                className="text-xs font-medium text-muted-foreground"
              >
                {t("adsReport.channelFilterLabel", "Kênh bán hàng")}
              </label>
              <MultiSelect
                id="ads-report-channel-filter"
                options={channelOptions}
                selected={selectedChannelValues}
                onChange={handleChannelChange}
                placeholder={t("channel.all", "Tất cả kênh")}
                className="w-full"
                menuPortal
              />
            </div>
          </CardContent>
        </Card>
      )}

      {error && showSharedFilters && (
        <Card className="rounded-xl border-destructive/50 bg-destructive/10">
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
    </div>
  );
}

export default AdsReportPage;
