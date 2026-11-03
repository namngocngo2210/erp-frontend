import { useEffect, useState } from "react";

import { useKshipDelivery } from "@/features/orders/use-kship-delivery";
import { useKshipNotePresets } from "@/features/orders/use-kship-note-presets";
import { useKshipSenderAddresses } from "@/features/orders/queries";
import { type OrderRow } from "@/features/orders/order-types";
import { type KshipOptionsPayload } from "@/features/orders/use-orders-data";
import { useI18n } from "@/i18n";

type Translate = ReturnType<typeof useI18n>["t"];

type UseOrdersKshipDialogsArgs = {
  rows: OrderRow[];
  t: Translate;
  onFetchKshipOptions: (ids: number[]) => Promise<KshipOptionsPayload>;
  onCreateKshipDelivery: (
    ids: number[],
    providerCode: string,
    serviceCode: string,
    notes?: Record<number, string>,
    senderAddressId?: number | null,
  ) => Promise<{ created_count: number; detail: string }>;
};

/**
 * Gom cụm hộp thoại KShip của trang đơn: tạo mã vận đơn, quản lý mẫu ghi chú và
 * quản lý địa chỉ gửi. Ba phần này chỉ có nghĩa khi đi cùng nhau nên trả về một
 * bundle duy nhất, trang chỉ cần chuyển tiếp xuống <OrdersKshipDialogs />.
 */
export function useOrdersKshipDialogs({
  rows,
  t,
  onFetchKshipOptions,
  onCreateKshipDelivery,
}: UseOrdersKshipDialogsArgs) {
  const [kshipNotePresetManageOpen, setKshipNotePresetManageOpen] = useState(false);
  const kshipNotePresets = useKshipNotePresets();
  const [kshipSenderManageOpen, setKshipSenderManageOpen] = useState(false);

  const delivery = useKshipDelivery({
    rows,
    onFetchKshipOptions,
    onCreateKshipDelivery,
    t,
  });
  const { createKshipCodeModalOpen, selectedOrderIdsForKship, kshipSenderAddressId } = delivery;
  const { setKshipSenderAddressId } = delivery;

  const kshipSenderAddressesQuery = useKshipSenderAddresses(
    selectedOrderIdsForKship,
    createKshipCodeModalOpen,
  );
  const kshipSenderAddresses = kshipSenderAddressesQuery.data?.items ?? [];
  // Pre-select default theo rule kênh/branch khi dialog mở và user chưa tự chọn.
  // Nếu địa chỉ đang chọn KHÔNG còn trong danh sách (vừa bị xoá ở dialog quản lý,
  // hoặc người khác xoá) thì phải reset về default — giữ id "ma" khiến ô Select hiện
  // placeholder nhưng submit vẫn gửi id đã xoá → BE 400 "Địa chỉ gửi không tồn tại".
  useEffect(() => {
    if (!createKshipCodeModalOpen) return;
    const data = kshipSenderAddressesQuery.data;
    if (!data) return;
    const defaultId = typeof data.default_id === "number" ? data.default_id : null;
    const stillExists =
      kshipSenderAddressId !== null && data.items.some((item) => item.id === kshipSenderAddressId);
    if (kshipSenderAddressId === null || !stillExists) {
      setKshipSenderAddressId(defaultId);
    }
  }, [
    createKshipCodeModalOpen,
    kshipSenderAddressesQuery.data,
    kshipSenderAddressId,
    setKshipSenderAddressId,
  ]);

  return {
    ...delivery,
    kshipSenderAddresses,
    kshipNotePresets,
    kshipNotePresetManageOpen,
    setKshipNotePresetManageOpen,
    kshipSenderManageOpen,
    setKshipSenderManageOpen,
  };
}

export type OrdersKshipDialogsState = ReturnType<typeof useOrdersKshipDialogs>;
