import { Dispatch, SetStateAction, useCallback, useEffect, useState } from "react";

import { type OrderNotification } from "@/hooks/use-crm-websocket";
import { swallowError } from "@/lib/errors";

const NOTIFICATIONS_STORAGE_KEY = "desi_notifications";

function getStoredNotifications(): OrderNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is OrderNotification => {
        return (
          item &&
          typeof item.id === "string" &&
          (typeof item.orderId === "number" || item.orderId === null) &&
          typeof item.content === "string" &&
          typeof item.timeLabel === "string" &&
          typeof item.unread === "boolean"
        );
      })
      .slice(0, 5);
  } catch {
    return [];
  }
}

export type UseOrderNotificationsResult = {
  /** Danh sách thông báo realtime đơn hàng (đã giới hạn 5 mục khi lưu). */
  notifications: OrderNotification[];
  /** Setter gốc — truyền vào useCrmWebSocket để push thông báo mới. */
  setNotifications: Dispatch<SetStateAction<OrderNotification[]>>;
  /** Số thông báo chưa đọc — hiển thị badge ở chuông. */
  unreadCount: number;
  /** Đánh dấu tất cả đã đọc. */
  markAllNotificationsRead: () => void;
  /** Đánh dấu một thông báo đã đọc theo id. */
  markNotificationRead: (notificationId: string) => void;
  /** Xoá toàn bộ thông báo (dùng khi logout). */
  clearNotifications: () => void;
};

/**
 * State + logic cho chuông thông báo đơn realtime. Hành vi giữ nguyên như khi
 * còn nằm trong App.tsx: khởi tạo từ localStorage, persist tối đa 5 mục mỗi khi
 * danh sách đổi. `setNotifications` được expose nguyên bản để useCrmWebSocket
 * push thông báo mới như trước.
 */
export function useOrderNotifications(): UseOrderNotificationsResult {
  const [notifications, setNotifications] = useState<OrderNotification[]>(getStoredNotifications);

  useEffect(() => {
    try {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications.slice(0, 5)));
    } catch (err) {
      // ignore storage error
      swallowError(err, "notifications.storage");
    }
  }, [notifications]);

  const unreadCount = notifications.reduce((count, item) => count + (item.unread ? 1 : 0), 0);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((item) => ({ ...item, unread: false })));
  }, []);

  const markNotificationRead = useCallback((notificationId: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === notificationId ? { ...item, unread: false } : item)),
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    setNotifications,
    unreadCount,
    markAllNotificationsRead,
    markNotificationRead,
    clearNotifications,
  };
}
