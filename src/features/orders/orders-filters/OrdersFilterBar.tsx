import { memo, useMemo } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ChannelField,
  CreatedAtField,
  SalesStatusField,
  StaffField,
} from "@/features/orders/orders-filters/filter-fields";
import {
  buildOrdersFilterChips,
  ORDERS_FILTER_BAR_KEYS,
} from "@/features/orders/orders-filters/orders-filter-chips";
import { type OrdersFilterProps } from "@/features/orders/orders-filters/types";
import { useI18n } from "@/i18n";

type Props = OrdersFilterProps & {
  onOpenSheet: () => void;
};

/**
 * Nút "Bộ lọc" + badge đếm điều kiện đang áp. `iconOnly`: bản điện thoại nằm chung
 * hàng với ô tìm kiếm nên chỉ còn icon (nhãn vẫn đọc được qua aria-label).
 */
export function OrdersFilterButton({
  count,
  onClick,
  iconOnly = false,
}: {
  count: number;
  onClick: () => void;
  iconOnly?: boolean;
}) {
  const { t } = useI18n();
  const label = t("orders.filters.title", "Bộ lọc");
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      aria-label={iconOnly ? label : undefined}
      title={iconOnly ? label : undefined}
      className={
        iconOnly
          ? "relative h-9 w-9 shrink-0 border-border bg-background p-0 text-primary hover:bg-accent"
          : "h-8 shrink-0 gap-1.5 border-border bg-background px-2.5 text-xs text-primary hover:bg-accent"
      }
    >
      <SlidersHorizontal className={iconOnly ? "h-4 w-4" : "h-3.5 w-3.5"} />
      {!iconOnly && <span>{label}</span>}
      {count > 0 && (
        <span
          className={`flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-2xs leading-none font-semibold text-primary-foreground ${
            iconOnly ? "absolute -top-1.5 -right-1.5" : ""
          }`}
        >
          {count}
        </span>
      )}
    </Button>
  );
}

/**
 * Thanh lọc ngang trên đầu bảng đơn — một khối, cao đúng một dòng.
 *
 * Bốn ô dùng nhiều nhất nằm thẳng trên thanh với nhãn NẰM NGANG trước control (nhãn
 * xếp trên làm thanh cao gấp đôi và các control lệch chân nhau). Mọi control cao
 * 32px cho thẳng hàng.
 *
 * Chip chỉ dựng cho những trục KHÔNG có ô trên thanh — trục đã hiện trong ô rồi thì
 * thêm chip là cùng một điều kiện đọc hai lần. Badge trên nút vẫn đếm ĐỦ mọi điều
 * kiện đang áp.
 *
 * Dưới lg chỉ còn nút "Bộ lọc" và chip: màn hẹp không đủ chỗ cho select nhiều lựa chọn.
 */
function OrdersFilterBarImpl({ onOpenSheet, ...props }: Props) {
  const { t } = useI18n();
  const chips = useMemo(() => buildOrdersFilterChips(props, t), [props, t]);
  const extraChips = useMemo(
    () => chips.filter((chip) => !ORDERS_FILTER_BAR_KEYS.includes(chip.key)),
    [chips],
  );

  return (
    // `shrink-0`: thanh lọc là con của flex-col có `overflow-hidden`, không chốt
    // thì nó bị co lại khi bảng đơn dài thay vì để bảng tự cuộn.
    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-border bg-muted/30 px-2.5 py-2">
      <OrdersFilterButton count={chips.length} onClick={onOpenSheet} />

      <div className="hidden flex-wrap items-center gap-x-3 gap-y-2 lg:flex">
        <CreatedAtField props={props} compact />
        <ChannelField props={props} compact />
        <StaffField props={props} compact />
        <SalesStatusField props={props} compact />
      </div>

      {extraChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="hidden h-5 w-px bg-border lg:block" aria-hidden="true" />
          <span className="text-xs whitespace-nowrap text-muted-foreground">
            {t("orders.filters.extraPrefix", "Lọc thêm:")}
          </span>
          {extraChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex h-6 items-center gap-1 rounded-md border border-primary/30 bg-primary/5 pr-0.5 pl-2 text-xs text-foreground"
            >
              <span className="text-muted-foreground">{chip.label}:</span>
              <span className="max-w-40 truncate font-medium">{chip.value}</span>
              <button
                type="button"
                onClick={chip.onClear}
                aria-label={`${t("orders.filters.clearOne", "Bỏ lọc")} ${chip.label}`}
                title={`${t("orders.filters.clearOne", "Bỏ lọc")} ${chip.label}`}
                className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {chips.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={props.onClearFilters}
          className="ml-auto h-8 shrink-0 px-2 text-xs text-muted-foreground"
        >
          {t("orders.filters.clear")}
        </Button>
      )}
    </div>
  );
}

export const OrdersFilterBar = memo(OrdersFilterBarImpl);
