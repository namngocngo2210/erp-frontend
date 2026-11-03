import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { type KiotVietOrderAction } from "@/features/orders/use-orders-data";
import { useI18n } from "@/i18n";

type Translate = ReturnType<typeof useI18n>["t"];

/**
 * Menu thao tác KiotViet ở chân dialog sửa đơn (đẩy đơn, đồng bộ mã vận đơn,
 * đồng bộ trạng thái). Tự giữ state mở/đóng, ref vùng click và trạng thái đang chạy.
 */
export function OrderFormKiotVietMenu({
  t,
  open,
  submitting,
  selectedOrderId,
  onKiotVietAction,
}: {
  t: Translate;
  /** Dialog đang mở — đóng dialog thì menu tự reset. */
  open: boolean;
  submitting: boolean;
  selectedOrderId: number;
  onKiotVietAction?: (action: KiotVietOrderAction, ids: number[]) => Promise<void>;
}) {
  const [openKiotVietMenu, setOpenKiotVietMenu] = useState(false);
  const [runningKiotVietAction, setRunningKiotVietAction] = useState<KiotVietOrderAction | null>(
    null,
  );
  const kiotVietMenuRef = useRef<HTMLDivElement | null>(null);
  const canRunKiotVietAction = selectedOrderId > 0 && typeof onKiotVietAction === "function";

  useEffect(() => {
    if (!openKiotVietMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!kiotVietMenuRef.current) return;
      if (event.target instanceof Node && !kiotVietMenuRef.current.contains(event.target)) {
        setOpenKiotVietMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openKiotVietMenu]);

  useEffect(() => {
    if (open) return;
    setOpenKiotVietMenu(false);
    setRunningKiotVietAction(null);
  }, [open]);

  const handleRunKiotVietAction = useCallback(
    async (action: KiotVietOrderAction) => {
      if (!canRunKiotVietAction || !onKiotVietAction) return;
      setRunningKiotVietAction(action);
      try {
        await onKiotVietAction(action, [selectedOrderId]);
        setOpenKiotVietMenu(false);
      } finally {
        setRunningKiotVietAction(null);
      }
    },
    [canRunKiotVietAction, onKiotVietAction, selectedOrderId],
  );

  return (
    <div className="relative mr-auto" ref={kiotVietMenuRef}>
      <Button
        type="button"
        variant="outline"
        className="inline-flex items-center gap-1.5"
        aria-label="KiotViet"
        title="KiotViet"
        disabled={submitting || !canRunKiotVietAction || !!runningKiotVietAction}
        onClick={() => setOpenKiotVietMenu((previous) => !previous)}
      >
        <Store className="h-4 w-4" />
        <span>KiotViet</span>
        <ChevronDown className="h-4 w-4" />
      </Button>
      {openKiotVietMenu && (
        <div className="absolute bottom-full left-0 z-40 mb-1 w-72 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg">
          <button
            type="button"
            className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent disabled:opacity-50"
            disabled={submitting || !!runningKiotVietAction || !canRunKiotVietAction}
            onClick={() => handleRunKiotVietAction("push_selected").catch(() => null)}
          >
            {t("orders.kiotviet.pushSelected", "Đẩy đơn hàng này lên KiotViet")}
          </button>
          <button
            type="button"
            className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent disabled:opacity-50"
            disabled={submitting || !!runningKiotVietAction || !canRunKiotVietAction}
            onClick={() => handleRunKiotVietAction("sync_shipping_selected").catch(() => null)}
          >
            {t("orders.kiotviet.syncShippingSelected", "Cập nhật mã vận đơn (đơn này)")}
          </button>
          <button
            type="button"
            className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent disabled:opacity-50"
            disabled={submitting || !!runningKiotVietAction || !canRunKiotVietAction}
            onClick={() => handleRunKiotVietAction("sync_status_selected").catch(() => null)}
          >
            {t("orders.kiotviet.syncStatusSelected", "Cập nhật trạng thái (đơn này)")}
          </button>
        </div>
      )}
    </div>
  );
}
