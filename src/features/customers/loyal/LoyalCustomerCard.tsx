import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import type { LoyalCustomer } from "@/lib/api/customers";
import {
  daysSinceClassName,
  formatChannels,
  formatCurrency,
  formatDate,
  formatDaysSince,
  formatProductLabel,
  segmentLabel,
} from "./loyal-format";
import { RankMedal } from "./RankMedal";

type Props = {
  row: LoyalCustomer;
  canEditNote: boolean;
  onEdit: (row: LoyalCustomer) => void;
};

/** Thẻ khách thân thiết cho màn hẹp (thay bảng 1600px). */
export function LoyalCustomerCard({ row, canEditNote, onEdit }: Props) {
  const { t } = useI18n();
  return (
    <div className="rounded-lg border border-border/70 bg-card p-3 shadow-xs">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <RankMedal rank={row.rank} />
          <div>
            <p className="text-xs text-muted-foreground">
              {t("loyalCustomers.columns.index", "STT")} {row.rank}
            </p>
            <p className="font-medium text-foreground">{row.full_name || "-"}</p>
            <p className="text-sm text-muted-foreground">{row.phone || "-"}</p>
          </div>
        </div>
        <Button
          size="icon-sm"
          variant="outline"
          aria-label={t("loyalCustomers.actions.editNote", "Sửa hành động / ghi chú")}
          onClick={() => onEdit(row)}
          disabled={!canEditNote}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-1.5 text-sm">
        <div>
          <span className="text-muted-foreground">
            {t("loyalCustomers.columns.purchaseCount", "Số lần mua (đơn)")}:{" "}
          </span>
          <span className="font-medium">{row.purchase_count}</span>
        </div>
        <div>
          <span className="text-muted-foreground">
            {t("loyalCustomers.columns.totalSpent", "Tổng chi tiêu (đ)")}:{" "}
          </span>
          <span className="font-semibold">{formatCurrency(row.total_spent)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">
            {t("loyalCustomers.columns.products", "Sản phẩm đã mua")}:{" "}
          </span>
          {row.products.length > 0 ? (
            <div className="mt-0.5 flex flex-col gap-0.5 tabular-nums">
              {row.products.map((product) => (
                <span key={product.sku}>{formatProductLabel(product)}</span>
              ))}
            </div>
          ) : (
            <span>-</span>
          )}
        </div>
        <div>
          <span className="text-muted-foreground">
            {t("loyalCustomers.columns.purchaseChannel", "Kênh mua hàng")}:{" "}
          </span>
          <span>{formatChannels(row.purchase_channels)}</span>
        </div>
        {row.segment_code && (
          <div>
            <span className="text-muted-foreground">
              {t("loyalCustomers.columns.segment", "Phân khúc")}:{" "}
            </span>
            <span
              className="font-medium text-primary"
              title={row.segment_care_priority || undefined}
            >
              {segmentLabel(row)}
            </span>
          </div>
        )}
        <div>
          <span className="text-muted-foreground">
            {t("loyalCustomers.columns.lastPurchase", "Ngày mua cuối")}:{" "}
          </span>
          <span>{formatDate(row.last_purchase_at)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">
            {t("loyalCustomers.columns.daysSinceLastPurchase", "Số ngày kể từ mua cuối")}:{" "}
          </span>
          <span
            className={`rounded-md px-1.5 py-0.5 text-xs font-semibold ${daysSinceClassName(row.days_since_last_purchase)}`}
          >
            {formatDaysSince(row.days_since_last_purchase)}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">
            {t("loyalCustomers.columns.saleStaff", "Sale phụ trách")}:{" "}
          </span>
          <span>{row.sale_staff_name || "-"}</span>
        </div>
        <div>
          <span className="text-muted-foreground">
            {t("loyalCustomers.columns.lastCareCall", "Ngày gọi chăm sóc gần nhất")}:{" "}
          </span>
          <span>{formatDate(row.last_care_call_at)}</span>
        </div>
        {row.sale_action && (
          <div>
            <span className="text-muted-foreground">
              {t("loyalCustomers.columns.saleAction", "Hành động sale cần làm ngay")}:{" "}
            </span>
            <span className="whitespace-pre-wrap">{row.sale_action}</span>
          </div>
        )}
        {row.special_note && (
          <div>
            <span className="text-muted-foreground">
              {t("loyalCustomers.columns.specialNote", "Ghi chú đặc biệt")}:{" "}
            </span>
            <span className="whitespace-pre-wrap">{row.special_note}</span>
          </div>
        )}
      </div>
    </div>
  );
}
