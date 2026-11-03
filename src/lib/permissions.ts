export type EffectivePermissions = {
  permissions?: string[];
  is_superuser?: boolean;
};

/** True nếu user là superuser hoặc có permission code. */
export function can(user: EffectivePermissions | null | undefined, code: string): boolean {
  if (!user) return false;
  if (user.is_superuser) return true;
  return (user.permissions ?? []).includes(code);
}
