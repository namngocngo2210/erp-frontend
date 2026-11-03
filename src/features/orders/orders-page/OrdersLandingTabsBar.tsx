import { useEffect, useRef } from "react";

import { useMediaQuery } from "@/hooks/use-media-query";
import { MOBILE_VIEWPORT_QUERY } from "@/lib/constants/layout";
import { SheetStatsRow } from "@/features/orders/components/SheetStatsRow";
import {
  LANDING_SHEET_TABS,
  LANDING_TABS,
  type LandingTabKey,
} from "@/features/orders/landing-tabs";

import { type OrdersFilterOverrides } from "./use-orders-filter-handlers";

/**
 * Dải tab phía trên toolbar của bảng đơn (Landing / KOC) kèm hàng thống kê
 * nhanh của 2 sheet Landing. Bấm vào một ô thống kê là một lối tắt lọc theo
 * nhóm trạng thái sale tương ứng.
 */
export function OrdersLandingTabsBar({
  isLandingPage,
  landingTab,
  onLandingTabChange,
  sheetStats,
  ordersTotalCount,
  salesStatusCounts,
  onSalesStatusChange,
  onApplyFilters,
}: {
  isLandingPage: boolean;
  landingTab: LandingTabKey;
  onLandingTabChange?: (next: LandingTabKey) => void;
  sheetStats: Record<string, number>;
  ordersTotalCount: number;
  salesStatusCounts?: Record<string, number>;
  onSalesStatusChange: (value: string[]) => void;
  onApplyFilters: (overrides?: OrdersFilterOverrides) => Promise<void>;
}) {
  const isMobileViewport = useMediaQuery(MOBILE_VIEWPORT_QUERY);
  const activeTabRef = useRef<HTMLButtonElement | null>(null);
  // Điện thoại: dải tab cuộn ngang — kéo tab đang chọn vào tầm nhìn khi đổi tab.
  useEffect(() => {
    if (!isMobileViewport) return;
    activeTabRef.current?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [isMobileViewport, landingTab]);

  return (
    <>
      <div className="mb-1.5 flex flex-wrap items-center gap-1 max-md:snap-x max-md:flex-nowrap max-md:overflow-x-auto max-md:[scrollbar-width:none]">
        {(isLandingPage ? LANDING_SHEET_TABS : LANDING_TABS).map((tab) => {
          // Trang Landing: tab mặc định ("orders") tương ứng Tổng hợp.
          const activeTabKey = isLandingPage && landingTab === "orders" ? "summary" : landingTab;
          const isActive = tab.key === activeTabKey;
          return (
            <button
              key={tab.key}
              ref={isActive ? activeTabRef : undefined}
              type="button"
              className={`inline-flex h-8 items-center max-md:shrink-0 max-md:snap-start max-md:whitespace-nowrap rounded-md border px-2.5 text-xs font-medium transition-colors ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-xs"
                  : "border-border bg-background text-foreground hover:bg-accent"
              }`}
              onClick={() => {
                if (!isActive) onLandingTabChange?.(tab.key);
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {isLandingPage && (landingTab === "sheet1" || landingTab === "sheet2") ? (
        <SheetStatsRow
          items={[
            {
              key: "total",
              label: "Tổng đơn",
              value: sheetStats.total ?? ordersTotalCount,
            },
            {
              key: "uncalled",
              label: "Mới chưa gọi",
              value: sheetStats.uncalled ?? 0,
              tone: "danger",
            },
            {
              key: "closed",
              label: "Đã chốt",
              value:
                (salesStatusCounts?.closed ?? 0) +
                (salesStatusCounts?.closed_express ?? 0) +
                (salesStatusCounts?.closed_scheduled_date ?? 0) +
                (salesStatusCounts?.created_order ?? 0),
              tone: "ok",
            },
            {
              key: "today",
              label: "Hẹn hôm nay",
              value: sheetStats.appointment_today ?? 0,
              tone: "info",
            },
            {
              key: "spam",
              label: "Spam / sai số",
              value: (salesStatusCounts?.spam ?? 0) + (salesStatusCounts?.wrong_number ?? 0),
              tone: "warn",
            },
          ]}
          onPick={(key) => {
            if (key === "closed") {
              const codes = ["closed", "closed_express", "closed_scheduled_date", "created_order"];
              onSalesStatusChange(codes);
              onApplyFilters({ salesStatus: codes }).catch(() => {});
            } else if (key === "spam") {
              const codes = ["spam", "wrong_number"];
              onSalesStatusChange(codes);
              onApplyFilters({ salesStatus: codes }).catch(() => {});
            } else if (key === "uncalled") {
              const codes = ["__empty__"];
              onSalesStatusChange(codes);
              onApplyFilters({ salesStatus: codes }).catch(() => {});
            } else if (key === "total") {
              onSalesStatusChange([]);
              onApplyFilters({ salesStatus: [] }).catch(() => {});
            }
          }}
        />
      ) : null}
    </>
  );
}
