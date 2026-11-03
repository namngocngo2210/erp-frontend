/**
 * WebphoneProvider — chọn vai tab: tab giành được khoá Web Locks là TAB CHỦ
 * (WebphoneLeaderProvider: iframe Zenify, đăng nhập tổng đài), các tab còn lại là
 * TAB PHỤ (WebphoneFollowerProvider: hiển thị/điều khiển qua BroadcastChannel).
 * Tab chủ đóng → tab phụ đang chờ khoá tự lên làm chủ. Xem webphone-tabs.ts.
 */
import { useEffect, useState, type ReactNode } from "react";

import { usePermission } from "@/hooks/usePermission";

import { WebphoneFollowerProvider } from "./WebphoneFollowerProvider";
import { WebphoneLeaderProvider } from "./WebphoneLeaderProvider";
import { claimLeadership } from "./webphone-tabs";

function useWebphoneLeadership(enabled: boolean): boolean {
  const [leader, setLeader] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    return claimLeadership(() => setLeader(true));
  }, [enabled]);
  return enabled && leader;
}

export function WebphoneProvider({ children }: { children: ReactNode }) {
  const can = usePermission();
  const canUse = can("landing-orders:view");
  const isLeader = useWebphoneLeadership(canUse);
  return isLeader ? (
    <WebphoneLeaderProvider canUse={canUse}>{children}</WebphoneLeaderProvider>
  ) : (
    <WebphoneFollowerProvider canUse={canUse}>{children}</WebphoneFollowerProvider>
  );
}
