import { useCallback, useEffect, useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { MonthPicker, currentMonth } from "@/components/ui/month-picker";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useI18n } from "@/i18n";
import { useAdsDigitalProducts, useAdsReport } from "../queries";
import { type AdsReportPayload } from "../ads-report-selectors";
import {
  buildDigitalDailyRows,
  buildDigitalProductRows,
  listDigitalOptions,
  monthRange,
} from "../digital-report-selectors";
import { type DigitalRowExpansion, DigitalMetricTable } from "./DigitalMetricTable";
import { DigitalProductFilter } from "./DigitalProductFilter";

/**
 * Tab "Báo cáo chi tiết theo digital" — chọn 1 kênh + 1 tháng, mỗi hàng là một
 * ngày trong tháng đó.
 *
 * Bộ lọc tháng CỐ Ý độc lập với `DateFilter` của trang (yêu cầu là xem trọn một
 * tháng), nên tab này gọi query riêng thay vì dùng lại payload của tab tổng quan.
 */
export function DigitalDetailTab() {
  const { t } = useI18n();
  const [month, setMonth] = useState<string>(() => currentMonth());
  const [channelKey, setChannelKey] = useState<string>("");
  const [productId, setProductId] = useState("");

  const range = useMemo(() => monthRange(month), [month]);
  const productIds = useMemo(() => (productId ? [Number(productId)] : []), [productId]);
  const reportQuery = useAdsReport<AdsReportPayload>({
    dateFrom: range.from,
    dateTo: range.to,
    channelIds: [],
    productIds,
  });
  const dailyRows = useMemo(
    () => (reportQuery.isError ? [] : (reportQuery.data?.daily_breakdown ?? [])),
    [reportQuery.isError, reportQuery.data],
  );

  const options = useMemo(() => listDigitalOptions(dailyRows), [dailyRows]);
  // Chọn sẵn kênh đầu tiên để bảng không trống khi vừa mở tab; giữ nguyên lựa
  // chọn cũ nếu kênh đó vẫn có trong tháng mới.
  useEffect(() => {
    if (options.length === 0) return;
    setChannelKey((prev) =>
      prev && options.some((o) => o.value === prev) ? prev : options[0].value,
    );
  }, [options]);

  const rows = useMemo(
    () => (channelKey ? buildDigitalDailyRows(dailyRows, channelKey) : []),
    [dailyRows, channelKey],
  );

  // Bung một hàng NGÀY ra các sản phẩm của đúng ngày đó (chốt 2026-08-24).
  const [expandedKeys, setExpandedKeys] = useState<ReadonlySet<string>>(() => new Set());
  const toggleRow = useCallback((key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }, []);
  // Đổi kênh/tháng thì phần đang bung không còn nghĩa — đóng hết cho khỏi hiểu nhầm.
  useEffect(() => setExpandedKeys(new Set()), [channelKey, month]);
  // Hẹp phạm vi về đúng kênh đang xem: bảng chỉ dùng dữ liệu của kênh đó, kéo cả
  // tháng của mọi kênh là phí payload.
  const expandChannelIds = useMemo(
    () => (Number.isFinite(Number(channelKey)) && channelKey ? [Number(channelKey)] : []),
    [channelKey],
  );
  const productsQuery = useAdsDigitalProducts({
    dateFrom: range.from,
    dateTo: range.to,
    channelIds: expandChannelIds,
    productIds,
    group: "day",
    enabled: expandedKeys.size > 0 && expandChannelIds.length > 0,
  });
  // Kênh không phải id số (backend trả channel_id null) thì không có gì để bung —
  // trả mảng rỗng chứ không phải null, kẻo phần bung quay vòng tải mãi mãi.
  const productRows = useMemo(
    () =>
      productsQuery.isError || expandChannelIds.length === 0
        ? []
        : (productsQuery.data?.rows ?? null),
    [productsQuery.isError, productsQuery.data, expandChannelIds],
  );
  const unassignedLabel = t("adsReport.unassignedCampaign", "Chưa gán chiến dịch");
  const getExpansion = useCallback(
    (row: (typeof rows)[number]): DigitalRowExpansion =>
      productRows === null || !channelKey
        ? null
        : buildDigitalProductRows(productRows, row, { channelKey, date: row.key }, unassignedLabel),
    [productRows, channelKey, unassignedLabel],
  );

  const error = reportQuery.error
    ? reportQuery.error instanceof Error
      ? reportQuery.error.message
      : String(reportQuery.error)
    : null;

  return (
    <div className="space-y-4">
      <Card className="rounded-xl border-border bg-card">
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-end">
          <MonthPicker
            id="digital-detail-month"
            value={month}
            onChange={setMonth}
            label={t("adsReport.monthLabel", "Tháng")}
          />
          <div className="flex flex-1 flex-col gap-1">
            <label
              htmlFor="digital-detail-channel"
              className="text-xs font-medium text-muted-foreground"
            >
              {t("adsReport.digitalHeader", "Digital")}
            </label>
            <SearchableSelect
              options={options}
              value={channelKey}
              onChange={setChannelKey}
              placeholder={t("adsReport.digitalPlaceholder", "Chọn digital")}
              className="w-full"
            />
          </div>
          <DigitalProductFilter
            id="digital-detail-product"
            value={productId}
            onChange={setProductId}
          />
        </CardContent>
      </Card>

      {error && (
        <Card className="rounded-xl border-destructive/50 bg-destructive/10">
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <Card className="rounded-xl border-border bg-card">
        <CardContent className="pt-6">
          {reportQuery.isLoading ? (
            <div className="flex min-h-40 items-center justify-center">
              <LogoSpinner size={36} />
            </div>
          ) : (
            <DigitalMetricTable
              rows={rows}
              firstColumnHeader={t("adsReport.dayHeader", "Ngày")}
              expandedKeys={expandedKeys}
              onToggleRow={toggleRow}
              getExpansion={getExpansion}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
