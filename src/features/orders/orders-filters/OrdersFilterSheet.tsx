import { memo, useMemo } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ChannelStaffGroupFields,
  FlagGroupFields,
  ProductGroupFields,
  StatusGroupFields,
  TimeGroupFields,
} from "@/features/orders/orders-filters/filter-fields";
import {
  buildOrdersFilterChips,
  countChipsByGroup,
  type OrdersFilterGroup,
} from "@/features/orders/orders-filters/orders-filter-chips";
import { type OrdersFilterProps } from "@/features/orders/orders-filters/types";
import { useI18n } from "@/i18n";

type Props = OrdersFilterProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "bottom": điện thoại — ngăn kéo từ đáy, trong tầm ngón cái. */
  side?: "left" | "bottom";
};

function GroupBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
      {count}
    </span>
  );
}

/**
 * Ngăn kéo chứa đủ 23 ô lọc, chia 5 nhóm gập/mở, lưới 2 cột.
 *
 * Trượt ra từ BÊN TRÁI — đúng chỗ sidebar dọc cũ, để nhân viên không phải đổi
 * thói quen đưa mắt.
 */
function OrdersFilterSheetImpl({ open, onOpenChange, side = "left", ...props }: Props) {
  const { t } = useI18n();
  const chips = useMemo(() => buildOrdersFilterChips(props, t), [props, t]);
  const counts = useMemo(() => countChipsByGroup(chips), [chips]);

  // Nhóm đang có điều kiện thì mở sẵn; luôn mở "Thời gian" để ngăn kéo không
  // trống trơn khi chưa lọc gì. Sheet unmount lúc đóng nên tính lại mỗi lần mở.
  const defaultOpenGroups = useMemo(() => {
    const groups: OrdersFilterGroup[] = ["time", "channelStaff", "status", "flags", "product"];
    const active = groups.filter((group) => counts[group] > 0);
    return active.includes("time") ? active : ["time", ...active];
  }, [counts]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} className={side === "left" ? "sm:max-w-xl lg:max-w-2xl" : ""}>
        <SheetHeader className="pr-12">
          <SheetTitle>{t("orders.filters.title", "Bộ lọc")}</SheetTitle>
          <p className="text-xs text-muted-foreground">
            {chips.length > 0
              ? `${chips.length} ${t("orders.filters.activeSuffix", "điều kiện đang áp")} · ${t("orders.filters.applyHint", "đổi là lọc ngay")}`
              : t("orders.filters.applyHint", "đổi là lọc ngay")}
          </p>
        </SheetHeader>

        <SheetBody className="p-3">
          <Accordion type="multiple" defaultValue={defaultOpenGroups}>
            <AccordionItem value="time">
              <AccordionTrigger>
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {t("orders.filters.groupTime", "Thời gian")}
                  <GroupBadge count={counts.time} />
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <TimeGroupFields props={props} />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="channelStaff">
              <AccordionTrigger>
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {t("orders.filters.groupChannelStaff", "Kênh & Nhân sự")}
                  <GroupBadge count={counts.channelStaff} />
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ChannelStaffGroupFields props={props} />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="status">
              <AccordionTrigger>
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {t("orders.filters.groupStatus", "Trạng thái")}
                  <GroupBadge count={counts.status} />
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <StatusGroupFields props={props} />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="flags">
              <AccordionTrigger>
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {t("orders.filters.groupFlags", "Cờ Có/Không")}
                  <GroupBadge count={counts.flags} />
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                  <FlagGroupFields props={props} />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="product">
              <AccordionTrigger>
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {t("orders.filters.groupProduct", "Sản phẩm")}
                  <GroupBadge count={counts.product} />
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ProductGroupFields props={props} />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </SheetBody>

        <SheetFooter className="sm:justify-between">
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {t("orders.filters.groupOpenHint", "Nhóm có điều kiện được mở sẵn")}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={props.onClearFilters}>
            {t("orders.filters.clear")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export const OrdersFilterSheet = memo(OrdersFilterSheetImpl);
