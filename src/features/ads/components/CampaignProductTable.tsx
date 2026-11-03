import { useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Tabs } from "@/components/ui/tabs";
import { usePermission } from "@/hooks/usePermission";
import { useI18n } from "@/i18n";
import {
  type CampaignProductRow,
  accountFilterValue,
  mergeCampaignAccounts,
  mergeCampaignProductRows,
  sumUnassignedCost,
} from "@/lib/api/ads_campaign_products";
import { useAllProductOptions } from "@/features/products/queries";
import { useCampaignProducts, useSetCampaignProduct } from "../queries";
import { formatAdsCurrency } from "../report-grouping";

type CampaignProductTableProps = {
  dateFrom?: string;
  dateTo?: string;
};

const PLATFORM_LABEL: Record<CampaignProductRow["platform"], string> = {
  facebook: "Facebook",
  google: "Google",
};

const PLATFORM_CLASS: Record<CampaignProductRow["platform"], string> = {
  facebook: "bg-sky-100 text-sky-700",
  google: "bg-emerald-100 text-emerald-700",
};

/**
 * Màn hình gán chiến dịch quảng cáo ↔ sản phẩm.
 *
 * Chi phí giảm dần là thứ tự CỐ Ý: việc cần làm trước luôn là chiến dịch đang đốt
 * nhiều tiền nhất mà chưa gán ai. Ô "Chi phí chưa gán" phía trên chính là con số sẽ
 * nằm ở dòng "Chưa gán chiến dịch" của báo cáo digital — gán hết thì nó về 0.
 */
export function CampaignProductTable({ dateFrom, dateTo }: CampaignProductTableProps) {
  const { t } = useI18n();
  const can = usePermission();
  const canEdit = can("ads-report:edit");

  const [assigned, setAssigned] = useState<string>("no");
  const [keyword, setKeyword] = useState("");
  const [account, setAccount] = useState("");

  const query = useCampaignProducts({
    since: dateFrom,
    until: dateTo,
    assigned,
    q: keyword,
    account,
  });
  const rows = useMemo(
    () =>
      mergeCampaignProductRows(query.facebook.data?.rows ?? null, query.google.data?.rows ?? null),
    [query.facebook.data, query.google.data],
  );
  const unassignedCost = useMemo(
    () => sumUnassignedCost([query.facebook.data, query.google.data]),
    [query.facebook.data, query.google.data],
  );

  /**
   * Ô lọc TKQC gộp cả hai nền tảng. Nhãn kèm tên nền tảng vì tên TKQC hai bên đặt
   * độc lập nhau, trùng tên là chuyện bình thường.
   */
  const accountOptions = useMemo(
    () =>
      mergeCampaignAccounts([query.facebook.data, query.google.data]).map((item) => ({
        value: accountFilterValue(item),
        label: `${PLATFORM_LABEL[item.platform]} · ${item.name}`,
      })),
    [query.facebook.data, query.google.data],
  );

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

  const mutation = useSetCampaignProduct();
  const [pendingId, setPendingId] = useState<string>("");

  const handleChange = (row: CampaignProductRow, value: string) => {
    setPendingId(`${row.platform}-${row.id}`);
    mutation.mutate(
      { platform: row.platform, id: row.id, productId: value ? Number(value) : null },
      { onSettled: () => setPendingId("") },
    );
  };

  const loading = query.facebook.isLoading || query.google.isLoading;
  const errors = [query.facebook.error, query.google.error].filter(Boolean);

  return (
    <div className="space-y-4">
      <Card className="rounded-xl border-border bg-card">
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Tabs
              active={assigned}
              onChange={setAssigned}
              tabs={[
                { key: "no", label: "Chưa gán", content: null },
                // Danh sách soát lại: chỉ phần máy phải đoán, ngắn hơn hẳn "Đã gán".
                { key: "guess", label: "Máy đoán — cần soát", content: null },
                { key: "yes", label: "Đã gán", content: null },
                { key: "", label: "Tất cả", content: null },
              ]}
            />
          </div>
          <div className="flex flex-col gap-1 sm:w-64">
            {/* SearchableSelect không nhận prop `id`; nhãn a11y đi qua aria-label. */}
            <span className="text-xs font-medium text-muted-foreground">Tài khoản QC</span>
            <SearchableSelect
              options={accountOptions}
              value={account}
              onChange={setAccount}
              placeholder="Tất cả TKQC"
              aria-label="Tài khoản QC"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label
              htmlFor="campaign-product-search"
              className="text-xs font-medium text-muted-foreground"
            >
              Tìm theo tên chiến dịch
            </label>
            <Input
              id="campaign-product-search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="VD: BonNgamChan, MSC06…"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-border bg-card">
        <CardContent className="pt-6">
          <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <span className="text-muted-foreground">
              Chi phí chưa gán:{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {formatAdsCurrency(unassignedCost)}
              </span>
            </span>
            {!canEdit && (
              <span className="text-xs text-muted-foreground">
                Bạn chỉ có quyền xem — việc gán sản phẩm do phòng Ads thực hiện.
              </span>
            )}
          </div>

          {errors.length > 0 && (
            <p className="mb-3 text-sm text-destructive">
              {errors.map((error) => (error as Error).message).join(" · ")}
            </p>
          )}

          {loading ? (
            <div className="flex min-h-40 items-center justify-center">
              <LogoSpinner size={36} />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("adsReport.empty", "Chưa có dữ liệu.")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table data-slot="table" className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Nền tảng</th>
                    <th className="px-3 py-2 font-medium">Tài khoản QC</th>
                    <th className="px-3 py-2 font-medium">Chiến dịch</th>
                    <th className="px-3 py-2 text-right font-medium">Chi phí</th>
                    <th className="px-3 py-2 font-medium">Sản phẩm</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const key = `${row.platform}-${row.id}`;
                    return (
                      <tr key={key} className="border-b border-border/60 last:border-b-0">
                        <td className="px-3 py-2">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${PLATFORM_CLASS[row.platform]}`}
                          >
                            {PLATFORM_LABEL[row.platform]}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{row.account_name}</td>
                        <td className="px-3 py-2">
                          <div className="max-w-105 truncate" title={row.campaign_name}>
                            {row.campaign_name}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatAdsCurrency(row.cost)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <SearchableSelect
                              options={productOptions}
                              value={row.product_id ? String(row.product_id) : ""}
                              onChange={(value) => handleChange(row, value)}
                              placeholder="Chưa gán"
                              className="w-56"
                              disabled={!canEdit || pendingId === key}
                            />
                            {row.product_source === "auto" && (
                              <span
                                className="text-xs text-muted-foreground"
                                title="Máy đọc được mã SKU trong tên chiến dịch. Sửa tay sẽ được giữ nguyên ở các lượt sau."
                              >
                                tự động
                              </span>
                            )}
                            {row.product_source === "auto2" && (
                              <span
                                className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700"
                                title="Máy phải ĐOÁN: mã gốc có nhiều biến thể (chọn theo doanh thu 90 ngày), hoặc tên nhắc nhiều sản phẩm. Soát lại giúp."
                              >
                                đoán
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
