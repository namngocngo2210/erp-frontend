import { useEffect, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { DateFilter, type DateFilterValue } from "@/components/ui/date-filter";
import { PageHeader } from "@/components/ui/page-header";
import { SkeletonCards, SkeletonTable } from "@/components/ui/skeleton";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { useI18n } from "@/i18n";

import { SaleResaleTab } from "@/features/sale-report/components/SaleResaleTab";
import { SaleStaffDetailTab } from "@/features/sale-report/components/SaleStaffDetailTab";
import { SaleStaffReportTab } from "@/features/sale-report/components/SaleStaffReportTab";
import { buildDateFilterValue } from "@/features/dashboard/dashboard-utils";
import { useDashboardSummary } from "@/features/dashboard/use-dashboard-summary";
import type { DashboardPageProps } from "@/features/dashboard/types";
import {
  BombReasonsSection,
  CarrierDataSection,
  CloseRateSection,
  DataQualitySection,
  DeliveryByChannelSection,
  DeliveryByStaffSection,
  ReturnByProductSection,
  RevenueSection,
  SaleCapacitySection,
} from "@/features/dashboard/components/DashboardSections";
import { ClosedRevenueSection } from "@/features/dashboard/components/ClosedRevenueSection";
import { SaleSheetRevenueSection } from "@/features/dashboard/components/SaleSheetRevenueSection";

export function DashboardPage({ summary, loading, filters, onApplyFilters }: DashboardPageProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(() =>
    buildDateFilterValue(filters),
  );

  const { dateFrom: filterDateFrom, dateTo: filterDateTo } = filters;
  useEffect(() => {
    setDateFilter(buildDateFilterValue({ dateFrom: filterDateFrom, dateTo: filterDateTo }));
  }, [filterDateFrom, filterDateTo]);

  const handleDateChange = (next: DateFilterValue) => {
    setDateFilter(next);
    void onApplyFilters({ dateFrom: next.from ?? "", dateTo: next.to ?? "" });
  };

  const {
    performanceRows,
    performanceTotals,
    totalsReachable,
    channelQualityRows,
    channelQualityTotals,
    carrierRows,
    carrierTotal,
    deliveryByStaffRows,
    deliveryByChannelRows,
    deliveryStaffTotals,
    deliveryChannelTotals,
    bombReasons,
    bombTotal,
    returnByProductRows,
  } = useDashboardSummary(summary);

  const unknownStaffLabel = t("dashboard.unknownStaff", "Không xác định");
  const unknownChannelLabel = t("dashboard.unknownChannel", "Không xác định");

  const overviewPanel = (
    <div data-main-content className="space-y-4 pt-4">
      {loading && !summary ? (
        <div className="space-y-4">
          <SkeletonCards count={3} />
          <SkeletonTable rows={6} columns={5} className="rounded-xl border border-border bg-card" />
          <SkeletonTable rows={6} columns={5} className="rounded-xl border border-border bg-card" />
        </div>
      ) : (
        <>
          {/* Group 1 — Tỷ lệ chốt trên tổng data */}
          <CloseRateSection
            t={t}
            performanceRows={performanceRows}
            performanceTotals={performanceTotals}
            unknownStaffLabel={unknownStaffLabel}
          />

          {/* Group 2 — Năng lực Sale (mẫu số = data tiếp cận được) */}
          <SaleCapacitySection
            t={t}
            performanceRows={performanceRows}
            performanceTotals={performanceTotals}
            totalsReachable={totalsReachable}
            unknownStaffLabel={unknownStaffLabel}
          />

          {/* Group 3 — Chất lượng Data theo kênh */}
          <DataQualitySection
            t={t}
            channelQualityRows={channelQualityRows}
            channelQualityTotals={channelQualityTotals}
            unknownChannelLabel={unknownChannelLabel}
          />

          {/* Group 4 — Doanh thu */}
          <RevenueSection
            t={t}
            performanceRows={performanceRows}
            performanceTotals={performanceTotals}
            unknownStaffLabel={unknownStaffLabel}
          />

          {/* Group 5a — Hiệu quả giao hàng theo Sale */}
          <DeliveryByStaffSection
            t={t}
            deliveryByStaffRows={deliveryByStaffRows}
            deliveryStaffTotals={deliveryStaffTotals}
            unknownStaffLabel={unknownStaffLabel}
          />

          {/* Group 5b — Hiệu quả giao hàng theo Kênh */}
          <DeliveryByChannelSection
            t={t}
            deliveryByChannelRows={deliveryByChannelRows}
            deliveryChannelTotals={deliveryChannelTotals}
            unknownChannelLabel={unknownChannelLabel}
          />

          {/* Group 5c — Tỷ trọng lý do bom hàng */}
          <BombReasonsSection t={t} bombReasons={bombReasons} bombTotal={bombTotal} />

          {/* Nhóm 7 — Tỷ lệ hoàn theo sản phẩm */}
          <ReturnByProductSection
            t={t}
            returnByProductRows={returnByProductRows}
            deliveryStaffTotals={deliveryStaffTotals}
          />

          {/* Nhóm 8 — Phân bố data theo nhà mạng (đầu số SĐT) */}
          <CarrierDataSection t={t} carrierRows={carrierRows} carrierTotal={carrierTotal} />

          {/* Nhóm 9 — Data chia & doanh thu chốt theo Sale (bảng tổng kết cuối trang) */}
          <ClosedRevenueSection
            t={t}
            performanceRows={performanceRows}
            performanceTotals={performanceTotals}
            unknownStaffLabel={unknownStaffLabel}
          />

          {/* Nhóm 10 — Đơn chốt & doanh thu trước/sau hoàn theo Sale và tab Landing */}
          <SaleSheetRevenueSection
            t={t}
            rows={summary?.closed_revenue_by_staff_sheet}
            unknownStaffLabel={unknownStaffLabel}
          />
        </>
      )}
    </div>
  );

  const tabs: TabItem[] = [
    {
      key: "overview",
      label: t("saleReport.tabOverview", "Tổng quan"),
      content: overviewPanel,
    },
    {
      key: "resale",
      label: t("saleReport.tabResale", "Resale"),
      content: (
        <div className="pt-4">
          <SaleResaleTab dateFrom={dateFilter.from} dateTo={dateFilter.to} />
        </div>
      ),
    },
    {
      key: "by-sale",
      label: t("saleReport.tabBySale", "Báo cáo theo sale"),
      content: (
        <div className="pt-4">
          <SaleStaffReportTab dateFrom={dateFilter.from} dateTo={dateFilter.to} />
        </div>
      ),
    },
    {
      key: "sale-detail",
      label: t("saleReport.tabSaleDetail", "Báo cáo chi tiết theo sale"),
      content: (
        <div className="pt-4">
          <SaleStaffDetailTab />
        </div>
      ),
    },
  ];

  // Tab chi tiết có bộ lọc tháng riêng nên ẩn bộ lọc ngày chung của trang.
  const showSharedFilters = activeTab !== "sale-detail";

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("topnav.tabs.dashboard")}
        description={t(
          "dashboard.salePerformanceHint",
          "Báo cáo hiệu quả sale theo 4 nhóm chỉ số: tỷ lệ chốt, năng lực sale, chất lượng data và doanh thu.",
        )}
      />

      {showSharedFilters && (
        <Card className="rounded-xl border-border bg-card">
          <CardContent className="pt-6">
            <DateFilter value={dateFilter} onChange={handleDateChange} />
            {loading && (
              <p className="mt-3 text-xs text-muted-foreground">
                {t("dashboard.loading", "Loading...")}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
    </div>
  );
}

export default DashboardPage;
