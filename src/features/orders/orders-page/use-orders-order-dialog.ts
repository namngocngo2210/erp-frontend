import { useCallback, useState } from "react";
import { toast } from "sonner";

import type { OrderDialogMode } from "../OrderFormDialog";
import { prepareOrderEditSubmit } from "../order-import-format";
import type { OrderRow } from "../order-types";
import type { CreateOrderPayload } from "../use-orders-data";
import type { OrdersActions } from "./orders-page-props";

type Options = {
  t: (key: string, fallback?: string) => string;
  isLandingPage: boolean;
  canEditOrderField: (field: string) => boolean;
  onCreateOrder: OrdersActions["onCreateOrder"];
  onPatchOrder: OrdersActions["onPatchOrder"];
};

/** State + submit của dialog tạo/sửa đơn trên trang danh sách. */
export function useOrdersOrderDialog({
  t,
  isLandingPage,
  canEditOrderField,
  onCreateOrder,
  onPatchOrder,
}: Options) {
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderDialogMode, setOrderDialogMode] = useState<OrderDialogMode>("create");
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [orderSubmitting, setOrderSubmitting] = useState(false);

  const handleOpenCreate = useCallback(() => {
    // Form tải sản phẩm theo nhu cầu (server-side search) nên mở dialog ngay,
    // không chặn UI để tải toàn bộ catalog.
    setOrderDialogMode("create");
    setSelectedOrder(null);
    setOrderDialogOpen(true);
  }, []);

  // Trang Landing không còn ép order_source="landing"; nguồn lấy theo lựa chọn trong form.
  // Vẫn giữ show_orders=false để đơn không lẫn sang danh sách orders thường.
  const withLandingSource = useCallback(
    (values: CreateOrderPayload): CreateOrderPayload =>
      isLandingPage ? { ...values, show_orders: false } : values,
    [isLandingPage],
  );

  const handleSubmitOrderDialog = useCallback(
    async (values: CreateOrderPayload) => {
      if (orderDialogMode !== "create" && !selectedOrder) return;
      // Nhánh SỬA đơn: guard tiền điều kiện + strip field thiếu quyền sửa-theo-
      // field gộp trong `prepareOrderEditSubmit` (order-import-format.ts) — hàm
      // thuần, unit test riêng — để cả guard lẫn strip luôn cùng đọc `values`
      // ĐẦY ĐỦ (OrderFormDialog không tự strip trước khi gọi onSubmit nữa).
      if (orderDialogMode === "edit" && selectedOrder) {
        const prepared = prepareOrderEditSubmit(values, canEditOrderField);
        if (prepared.blocked) {
          toast.error(t("orders.toast.selectChannelPhone"));
          return;
        }
        setOrderSubmitting(true);
        try {
          await onPatchOrder(selectedOrder.id, prepared.payload);
          setOrderDialogOpen(false);
          setSelectedOrder(null);
        } finally {
          setOrderSubmitting(false);
        }
        return;
      }
      // Nhánh TẠO đơn: cùng guard kênh/SĐT, nhưng KHÔNG strip — quyền field
      // không áp cho luồng tạo.
      if (!values.channel_code || !values.phone.trim()) {
        toast.error(t("orders.toast.selectChannelPhone"));
        return;
      }
      setOrderSubmitting(true);
      try {
        await onCreateOrder(withLandingSource(values));
        setOrderDialogOpen(false);
        setSelectedOrder(null);
      } finally {
        setOrderSubmitting(false);
      }
    },
    [
      canEditOrderField,
      onCreateOrder,
      onPatchOrder,
      orderDialogMode,
      selectedOrder,
      t,
      withLandingSource,
    ],
  );

  return {
    orderDialogOpen,
    setOrderDialogOpen,
    orderDialogMode,
    selectedOrder,
    orderSubmitting,
    handleOpenCreate,
    handleSubmitOrderDialog,
  };
}
