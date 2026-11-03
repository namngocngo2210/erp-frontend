import { useMemo, useState } from "react";
import { FileDown, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DateFilter, type DateFilterValue, getDateRange } from "@/components/ui/date-filter";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { PageHeader } from "@/components/ui/page-header";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { useExportJobs } from "@/features/exports/ExportJobsProvider";
import { usePermission } from "@/hooks/usePermission";
import { AgentBreakdown } from "../components/AgentBreakdown";
import { CallQualityTable } from "../components/CallQualityTable";
import { CallScoreDetailSheet } from "../components/CallScoreDetailSheet";
import { CoverageLine } from "../components/CoverageLine";
import { CriteriaBreakdown } from "../components/CriteriaBreakdown";
import { QualityInsights } from "../components/QualityInsights";
import { QualitySummaryCards } from "../components/QualitySummaryCards";
import { QualityTrendChart } from "../components/QualityTrendChart";
import {
  useQualityAgents,
  useQualityCalls,
  useQualityFilterOptions,
  useQualitySummary,
  useQualityTrend,
} from "../queries";
import { formatNumber } from "@/lib/format";

const DEFAULT_RANGE = getDateRange("last_30_days");
const DEFAULT_DATE_FILTER: DateFilterValue = {
  option: "last_30_days",
  from: DEFAULT_RANGE.from,
  to: DEFAULT_RANGE.to,
};

/**
 * Trang Chất lượng cuộc gọi — đánh giá CHUNG cả team.
 *
 * v1 cố ý KHÔNG có bảng xếp hạng theo nhân viên: Zenify chưa trả định danh
 * nhân viên thật (agent_name rỗng, 4 agent_id dùng chung cho cả nghìn cuộc), và
 * mục tiêu ở giai đoạn này là tìm ra cả team đang yếu bước nào để sửa kịch bản
 * + chọn nội dung đào tạo. Xem docs §6.
 */
export function CallQualityPage() {
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(DEFAULT_DATE_FILTER);
  const [tab, setTab] = useState("overview");
  const [criterionFilter, setCriterionFilter] = useState<string>("");
  const [staffFilter, setStaffFilter] = useState<string>("");
  const [skuFilter, setSkuFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedScoreId, setSelectedScoreId] = useState<number | null>(null);

  /**
   * Phạm vi của CẢ TRANG. Trạng thái sale nằm ở đây chứ không riêng tab "Cuộc
   * gọi": mục đích của bộ lọc này là so chất lượng giữa các nhóm hội thoại
   * (chốt được đơn / tư vấn thêm / không nghe máy), mà muốn so thì điểm TB và
   * bảng tiêu chí phải đổi theo — lọc mỗi bảng danh sách thì không trả lời được.
   */
  const scope = useMemo(
    () => ({
      start: dateFilter.from,
      end: dateFilter.to,
      salesStatus: statusFilter || undefined,
    }),
    [dateFilter.from, dateFilter.to, statusFilter],
  );

  const summaryQuery = useQualitySummary(scope);
  const trendQuery = useQualityTrend(scope);
  const agentsQuery = useQualityAgents(scope);
  const filterOptions = useQualityFilterOptions(scope);
  const callsParams = {
    ...scope,
    criterion: criterionFilter || undefined,
    staffId: staffFilter ? Number(staffFilter) : undefined,
    sku: skuFilter || undefined,
    pageSize: 100,
  };
  const callsQuery = useQualityCalls(callsParams);

  // Xuất Excel: job chạy nền qua engine apps.exports (tiến độ + tải file do
  // ExportDock ở app shell lo). Gửi ĐÚNG bộ lọc đang áp, bỏ phân trang — file
  // luôn là toàn bộ tập khớp bộ lọc, không phải trang đang xem.
  const can = usePermission();
  const { startExport } = useExportJobs();
  const handleExport = () => {
    void startExport("call_quality", {
      filters: {
        start: dateFilter.from,
        end: dateFilter.to,
        sales_status: statusFilter || "",
        staff: staffFilter || "",
        sku: skuFilter || "",
        criterion: criterionFilter || "",
      },
    });
  };

  const staffOptions = useMemo(
    () => [
      { value: "", label: "Tất cả sale" },
      ...(filterOptions.data?.sales ?? []).map((item) => ({
        value: String(item.id),
        label: item.name,
      })),
    ],
    [filterOptions.data],
  );
  const skuOptions = useMemo(
    () => [
      { value: "", label: "Tất cả SKU" },
      ...(filterOptions.data?.skus ?? []).map((sku) => ({ value: sku, label: sku })),
    ],
    [filterOptions.data],
  );
  const statusOptions = useMemo(
    () => [
      { value: "", label: "Tất cả trạng thái" },
      ...(filterOptions.data?.sales_statuses ?? []).map((item) => ({
        value: item.code,
        label: item.label,
      })),
    ],
    [filterOptions.data],
  );
  // Chỉ 3 ô của riêng bảng. Trạng thái sale nằm ở header và chi phối cả trang
  // nên KHÔNG bị nút "Bỏ lọc" của bảng xoá — bấm nó mà điểm TB ở tab kia đổi
  // theo là hành vi bất ngờ.
  const hasTableFilter = Boolean(criterionFilter || staffFilter || skuFilter);

  const summary = summaryQuery.data;

  /** Từ bảng tiêu chí yếu → danh sách cuộc bị 0 điểm ở đúng tiêu chí đó. */
  const handleDrillDown = (criterionCode: string) => {
    setCriterionFilter(criterionCode);
    setTab("calls");
  };

  const criterionLabel = summary?.criteria.find((item) => item.code === criterionFilter)?.label;

  const tabs: TabItem[] = summary
    ? [
        {
          key: "overview",
          label: "Tổng quan",
          content: (
            <div className="space-y-4 pt-4">
              <QualitySummaryCards summary={summary} />
              <QualityInsights summary={summary} />
              <CriteriaBreakdown criteria={summary.criteria} onDrillDown={handleDrillDown} />
              <AgentBreakdown rows={agentsQuery.data ?? []} passScore={summary.pass_score} />
              <QualityTrendChart points={trendQuery.data ?? []} />
              <CoverageLine coverage={summary.coverage} />
            </div>
          ),
        },
        {
          key: "calls",
          label: "Cuộc gọi",
          content: (
            <div className="space-y-3 pt-4">
              <CallQualityTable
                rows={callsQuery.data?.items ?? []}
                loading={callsQuery.isLoading}
                passScore={summary.pass_score}
                onSelect={setSelectedScoreId}
                toolbar={
                  <div className="flex w-full flex-wrap items-center gap-2">
                    <SearchableSelect
                      options={staffOptions}
                      value={staffFilter}
                      onChange={setStaffFilter}
                      placeholder="Tất cả sale"
                      className="w-full sm:w-52"
                    />
                    <SearchableSelect
                      options={skuOptions}
                      value={skuFilter}
                      onChange={setSkuFilter}
                      placeholder="Tất cả SKU"
                      className="w-full sm:w-44"
                    />
                    {criterionFilter ? (
                      <span className="text-xs text-muted-foreground">
                        cuộc bị 0 điểm ở “{criterionLabel ?? criterionFilter}”
                      </span>
                    ) : null}
                    {hasTableFilter ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCriterionFilter("");
                          setStaffFilter("");
                          setSkuFilter("");
                        }}
                      >
                        <X className="mr-1 h-3 w-3" /> Bỏ lọc
                      </Button>
                    ) : null}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatNumber(callsQuery.data?.total ?? 0)} cuộc
                    </span>
                  </div>
                }
              />
            </div>
          ),
        },
      ]
    : [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Chất lượng cuộc gọi"
        description="Đánh giá chung cả team theo Khung kịch bản mẫu."
        actions={
          // Biến thể `inline`: preset + 2 ô ngày trên MỘT hàng, cao bằng nhau nên
          // thẳng hàng với tiêu đề. Layout dọc mặc định (có nhãn + radio) cao gấp
          // đôi khối tiêu đề nên header trông lệch.
          // Mobile: hàng này rộng ~490px — cho cuộn ngang trong chính nó thay vì
          // để tràn ra làm cả trang cuộn ngang.
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
            {/* CHỈ hàng ngày được bọc trong khối cuộn ngang. Ô chọn trạng thái
                PHẢI nằm NGOÀI: `overflow-x-auto` biến khối này thành scroll
                container, mà scroll container CẮT phần tử `absolute` con — menu
                thả xuống của SearchableSelect bị xén còn đúng một dải cao ~40px
                (chỉ thấy ô "Tìm..."), kèm thanh cuộn dọc lạ ở mép phải. Đây là
                lỗi đã xảy ra thật trên prod ngay sau MR !1389.
                jsdom KHÔNG dựng layout nên test đơn vị không bắt được — chốt
                bằng test cấu trúc bên dưới: nút trigger không được có tổ tiên
                nào mang `overflow-x-auto`. */}
            <div className="-mx-1 w-full overflow-x-auto px-1 pb-1 sm:mx-0 sm:w-auto sm:pb-0">
              <DateFilter inline value={dateFilter} onChange={setDateFilter} />
            </div>
            <SearchableSelect
              options={statusOptions}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="Tất cả trạng thái"
              className="w-full sm:w-48"
            />
            {can("call-quality:export") && (
              <Button variant="outline" size="sm" className="h-9 shrink-0" onClick={handleExport}>
                <FileDown className="mr-1.5 h-4 w-4" />
                Xuất Excel
              </Button>
            )}
          </div>
        }
      />

      {summaryQuery.isLoading || !summary ? (
        <LogoSpinner />
      ) : (
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
      )}

      <CallScoreDetailSheet scoreId={selectedScoreId} onClose={() => setSelectedScoreId(null)} />
    </div>
  );
}

export default CallQualityPage;
