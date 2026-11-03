/**
 * Các component guard/redirect dùng trong bảng route (src/app/routes.tsx).
 * Tách riêng khỏi routes.tsx để file đó chỉ export `router` (non-component) —
 * điều kiện để React Fast Refresh hoạt động với các component này.
 */

import { type ReactNode } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";

import { useI18n } from "@/i18n";

import RequireAuth from "@/app/RequireAuth";
import { useAppShell, type AppShellUser } from "@/app/AppShellContext";
import {
  defaultSectionForUser,
  pathFromSection,
  requiredPermissionFor,
  type AppSection,
} from "@/lib/routes";
import {
  LAST_MODULE_STORAGE_KEY,
  firstAllowedSection,
  firstAllowedSectionOfModule,
  moduleByKey,
} from "@/app/modules";

/**
 * Trang "hạ cánh" của user: section mặc định theo phòng ban, nếu không có quyền
 * thì section đầu tiên user vào được. `null` = tài khoản chưa được cấp quyền vào
 * bất kỳ trang nào.
 *
 * MỌI redirect vì thiếu quyền phải đi qua đây. Trước đây guard đẩy về "/", còn
 * "/" lại đẩy về module dùng gần nhất mà KHÔNG kiểm tra quyền → đăng nhập tài
 * khoản ít quyền hơn trên URL của trang admin là nhảy trang vô hạn.
 */
function landingSectionFor(user: AppShellUser): AppSection | undefined {
  return defaultSectionForUser(user) ?? firstAllowedSection(user.allowed_sections ?? []);
}

function landingPathFor(user: AppShellUser): string | null {
  const section = landingSectionFor(user);
  return section ? pathFromSection(section) : null;
}

/** Màn hình dừng cho tài khoản không có quyền vào trang nào (thay vì redirect vòng). */
function NoAccessScreen() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-lg font-semibold text-foreground">{t("auth.noAccess.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("auth.noAccess.desc")}</p>
    </div>
  );
}

/** Bọc element trong RequireAuth, lấy user từ context và section quyền tương ứng. */
export function Guard({ section, children }: { section: AppSection; children: ReactNode }) {
  const { user } = useAppShell();
  const landing = user ? landingPathFor(user) : null;
  if (user && !landing && !user.allowed_sections.includes(requiredPermissionFor(section))) {
    return <NoAccessScreen />;
  }
  return (
    <RequireAuth user={user} section={requiredPermissionFor(section)} fallbackPath={landing}>
      {children}
    </RequireAuth>
  );
}

/** Chỉ yêu cầu đã đăng nhập (không gate theo section) — dùng cho trang chấm công. */
export function LoginOnly({ children }: { children: ReactNode }) {
  const { user } = useAppShell();
  return <RequireAuth user={user}>{children}</RequireAuth>;
}

/** Trang chỉ dành cho superuser (BE gate bằng can_manage, không theo section RBAC).
 * Audit 2026-09-23 P2-6 giữ nguyên `is_superuser` ở đây: 3 route dùng guard này
 * (kiotviet / foxia-link / pancake) BE đều chặn bằng `resolve_effective_permissions(user).is_superuser`
 * — chưa có mã quyền trong rbac_catalog để thay; đổi FE trước là mở trang rồi 403.
 * Không có guard này thì user được cấp section tương ứng vào được trang bằng URL
 * trực tiếp rồi nhận bảng trống + 403 ở mọi thao tác (audit 2026-07-14 vòng 4). */
export function GuardSuperuser({ children }: { children: ReactNode }) {
  const { user } = useAppShell();
  if (!user.is_superuser) {
    const landing = landingPathFor(user);
    return landing ? <Navigate to={landing} replace /> : <NoAccessScreen />;
  }
  return <RequireAuth user={user}>{children}</RequireAuth>;
}

/** Redirect a static old path to a new path, preserving query/hash. */
export function RedirectTo({ to }: { to: string }) {
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname: to, search, hash }} replace />;
}

/**
 * Redirect old detail path (/orders/:orderId, /sales/warranty/:claimId, ...) to a new
 * base, preserving the dynamic id segment. `param` là tên param trong route cũ
 * (mặc định "orderId" cho các redirect order-detail hiện có).
 */
export function LegacyDetailRedirect({
  base,
  param = "orderId",
}: {
  base: string;
  param?: string;
}) {
  const params = useParams();
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname: `${base}/${params[param]}`, search, hash }} replace />;
}

function readLastModuleKey(): string | null {
  try {
    return window.localStorage.getItem(LAST_MODULE_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** "/" → last-used module (if still permitted), else department default. */
export function DefaultRedirect() {
  const { user } = useAppShell();
  const stored = readLastModuleKey();
  const m = stored ? moduleByKey(stored) : undefined;
  const allowed = user.allowed_sections ?? [];
  // Phải là section ĐẦU TIÊN CÓ QUYỀN trong module, không phải section mặc định:
  // module dùng gần nhất có thể là của tài khoản trước đó (localStorage sống qua
  // logout), hoặc user chỉ có quyền vào tab thứ n của module.
  const target = (m && firstAllowedSectionOfModule(m, allowed)) ?? landingSectionFor(user);
  if (!target) return <NoAccessScreen />;
  return <Navigate to={pathFromSection(target)} replace />;
}
