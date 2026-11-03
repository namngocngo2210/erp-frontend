import { useAppShell } from "@/app/AppShellContext";
import { can } from "@/lib/permissions";

/** Trả callback can("section:action") đọc quyền từ user trong AppShell. */
export function usePermission(): (code: string) => boolean {
  const { user } = useAppShell();
  return (code: string) => can(user, code);
}
