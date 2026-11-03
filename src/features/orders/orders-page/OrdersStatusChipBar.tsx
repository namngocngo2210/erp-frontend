import { useMemo } from "react";

import {
  CANCELLED_INVOICE_STATUS_VALUE,
  computeStatusChipTotal,
  nextFilterForCancelledChip,
  nextFilterForLifecycleChip,
  type StatusChipFilterState,
} from "@/features/orders/order-status-counts";
import { useI18n } from "@/i18n";
import { formatNumber } from "@/lib/format";

type Translate = ReturnType<typeof useI18n>["t"];

// Thanh chip lọc nhanh theo Order.status. 6 chip lifecycle lọc qua trường `status`;
// riêng "Đã hủy" nối vào invoice_status=2 vì trường status không lọc ra đơn hủy (BE
// luôn strip status=6). Các status ít dùng (7..13) không lên chip — vẫn lọc được qua
// panel bộ lọc.
const STATUS_CHIP_VALUES = [0, 1, 2, 3, 4, 5] as const;

function StatusChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:bg-accent"
      }`}
    >
      <span>{label}</span>
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
}

export function OrdersStatusChipBar({
  t,
  statusLabel,
  status,
  invoiceStatus,
  statusCounts,
  onApplyStatusChips,
}: {
  t: Translate;
  statusLabel: (value: string | number) => string;
  status: string[];
  invoiceStatus: string[];
  /** Số đơn theo Order.status cho thanh chip lọc trạng thái (key "6" = đã hủy). */
  statusCounts: Record<string, number>;
  onApplyStatusChips: (next: StatusChipFilterState) => void;
}) {
  // Tổng chip "Tất cả" loại key "6" (đã hủy) — xem computeStatusChipTotal
  // (bug 7.1b: cộng cả "6" thì số chip > số dòng trả về khi bấm "Tất cả").
  const statusChipTotal = useMemo(() => computeStatusChipTotal(statusCounts), [statusCounts]);
  const isCancelledChipActive = invoiceStatus.includes(CANCELLED_INVOICE_STATUS_VALUE);
  return (
    // Điện thoại: 1 hàng cuộn ngang thay vì wrap 3–4 hàng.
    <div className="flex min-w-0 flex-wrap items-center gap-1.5 max-md:flex-nowrap max-md:overflow-x-auto max-md:[scrollbar-width:none]">
      <StatusChip
        label={t("status.all", "Tất cả")}
        count={statusChipTotal}
        active={status.length === 0 && !isCancelledChipActive}
        // status_counts_for strips CẢ status lẫn invoice_status khi đếm lifecycle
        // (xem docstring backend) → panel filter invoice_status phải được xoá sạch
        // khi chọn chip lifecycle, nếu không số trên chip sẽ nhiều hơn số dòng thực
        // trả về (đếm bỏ qua invoice_status, danh sách thì áp). Xem bug 7.1c.
        onClick={() => onApplyStatusChips(nextFilterForLifecycleChip(status))}
      />
      {STATUS_CHIP_VALUES.map((value) => {
        const key = String(value);
        const active = status.includes(key);
        return (
          <StatusChip
            key={key}
            label={statusLabel(value)}
            count={statusCounts[key] ?? 0}
            active={active}
            onClick={() => onApplyStatusChips(nextFilterForLifecycleChip(status, key))}
          />
        );
      })}
      <StatusChip
        label={t("status.6", "Đã hủy")}
        count={statusCounts["6"] ?? 0}
        active={isCancelledChipActive}
        onClick={() =>
          onApplyStatusChips(
            nextFilterForCancelledChip(status, invoiceStatus, isCancelledChipActive),
          )
        }
      />
    </div>
  );
}
