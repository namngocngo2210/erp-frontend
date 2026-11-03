import { useCallback, useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { useI18n } from "@/i18n";
import { type AdsReportPayload } from "../ads-report-selectors";
import { buildDigitalProductRows, buildDigitalRows } from "../digital-report-selectors";
import { useAdsDigitalProducts, useAdsReport } from "../queries";
import { computeDailyTotals, formatAdsCurrency } from "../report-grouping";
import { type DigitalRowExpansion, DigitalMetricTable } from "./DigitalMetricTable";
import { DigitalProductFilter, UnassignedCostNote } from "./DigitalProductFilter";

type DigitalReportTabProps = {
  dateFrom?: string;
  dateTo?: string;
  channelIds: number[];
};

/**
 * Tab "Báo cáo theo digital" — mỗi hàng là một kênh, dùng bộ lọc chung của trang cộng
 * thêm ô lọc sản phẩm riêng.
 *
 * Tab tự gọi `useAdsReport` thay vì nhận `dailyRows` từ trang: khi KHÔNG lọc sản phẩm,
 * tham số trùng hệt query của trang nên react-query dùng lại cache, không phát sinh
 * request thừa; khi có lọc thì tab cần payload riêng mà tab Tổng quan không được đổi
 * số theo.
 */
export function DigitalReportTab({ dateFrom, dateTo, channelIds }: DigitalReportTabProps) {
  const { t } = useI18n();
  const [productId, setProductId] = useState("");

  const productIds = useMemo(() => (productId ? [Number(productId)] : []), [productId]);
  const query = useAdsReport<AdsReportPayload>({
    dateFrom,
    dateTo,
    channelIds,
    productIds,
  });
  const data = query.isError ? null : (query.data ?? null);
  const dailyRows = useMemo(() => data?.daily_breakdown ?? [], [data]);
  const rows = useMemo(() => buildDigitalRows(dailyRows), [dailyRows]);
  const totals = useMemo(() => computeDailyTotals(dailyRows), [dailyRows]);

  // Bung theo sản phẩm: tải LƯỜI — chỉ gọi khi đã bung ít nhất một kênh.
  const [expandedKeys, setExpandedKeys] = useState<ReadonlySet<string>>(() => new Set());
  const toggleRow = useCallback((key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }, []);
  const productsQuery = useAdsDigitalProducts({
    dateFrom,
    dateTo,
    channelIds,
    productIds,
    group: "channel",
    enabled: expandedKeys.size > 0,
  });
  const productRows = useMemo(
    () => (productsQuery.isError ? [] : (productsQuery.data?.rows ?? null)),
    [productsQuery.isError, productsQuery.data],
  );
  const unassignedLabel = t("adsReport.unassignedCampaign", "Chưa gán chiến dịch");
  const getExpansion = useCallback(
    (row: (typeof rows)[number]): DigitalRowExpansion =>
      productRows === null
        ? null
        : buildDigitalProductRows(productRows, row, { channelKey: row.key }, unassignedLabel),
    [productRows, unassignedLabel],
  );

  const error = query.error
    ? query.error instanceof Error
      ? query.error.message
      : String(query.error)
    : null;

  return (
    <div className="space-y-4">
      <Card className="rounded-xl border-border bg-card">
        <CardContent className="pt-6">
          <DigitalProductFilter
            id="digital-report-product"
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
          {query.isLoading ? (
            <div className="flex min-h-40 items-center justify-center">
              <LogoSpinner size={36} />
            </div>
          ) : (
            <>
              <DigitalMetricTable
                rows={rows}
                firstColumnHeader={t("adsReport.digitalHeader", "Digital")}
                expandedKeys={expandedKeys}
                onToggleRow={toggleRow}
                getExpansion={getExpansion}
              />
              {/* Chỉ ở chế độ "Tất cả sản phẩm": đã lọc 1 SP thì rổ chưa gán vô nghĩa. */}
              {!productId && (
                <UnassignedCostNote
                  totalCost={totals.totalCost}
                  assignedCost={data?.assigned_ads_cost}
                  formatCurrency={formatAdsCurrency}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
