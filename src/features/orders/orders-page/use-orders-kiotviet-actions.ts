import { useCallback, useState } from "react";
import { toast } from "sonner";

import { type KiotVietPrecheckState } from "@/features/orders/KiotVietPrecheckDialog";
import {
  type KiotVietJobLogRow,
  type KiotVietOrderAction,
  type KiotVietOrderPrecheckResult,
} from "@/features/orders/use-orders-data";
import { useI18n } from "@/i18n";

type Translate = ReturnType<typeof useI18n>["t"];

type UseOrdersKiotVietActionsArgs = {
  t: Translate;
  onFetchKiotVietLogs: () => Promise<KiotVietJobLogRow[]>;
  onKiotVietPrecheck: (
    action: KiotVietOrderAction,
    ids: number[],
  ) => Promise<KiotVietOrderPrecheckResult>;
  onKiotVietAction: (action: KiotVietOrderAction, ids: number[]) => Promise<void>;
};

/**
 * Cụm thao tác KiotViet của trang đơn hàng: precheck trước khi đẩy, đẩy lại từng
 * đơn lỗi, và hộp thoại lịch sử job. Gom lại một chỗ vì 3 phần này chỉ dùng lẫn
 * nhau (kết quả precheck quyết định modal, modal quyết định lần đẩy đơn lẻ).
 */
export function useOrdersKiotVietActions({
  t,
  onFetchKiotVietLogs,
  onKiotVietPrecheck,
  onKiotVietAction,
}: UseOrdersKiotVietActionsArgs) {
  const [kiotVietLogsOpen, setKiotVietLogsOpen] = useState(false);
  const [kiotVietLogsLoading, setKiotVietLogsLoading] = useState(false);
  const [kiotVietLogs, setKiotVietLogs] = useState<KiotVietJobLogRow[]>([]);
  const [kiotVietPrecheckDialog, setKiotVietPrecheckDialog] =
    useState<KiotVietPrecheckState | null>(null);
  const [kiotVietSinglePushOrderId, setKiotVietSinglePushOrderId] = useState<number | null>(null);

  const isPushAction = useCallback(
    (action: KiotVietOrderAction) => action === "push_selected" || action === "push_unsent",
    [],
  );

  const handleOpenKiotVietLogs = useCallback(async () => {
    setKiotVietLogsOpen(true);
    setKiotVietLogsLoading(true);
    try {
      const data = await onFetchKiotVietLogs();
      setKiotVietLogs(data);
    } catch {
      toast.error(t("orders.toast.kiotvietLogsFailed", "Không thể tải lịch sử thao tác KiotViet."));
    } finally {
      setKiotVietLogsLoading(false);
    }
  }, [onFetchKiotVietLogs, t]);

  const handleKiotVietAction = useCallback(
    async (action: KiotVietOrderAction, ids: number[]) => {
      const normalizedIds = Array.from(
        new Set(
          ids
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value) && value > 0)
            .map((value) => Math.trunc(value)),
        ),
      );
      if (normalizedIds.length === 0) return;

      if (!isPushAction(action)) {
        await onKiotVietAction(action, normalizedIds);
        return;
      }

      const precheckResult = await onKiotVietPrecheck(action, normalizedIds);
      const validOrderIds = Array.isArray(precheckResult?.valid_order_ids)
        ? precheckResult.valid_order_ids
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value) && value > 0)
            .map((value) => Math.trunc(value))
        : [];
      const invalidOrders = Array.isArray(precheckResult?.invalid_orders)
        ? precheckResult.invalid_orders
        : [];
      const inputCount =
        typeof precheckResult?.input_count === "number"
          ? precheckResult.input_count
          : normalizedIds.length;

      if (invalidOrders.length > 0) {
        setKiotVietPrecheckDialog({
          action,
          inputCount,
          validOrderIds,
          invalidOrders,
        });
        // Push valid orders immediately, show modal only for invalid ones
        if (validOrderIds.length > 0) {
          void onKiotVietAction(action, validOrderIds);
        }
        return;
      }

      if (validOrderIds.length === 0) {
        toast.warning(
          t(
            "orders.toast.kiotvietPrecheckNoValid",
            "Không có đơn hợp lệ để đẩy KiotViet ({inputCount} đơn đã chọn).",
          ).replace("{inputCount}", String(inputCount)),
        );
        return;
      }

      await onKiotVietAction(action, validOrderIds);
    },
    [isPushAction, onKiotVietAction, onKiotVietPrecheck, t],
  );

  const handlePushSingleInvalidOrder = useCallback(
    async (orderId: number) => {
      if (!kiotVietPrecheckDialog) return;
      const normalizedOrderId = Math.trunc(Number(orderId));
      if (!Number.isFinite(normalizedOrderId) || normalizedOrderId <= 0) return;

      try {
        setKiotVietSinglePushOrderId(normalizedOrderId);
        await onKiotVietAction(kiotVietPrecheckDialog.action, [normalizedOrderId]);
        setKiotVietPrecheckDialog((previous) => {
          if (!previous) return previous;
          const remainingInvalidOrders = previous.invalidOrders.filter(
            (item) => item.order_id !== normalizedOrderId,
          );
          if (remainingInvalidOrders.length === 0 && previous.validOrderIds.length === 0) {
            return null;
          }
          return {
            ...previous,
            invalidOrders: remainingInvalidOrders,
          };
        });
      } catch {
        // toast is handled in execute API call
      } finally {
        setKiotVietSinglePushOrderId((current) => (current === normalizedOrderId ? null : current));
      }
    },
    [kiotVietPrecheckDialog, onKiotVietAction],
  );

  return {
    kiotVietLogsOpen,
    setKiotVietLogsOpen,
    kiotVietLogsLoading,
    kiotVietLogs,
    kiotVietPrecheckDialog,
    setKiotVietPrecheckDialog,
    kiotVietSinglePushOrderId,
    setKiotVietSinglePushOrderId,
    handleOpenKiotVietLogs,
    handleKiotVietAction,
    handlePushSingleInvalidOrder,
  };
}
