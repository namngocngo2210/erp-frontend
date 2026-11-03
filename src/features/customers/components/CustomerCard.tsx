import { ChevronDown, ChevronRight, Edit, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { useI18n } from "@/i18n";
import type { CustomerProfile } from "@/lib/api/customers";

import { formatCurrency, labelOrDash } from "../customer-utils";
import { OrderHistorySubtable } from "./OrderHistorySubtable";
import type { OrderRow } from "@/features/orders/order-types";

interface CustomerCardProps {
  profile: CustomerProfile;
  canManageUsers: boolean;
  selected: boolean;
  onToggleSelect: (id: number) => void;
  isExpanded: boolean;
  ordersLoading: boolean;
  orders: OrderRow[];
  onToggleExpand: (id: number) => void;
  onEdit: (profile: CustomerProfile) => void;
  onDelete: (profile: CustomerProfile) => void;
}

export function CustomerCard({
  profile,
  canManageUsers,
  selected,
  onToggleSelect,
  isExpanded,
  ordersLoading,
  orders,
  onToggleExpand,
  onEdit,
  onDelete,
}: CustomerCardProps) {
  const { t } = useI18n();
  const id = profile.identity.id;

  const segmentText = profile.segment.segment_code
    ? profile.segment.segment_name
      ? `${profile.segment.segment_code} - ${profile.segment.segment_name}`
      : profile.segment.segment_code
    : "-";

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {profile.identity.full_name || "-"}
          </p>
          <p className="text-xs text-muted-foreground">{profile.identity.code || "-"}</p>
          <p className="text-xs text-muted-foreground">{profile.identity.phone || "-"}</p>
        </div>
        {canManageUsers && (
          <input
            className="mt-1 size-3.5 shrink-0"
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(id)}
            aria-label={t("customers.actions.selectRow", "Chọn hàng")}
          />
        )}
      </div>

      <dl className="mt-2 space-y-1 text-xs">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{t("customers.profile.segment", "Phân khúc")}</dt>
          <dd className="text-right text-primary">{segmentText}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">
            {t("customers.profile.totalOrders", "Tổng đơn")}
          </dt>
          <dd className="text-right font-medium">{profile.purchase.total_orders}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">
            {t("customers.profile.totalSpent", "Tổng chi tiêu")}
          </dt>
          <dd className="text-right font-semibold">
            {formatCurrency(profile.purchase.total_spent)}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">
            {t("customers.profile.salesStatus", "Trạng thái sale")}
          </dt>
          <dd className="text-right">
            {labelOrDash(
              profile.latest_order.sales_status_label,
              profile.latest_order.sales_status_code,
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap justify-end gap-1">
        <Button size="sm" variant="outline" onClick={() => onToggleExpand(id)}>
          {isExpanded ? (
            <ChevronDown className="mr-1 h-4 w-4" />
          ) : (
            <ChevronRight className="mr-1 h-4 w-4" />
          )}
          {t("customers.profile.orderHistory", "Lịch sử mua hàng")}
        </Button>
        {canManageUsers && (
          <>
            <Button
              title={t("common.edit", "Sửa")}
              aria-label={t("common.edit", "Sửa")}
              size="icon-sm"
              variant="outline"
              className="border-border bg-background text-primary hover:bg-accent hover:text-accent-foreground"
              onClick={() => onEdit(profile)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              title={t("common.delete", "Xóa")}
              aria-label={t("common.delete", "Xóa")}
              size="icon-sm"
              variant="outline"
              className="border-border bg-background text-destructive hover:bg-accent hover:text-destructive-foreground"
              onClick={() => onDelete(profile)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {isExpanded && (
        <div className="mt-3 border-t border-border pt-3">
          {ordersLoading ? (
            <div className="flex justify-center py-6">
              <LogoSpinner size={24} label={t("common.loading", "Đang tải")} className="mx-auto" />
            </div>
          ) : (
            <OrderHistorySubtable orders={orders} />
          )}
        </div>
      )}
    </div>
  );
}
