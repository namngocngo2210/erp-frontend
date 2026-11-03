import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { MultiSelect } from "@/components/ui/multi-select";
import { useI18n } from "@/i18n";
import {
  type AdsPlatform,
  type CampaignCostRow,
  computeCpc,
  computeCpm,
  computeCtr,
} from "@/lib/api/ads_campaign_report";
import { matchesSearchTerm } from "@/lib/text-search";

import { formatAdsCurrency } from "../report-grouping";
import { formatNumber } from "@/lib/format";

type PlatformFilter = "all" | AdsPlatform;

type CampaignCostTableProps = {
  rows: CampaignCostRow[];
  loading: boolean;
  /** Lỗi theo từng nền tảng — một nền tảng hỏng vẫn hiện bảng của nền tảng còn lại. */
  errors: { facebook: string | null; google: string | null };
  /** true = backend đã cắt bớt dòng (quá MAX_ROWS). */
  truncated: boolean;
  /** Số TKQC user được xem theo từng nguồn; null = không bị lọc. */
  accessibleAccounts?: { facebook: number | null; google: number | null };
};

export function CampaignCostTable({
  rows,
  loading,
  errors,
  truncated,
  accessibleAccounts = { facebook: null, google: null },
}: CampaignCostTableProps) {
  const { t } = useI18n();
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const accountOptions = useMemo(() => {
    const names = new Set<string>();
    for (const row of rows) {
      if (row.account_name) names.add(row.account_name);
    }
    return Array.from(names)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ value: name, label: name }));
  }, [rows]);

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (platformFilter !== "all" && row.platform !== platformFilter) return false;
        if (selectedAccounts.length > 0 && !selectedAccounts.includes(row.account_name)) {
          return false;
        }
        if (!matchesSearchTerm(searchTerm, [row.campaign_name, row.account_name])) {
          return false;
        }
        return true;
      }),
    [rows, platformFilter, selectedAccounts, searchTerm],
  );

  const platformLabel = (platform: AdsPlatform) =>
    platform === "facebook"
      ? t("adsReport.platformFacebook", "Facebook")
      : t("adsReport.platformGoogle", "Google");

  // Chỉ cảnh báo khi CẢ HAI nguồn đều báo 0: người chỉ chạy Google mà không chạy
  // Facebook vẫn có TKQC, cảnh báo lúc đó là sai.
  const hasNoAssignedAccounts =
    accessibleAccounts.facebook === 0 && accessibleAccounts.google === 0;

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        {errors.facebook && (
          <Card className="rounded-xl border-destructive/50 bg-destructive/10">
            <CardContent className="py-3 text-sm text-destructive">{errors.facebook}</CardContent>
          </Card>
        )}
        {errors.google && (
          <Card className="rounded-xl border-destructive/50 bg-destructive/10">
            <CardContent className="py-3 text-sm text-destructive">{errors.google}</CardContent>
          </Card>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="campaign-platform-filter"
              className="text-xs font-medium text-muted-foreground"
            >
              {t("adsReport.platformFilterLabel", "Nền tảng")}
            </label>
            <select
              id="campaign-platform-filter"
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value as PlatformFilter)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">{t("adsReport.platformAll", "Tất cả")}</option>
              <option value="facebook">{t("adsReport.platformFacebook", "Facebook")}</option>
              <option value="google">{t("adsReport.platformGoogle", "Google")}</option>
            </select>
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label
              htmlFor="campaign-account-filter"
              className="text-xs font-medium text-muted-foreground"
            >
              {t("adsReport.accountFilterLabel", "Tài khoản quảng cáo")}
            </label>
            <MultiSelect
              id="campaign-account-filter"
              options={accountOptions}
              selected={selectedAccounts}
              onChange={setSelectedAccounts}
              placeholder={t("adsReport.accountFilterPlaceholder", "Tất cả tài khoản")}
              className="w-full"
              menuPortal
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="campaign-search" className="text-xs font-medium text-muted-foreground">
              {t("adsReport.campaignSearchLabel", "Tìm chiến dịch")}
            </label>
            <Input
              id="campaign-search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("adsReport.campaignSearchPlaceholder", "Tên chiến dịch hoặc TKQC")}
              className="h-9"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-28 items-center justify-center rounded-xl border border-border bg-card">
            <LogoSpinner size={36} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">
                    {t("adsReport.platformHeader", "Nền tảng")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    {t("adsReport.accountHeader", "Tài khoản QC")}
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    {t("adsReport.campaignHeader", "Chiến dịch")}
                  </th>
                  <th className="px-3 py-2 text-center font-medium">
                    {t("adsReport.costHeader", "Chi phí")}
                  </th>
                  <th className="px-3 py-2 text-center font-medium">
                    {t("adsReport.impressionsHeader", "Hiển thị")}
                  </th>
                  <th className="px-3 py-2 text-center font-medium">
                    {t("adsReport.clicksHeader", "Click")}
                  </th>
                  <th className="px-3 py-2 text-center font-medium">
                    {t("adsReport.ctrHeader", "CTR")}
                  </th>
                  <th className="px-3 py-2 text-center font-medium">
                    {t("adsReport.cpmHeader", "CPM")}
                  </th>
                  <th className="px-3 py-2 text-center font-medium">
                    {t("adsReport.cpcHeader", "CPC")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const cpm = computeCpm(row.cost, row.impressions);
                  const cpc = computeCpc(row.cost, row.clicks);
                  const ctr = computeCtr(row.clicks, row.impressions);
                  return (
                    <tr
                      key={`${row.platform}-${row.campaign_id || "__unknown__"}`}
                      className="border-b border-border/40 last:border-b-0"
                    >
                      <td className="px-3 py-1.5">
                        <Badge variant={row.platform === "facebook" ? "info" : "success"}>
                          {platformLabel(row.platform)}
                        </Badge>
                      </td>
                      <td className="px-3 py-1.5 text-xs">{row.account_name}</td>
                      <td className="px-3 py-1.5 text-xs">{row.campaign_name}</td>
                      <td className="px-3 py-1.5 text-center text-xs tabular-nums">
                        {formatAdsCurrency(Number(row.cost))}
                      </td>
                      <td className="px-3 py-1.5 text-center text-xs tabular-nums">
                        {formatNumber(row.impressions)}
                      </td>
                      <td className="px-3 py-1.5 text-center text-xs tabular-nums">
                        {formatNumber(row.clicks)}
                      </td>
                      <td className="px-3 py-1.5 text-center text-xs tabular-nums">
                        {ctr === null
                          ? "—"
                          : `${formatNumber(ctr, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`}
                      </td>
                      <td className="px-3 py-1.5 text-center text-xs tabular-nums">
                        {cpm === null ? "—" : formatAdsCurrency(cpm)}
                      </td>
                      <td className="px-3 py-1.5 text-center text-xs tabular-nums">
                        {cpc === null ? "—" : formatAdsCurrency(cpc)}
                      </td>
                    </tr>
                  );
                })}
                {filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className={`px-3 py-6 text-center text-xs ${
                        hasNoAssignedAccounts ? "text-action-warning" : "text-muted-foreground"
                      }`}
                    >
                      {/* Ba nhánh, kiểm tra theo thứ tự:
                          1. Không được gán TKQC nào (accessible_accounts = 0 ở cả hai
                             nguồn) — đây là nguyên nhân thật, phải nói trước tiên vì
                             bảng rỗng trông y hệt "không tiêu đồng nào".
                          2. rows.length > 0 nghĩa là dữ liệu gốc có, chỉ bộ lọc (nền
                             tảng/tài khoản/tìm kiếm) đang cắt hết.
                          3. Thật sự chưa có dữ liệu trong khoảng ngày đã chọn. */}
                      {hasNoAssignedAccounts
                        ? t(
                            "adsReport.campaignNoAssignedAccounts",
                            "Bạn chưa được gán tài khoản quảng cáo nào. Liên hệ quản trị để gán TKQC cho kênh bạn phụ trách.",
                          )
                        : rows.length > 0
                          ? t("adsReport.campaignNoMatch", "Không có chiến dịch nào khớp bộ lọc.")
                          : t(
                              "adsReport.campaignEmpty",
                              "Chưa có dữ liệu chiến dịch trong khoảng đã chọn.",
                            )}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}

        {truncated && (
          <p className="text-xs text-muted-foreground">
            {t("adsReport.campaignTruncated", "Đã hiển thị 1000 chiến dịch chi nhiều nhất.")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
