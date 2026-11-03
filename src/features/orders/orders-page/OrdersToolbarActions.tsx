import { Fragment, type KeyboardEvent } from "react";
import { ArrowDownWideNarrow, ArrowUpWideNarrow, Check, Plus, Search, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { type OrdersSortValue } from "@/features/orders/use-orders-data";
import { useI18n } from "@/i18n";

import { type OrdersFilterOverrides } from "./use-orders-filter-handlers";

type Translate = ReturnType<typeof useI18n>["t"];

/**
 * Ô tìm kiếm của toolbar. Dùng chung cho bản mobile (chiếm trọn dòng) và bản
 * desktop (ẩn dưới sm) — chỉ khác class nên nhận qua prop thay vì nhân đôi markup.
 */
export function OrdersSearchInput({
  t,
  id,
  wrapperClassName,
  inputClassName,
  q,
  onSearchChange,
  onSearchKeyDown,
}: {
  t: Translate;
  id: string;
  wrapperClassName: string;
  inputClassName: string;
  q: string;
  onSearchChange: (value: string) => void;
  onSearchKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className={wrapperClassName}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        className={inputClassName}
        placeholder={t("orders.filters.search", "Tìm kiếm")}
        value={q}
        onChange={(e) => onSearchChange(e.target.value)}
        onKeyDown={onSearchKeyDown}
      />
    </div>
  );
}

/**
 * Thứ tự hiển thị trong menu sắp xếp. Nhóm theo tiêu chí (ngày tạo, ngày chốt,
 * tổng tiền) rồi mới tới chiều — đọc nhanh hơn là xen kẽ; giữa các nhóm có vạch ngăn.
 */
const ORDERS_SORT_OPTIONS: ReadonlyArray<{
  value: OrdersSortValue;
  group: "created" | "closed" | "amount";
  labelKey: string;
  fallback: string;
  /** true = giá trị lớn nhất (mới nhất / nhiều tiền nhất) đứng trước. */
  descending: boolean;
}> = [
  {
    value: "oldest",
    group: "created",
    labelKey: "orders.sort.createdOldestFirst",
    fallback: "Ngày tạo: Cũ → Mới",
    descending: false,
  },
  {
    value: "newest",
    group: "created",
    labelKey: "orders.sort.createdNewestFirst",
    fallback: "Ngày tạo: Mới → Cũ",
    descending: true,
  },
  {
    value: "closed_oldest",
    group: "closed",
    labelKey: "orders.sort.closedOldestFirst",
    fallback: "Ngày chốt: Cũ → Mới",
    descending: false,
  },
  {
    value: "closed_newest",
    group: "closed",
    labelKey: "orders.sort.closedNewestFirst",
    fallback: "Ngày chốt: Mới → Cũ",
    descending: true,
  },
  {
    value: "amount_desc",
    group: "amount",
    labelKey: "orders.sort.amountHighFirst",
    fallback: "Tổng sau giảm giá: Cao → Thấp",
    descending: true,
  },
  {
    value: "amount_asc",
    group: "amount",
    labelKey: "orders.sort.amountLowFirst",
    fallback: "Tổng sau giảm giá: Thấp → Cao",
    descending: false,
  },
];

/** Menu chọn thứ tự sắp xếp danh sách đơn (ngày tạo / ngày chốt / tổng tiền, hai chiều). */
export function OrdersSortMenu({
  t,
  sort,
  onSortChange,
  onApplyFilters,
}: {
  t: Translate;
  sort: OrdersSortValue;
  onSortChange: (value: OrdersSortValue) => void;
  onApplyFilters: (overrides?: OrdersFilterOverrides) => Promise<void>;
}) {
  const active =
    ORDERS_SORT_OPTIONS.find((option) => option.value === sort) ?? ORDERS_SORT_OPTIONS[1];
  const activeLabel = t(active.labelKey, active.fallback);
  const ActiveIcon = active.descending ? ArrowDownWideNarrow : ArrowUpWideNarrow;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 px-2.5 text-xs"
          aria-label={t("orders.sort.ariaLabel", "Sắp xếp")}
          title={activeLabel}
        >
          <ActiveIcon className="h-3.5 w-3.5" />
          <span className="hidden md:inline">{activeLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52">
        <OrdersSortMenuItems
          t={t}
          sort={sort}
          onSortChange={onSortChange}
          onApplyFilters={onApplyFilters}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Các mục chọn thứ tự sắp xếp — dùng trong menu sắp xếp desktop và gộp vào menu "⋯"
 * trên điện thoại (cùng handler, không nhân bản logic áp bộ lọc).
 */
export function OrdersSortMenuItems({
  t,
  sort,
  onSortChange,
  onApplyFilters,
  itemClassName = "gap-2 text-xs",
}: {
  t: Translate;
  sort: OrdersSortValue;
  onSortChange: (value: OrdersSortValue) => void;
  onApplyFilters: (overrides?: OrdersFilterOverrides) => Promise<void>;
  itemClassName?: string;
}) {
  return ORDERS_SORT_OPTIONS.map((option, index) => {
    const Icon = option.descending ? ArrowDownWideNarrow : ArrowUpWideNarrow;
    const isActive = option.value === sort;
    const startsGroup = index > 0 && ORDERS_SORT_OPTIONS[index - 1].group !== option.group;
    return (
      <Fragment key={option.value}>
        {startsGroup ? <DropdownMenuSeparator /> : null}
        <DropdownMenuItem
          className={itemClassName}
          onClick={() => {
            if (isActive) return;
            onSortChange(option.value);
            onApplyFilters({ sort: option.value }).catch((err) => {
              console.error("filter-[sort]", err);
              toast.error(t("orders.toast.fetchListFailed"));
            });
          }}
        >
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="flex-1">{t(option.labelKey, option.fallback)}</span>
          {isActive ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
        </DropdownMenuItem>
      </Fragment>
    );
  });
}

/** Nút mở hộp thoại nhập đơn từ Excel. */
export function OrdersImportButton({ t, onClick }: { t: Translate; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="inline-flex h-8 items-center gap-1.5 px-2.5 text-xs"
      onClick={onClick}
      aria-label={t("orders.actions.importExcel", "Nhập đơn")}
      title={t("orders.actions.importExcel", "Nhập đơn")}
    >
      <Upload className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{t("orders.actions.importExcel", "Nhập đơn")}</span>
    </Button>
  );
}

/** Nút tạo đơn mới. */
export function OrdersAddOrderButton({ t, onClick }: { t: Translate; onClick: () => void }) {
  return (
    <Button
      size="sm"
      className="h-8 bg-primary px-2.5 text-xs text-primary-foreground hover:bg-primary/90 max-md:h-9 max-md:w-9 max-md:shrink-0"
      onClick={onClick}
      aria-label={t("orders.actions.addOrder")}
      title={t("orders.actions.addOrder")}
    >
      <Plus className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{t("orders.actions.addOrder")}</span>
    </Button>
  );
}
