import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

type AuthUser = { allowed_sections: string[] } | null;

export default function RequireAuth({
  user,
  section,
  fallbackPath,
  children,
}: {
  user: AuthUser;
  section?: string;
  /**
   * Đích khi thiếu quyền. Phải là trang user THỰC SỰ vào được — mặc định "/" chỉ
   * an toàn khi route index tự giải quyết được đích hợp lệ (xem DefaultRedirect).
   */
  fallbackPath?: string | null;
  children: ReactNode;
}) {
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (section && !user.allowed_sections.includes(section)) {
    return <Navigate to={fallbackPath ?? "/"} replace />;
  }

  return <>{children}</>;
}
