import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ResponsiveList } from "@/components/ui/responsive-list";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { LoyalCustomerCard } from "./LoyalCustomerCard";
import { RankMedal } from "./RankMedal";

/** Vị trí cột "Họ tên" trong `columns` — cột định danh dính trái. */
const NAME_COLUMN_INDEX = 2;

type Props = {
  rows: LoyalCustomer[];
  loading: boolean;
  canEditNote: boolean;
  onEdit: (row: LoyalCustomer) => void;
};

export function LoyalCustomersList({ rows, loading, canEditNote, onEdit }: Props) {
  const { t } = useI18n();
  const columns = [
    t("loyalCustomers.columns.index", "STT"),
    t("loyalCustomers.columns.rank", "Hạng"),
    t("loyalCustomers.columns.name", "Họ tên"),
    t("loyalCustomers.columns.phone", "SĐT"),
    t("loyalCustomers.columns.purchaseCount", "Số lần mua (đơn)"),
    t("loyalCustomers.columns.totalSpent", "Tổng chi tiêu (đ)"),
    t("loyalCustomers.columns.products", "Sản phẩm đã mua"),
    t("loyalCustomers.columns.purchaseChannel", "Kênh mua hàng"),
    t("loyalCustomers.columns.segment", "Phân khúc"),
    t("loyalCustomers.columns.lastPurchase", "Ngày mua cuối"),
    t("loyalCustomers.columns.daysSinceLastPurchase", "Số ngày kể từ mua cuối"),
    t("loyalCustomers.columns.saleStaff", "Sale phụ trách"),
    t("loyalCustomers.columns.lastCareCall", "Ngày gọi chăm sóc gần nhất"),
    t("loyalCustomers.columns.saleAction", "Hành động sale cần làm ngay"),
    t("loyalCustomers.columns.specialNote", "Ghi chú đặc biệt"),
  ];
  const editLabel = t("loyalCustomers.actions.editNote", "Sửa hành động / ghi chú");

  return (
    <ResponsiveList
      items={rows}
      getKey={(row: LoyalCustomer) => row.customer_id}
      loading={loading}
      loadingText={t("common.loading", "Đang tải")}
      emptyText={t("loyalCustomers.list.empty", "Chưa có khách hàng thân thiết nào.")}
      table={
        <Table className="min-w-[1600px] [&_td]:px-3 [&_th]:px-3">
          <TableHeader>
            <TableRow>
              {columns.map((label, index) => (
                <TableHead
                  key={label}
                  className={`h-11 whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-muted-foreground ${index === NAME_COLUMN_INDEX ? "sticky-col sticky-col-edge" : ""}`}
                >
                  {label}
                </TableHead>
              ))}
              <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">
                {t("common.actions", "Hành động")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  className="py-8 text-center text-muted-foreground"
                >
                  {t("loyalCustomers.list.empty", "Chưa có khách hàng thân thiết nào.")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.customer_id} className="align-top">
                  <TableCell className="text-muted-foreground">{row.rank}</TableCell>
                  <TableCell>
                    <RankMedal rank={row.rank} />
                  </TableCell>
                  {/* Họ tên dính trái khi cuộn ngang bảng 1600px (STT/Hạng cuộn dưới). */}
                  <TableCell className="sticky-col sticky-col-edge min-w-44 font-medium text-foreground">
                    {row.full_name || "-"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-foreground">
                    {row.phone || "-"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-foreground">
                    {row.purchase_count}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-foreground">
                    {formatCurrency(row.total_spent)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.products.length > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        {row.products.map((product) => (
                          <span key={product.sku} className="whitespace-nowrap tabular-nums">
                            {formatProductLabel(product)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="max-w-[180px] whitespace-pre-wrap text-muted-foreground">
                    {formatChannels(row.purchase_channels)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {row.segment_code ? (
                      <span
                        className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                        title={row.segment_care_priority || undefined}
                      >
                        {segmentLabel(row)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(row.last_purchase_at)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-semibold ${daysSinceClassName(row.days_since_last_purchase)}`}
                    >
                      {formatDaysSince(row.days_since_last_purchase)}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-foreground">
                    {row.sale_staff_name || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(row.last_care_call_at)}
                  </TableCell>
                  <TableCell className="max-w-[220px] whitespace-pre-wrap text-foreground">
                    {row.sale_action || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="max-w-[220px] whitespace-pre-wrap text-foreground">
                    {row.special_note || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      title={editLabel}
                      aria-label={editLabel}
                      size="icon-sm"
                      variant="outline"
                      className="border-border bg-background text-primary hover:bg-accent hover:text-accent-foreground"
                      onClick={() => onEdit(row)}
                      disabled={!canEditNote}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      }
      renderCard={(row: LoyalCustomer) => (
        <LoyalCustomerCard row={row} canEditNote={canEditNote} onEdit={onEdit} />
      )}
    />
  );
}
