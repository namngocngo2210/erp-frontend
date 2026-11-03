import { useCallback, useEffect, useState } from "react";

import type { OrderRow } from "../order-types";

/**
 * Tab Tư vấn (sheet3): click vào đơn mở side panel chăm sóc CRM thay vì sang
 * trang chi tiết — các nút (ghi liên hệ, đặt hẹn, đóng case, chốt đơn) và lịch
 * sử liên hệ nằm trong panel.
 */
export function useOrdersCrmPanel(
  isConsultingTab: boolean,
  onNavigateToDetail: (orderId: number) => void,
) {
  const [crmPanelOrderId, setCrmPanelOrderId] = useState<number | null>(null);
  useEffect(() => {
    if (!isConsultingTab) setCrmPanelOrderId(null);
  }, [isConsultingTab]);

  const handleOpenDetails = useCallback(
    (order: OrderRow) => {
      if (isConsultingTab) {
        setCrmPanelOrderId(order.id);
        return;
      }
      onNavigateToDetail(order.id);
    },
    [isConsultingTab, onNavigateToDetail],
  );

  return {
    crmPanelOrderId,
    closeCrmPanel: () => setCrmPanelOrderId(null),
    handleOpenDetails,
  };
}
