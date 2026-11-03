import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

import { type FilterSelectOption } from "@/features/orders/filter-types";
import { useI18n } from "@/i18n";

import { type OrdersFilterOverrides } from "./use-orders-filter-handlers";
import { formatNumber } from "@/lib/format";

type Translate = ReturnType<typeof useI18n>["t"];

/**
 * Thanh chip lọc trạng thái sale — dùng chung cho OrdersTable và board Tư vấn (sheet3).
 * Chỉ hiện ở trang Landing.
 */
export function OrdersSalesStatusChipBar({
  t,
  salesStatus,
  salesStatusOptions,
  salesStatusCounts,
  onSalesStatusChange,
  onApplyFilters,
}: {
  t: Translate;
  salesStatus: string[];
  salesStatusOptions: FilterSelectOption[];
  salesStatusCounts?: Record<string, number>;
  onSalesStatusChange: (value: string[]) => void;
  onApplyFilters: (overrides?: OrdersFilterOverrides) => Promise<void>;
}) {
  const [salesStatusBarExpanded, setSalesStatusBarExpanded] = useState(false);
  return (
    <div className="flex items-start gap-1.5">
      <div
        className={`flex min-w-0 flex-1 flex-wrap items-center gap-1.5 max-md:max-h-none max-md:flex-nowrap max-md:overflow-x-auto max-md:[scrollbar-width:none] ${
          salesStatusBarExpanded ? "" : "max-h-7 overflow-hidden"
        }`}
      >
        <button
          type="button"
          onClick={() => {
            onSalesStatusChange([]);
            onApplyFilters({ salesStatus: [] }).catch((err) => {
              console.error("filter-[salesStatus]", err);
              toast.error(t("orders.toast.fetchListFailed"));
            });
          }}
          aria-pressed={salesStatus.length === 0}
          className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors ${
            salesStatus.length === 0
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground hover:bg-accent"
          }`}
        >
          {t("status.all", "Tất cả")}
        </button>
        {salesStatusOptions.map((option) => {
          const count = salesStatusCounts?.[option.value] ?? 0;
          const active = salesStatus.includes(option.value);
          return (
            <button
              type="button"
              key={option.value}
              onClick={() => {
                const next = active
                  ? salesStatus.filter((v) => v !== option.value)
                  : [...salesStatus, option.value];
                onSalesStatusChange(next);
                onApplyFilters({ salesStatus: next }).catch((err) => {
                  console.error("filter-[salesStatus]", err);
                  toast.error(t("orders.toast.fetchListFailed"));
                });
              }}
              aria-pressed={active}
              className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-accent"
              }`}
            >
              <span>{option.label}</span>
              <span
                className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0 text-2xs font-semibold leading-tight ${
                  active
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {formatNumber(count)}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => setSalesStatusBarExpanded((prev) => !prev)}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border bg-background text-muted-foreground hover:bg-accent max-md:hidden"
        title={
          salesStatusBarExpanded
            ? t("orders.filters.collapse", "Thu gọn")
            : t("orders.filters.expand", "Mở rộng")
        }
        aria-label={
          salesStatusBarExpanded
            ? t("orders.filters.collapse", "Thu gọn")
            : t("orders.filters.expand", "Mở rộng")
        }
        aria-expanded={salesStatusBarExpanded}
      >
        {salesStatusBarExpanded ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
