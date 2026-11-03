import { Dispatch, SetStateAction, useEffect, useState } from "react";

import { clearAuthTokens, fetchJson } from "@/services/http";
import { DEPARTMENT_ID } from "@/lib/constants/departments";
import { swallowError } from "@/lib/errors";

const USER_STORAGE_KEY = "desi_cached_user";

export type AuthUser = {
  id: number;
  username: string;
  display_name: string;
  avatar_data_url: string;
  department: {
    id: number;
    name: string;
    is_active: boolean;
    created_at: string;
  } | null;
  allowed_sections: string[];
  permissions?: string[];
  scopes?: Record<string, string>;
  field_policy?: Record<string, Record<string, string>>;
  /** Field đơn user được cấp quyền sửa (RoleFieldGrant section "orders"); `undefined` = payload chưa nạp xong. */
  editable_order_fields?: string[];
  is_superuser?: boolean;
  assigned_channels?: Array<{
    id: number;
    code: string;
    name: string;
    is_active: boolean;
  }>;
};

function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (parsed && typeof parsed.id === "number" && typeof parsed.username === "string") {
      return parsed;
    }
  } catch (err) {
    // ignore storage error
    swallowError(err, "auth.storedUser.read");
  }
  return null;
}

export type UseAuthBootstrapResult = {
  /** User hiện tại (null khi chưa đăng nhập / hết phiên). */
  user: AuthUser | null;
  /** Setter user — App dùng cho login/profile/logout. */
  setUser: Dispatch<SetStateAction<AuthUser | null>>;
  /** Đang kiểm tra phiên lúc khởi động (chặn render shell hỏng). */
  authChecking: boolean;
};

/**
 * Auth bootstrap khi mount: nếu có user đã lưu, validate lại qua /api/users/me
 * (fetchJson tự mint access token bằng cookie refresh trước khi gửi). Hết phiên
 * (refresh trả 401/403) thì xoá token + user → về LoginView. Lỗi tạm thời (5xx,
 * mất mạng) KHÔNG xoá token để reload sau là vào lại ngay.
 *
 * Cũng persist user vào localStorage mỗi khi đổi. Logic giữ nguyên 100% như khi
 * còn ở App.tsx — chỉ DI CHUYỂN. logout vẫn ở App vì còn phụ thuộc nhiều ref.
 */
export function useAuthBootstrap(): UseAuthBootstrapResult {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const me = await fetchJson("/api/users/me");
        // Chỉ ADS staff bị scope theo UserChannel; admin và SALES staff luôn
        // thấy toàn bộ đơn nên không cần fetch assignments (tránh sinh scope rỗng
        // làm rớt WS event hoặc ẩn channel filter dropdown).
        // Audit 2026-09-23 P2-6: giữ `is_superuser` + DEPARTMENT_ID.ADS vì đây là
        // bản sao đúng của luật BE `my_channel_assignments` (channel_views_impl.py:337:
        // superuser hoặc department != ADS → không scope) — không có mã quyền
        // tương ứng trong rbac_catalog; thay bằng can() sẽ lệch với BE.
        if (!me.is_superuser && me.department?.id === DEPARTMENT_ID.ADS) {
          try {
            const assignedChannels = await fetchJson("/api/channels/me/assignments");
            me.assigned_channels = assignedChannels;
          } catch (error) {
            console.warn("Failed to fetch assigned channels:", error);
            me.assigned_channels = [];
          }
        } else {
          me.assigned_channels = undefined;
        }
        setUser(me);
      } catch (err) {
        // Chỉ xóa token khi server từ chối auth thật sự (401/403). Lỗi tạm thời
        // (DB quá tải → 5xx, mất mạng) KHÔNG được xóa token: giữ lại để khi backend
        // hồi phục, reload là vào lại ngay mà không phải đăng nhập lại.
        const status = (err as { status?: number } | null)?.status;
        if (status === 401 || status === 403) {
          clearAuthTokens();
        }
        setUser(null);
      } finally {
        setAuthChecking(false);
      }
    };

    // Sau reload, access token in-memory đã mất nên KHÔNG thể dựa vào nó để biết
    // còn phiên hay không. Nếu có user đã lưu, validate lại qua /api/users/me —
    // fetchJson tự mint access token bằng cookie refresh trước khi gửi. Hết phiên
    // (refresh trả 401) thì bootstrap xóa token + user → về LoginView thay vì kẹt
    // ở shell hỏng. Có token sẵn trong RAM trước khi các query data chạy nên cũng
    // không còn "bức tường 401" lúc khởi động.
    if (getStoredUser()) {
      bootstrap().catch(() => null);
    } else {
      setAuthChecking(false);
    }
  }, []);

  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    } catch (err) {
      // ignore storage error
      swallowError(err, "auth.storedUser.write");
    }
  }, [user]);

  return { user, setUser, authChecking };
}
