import { memo, useCallback, useMemo, useState } from "react";

import {
  OrdersFilterBar,
  OrdersFilterButton,
} from "@/features/orders/orders-filters/OrdersFilterBar";
import { OrdersFilterSheet } from "@/features/orders/orders-filters/OrdersFilterSheet";
import { buildOrdersFilterChips } from "@/features/orders/orders-filters/orders-filter-chips";
import { type OrdersFilterProps } from "@/features/orders/orders-filters/types";
import { useI18n } from "@/i18n";

type Props = OrdersFilterProps & {
  /** Điện thoại: chỉ còn nút icon (đặt trong toolbar) + ngăn kéo từ đáy, bỏ thanh lọc ngang. */
  compact?: boolean;
};

/**
 * Bộ lọc trang đơn hàng: thanh ngang luôn hiện + ngăn kéo 22 ô mở từ bên trái.
 *
 * Thay cho sidebar dọc cũ vốn chiếm 240px bề ngang suốt phiên làm việc, trong khi
 * bộ lọc đã được lưu theo scope nên người dùng thường set một lần rồi làm việc
 * hàng giờ. Trạng thái đóng/mở ngăn kéo CỐ Ý không lưu localStorage: mở lại trang
 * mà ngăn kéo tự bung ra thì che mất bảng.
 */
function OrdersFiltersImpl({ compact = false, ...props }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const openSheet = useCallback(() => setSheetOpen(true), []);

  if (compact) {
    return <CompactOrdersFilters {...props} open={sheetOpen} onOpenChange={setSheetOpen} />;
  }

  return (
    <>
      <OrdersFilterBar {...props} onOpenSheet={openSheet} />
      <OrdersFilterSheet {...props} open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}

function CompactOrdersFilters({
  open,
  onOpenChange,
  ...props
}: OrdersFilterProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useI18n();
  // Badge đếm ĐỦ mọi điều kiện đang áp — cùng nguồn với thanh lọc desktop.
  const count = useMemo(() => buildOrdersFilterChips(props, t).length, [props, t]);
  return (
    <>
      <OrdersFilterButton count={count} onClick={() => onOpenChange(true)} iconOnly />
      <OrdersFilterSheet {...props} open={open} onOpenChange={onOpenChange} side="bottom" />
    </>
  );
}

export const OrdersFilters = memo(OrdersFiltersImpl);
