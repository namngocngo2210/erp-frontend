import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useAppShell } from "@/app/AppShellContext";
import { UserCreateDialog } from "@/features/users/UserCreateDialog";
import type { UserKiotvietMapping } from "@/features/users/types";
import { useI18n } from "@/i18n";
import { listRoles, type Role } from "@/lib/api/roles";
import type { CreateAdminUserPayload } from "@/lib/api/users";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CreateAdminUserPayload) => Promise<void>;
};

const EMPTY_FORM = {
  username: "",
  displayName: "",
  role: "staff",
  active: "true",
  kiotvietMappings: [] as UserKiotvietMapping[],
  password: "",
  zenifyEmail: "",
  foxiaId: "",
  mediaRole: "",
  mediaApiKey: "",
  departmentId: "" as string,
  departmentIds: [] as number[],
  roleIds: [] as number[],
};

export function EmployeeAccountCreateDialog({ open, onOpenChange, onSubmit }: Props) {
  const { t } = useI18n();
  const shell = useAppShell();
  const [roles, setRoles] = useState<Role[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    listRoles()
      .then(setRoles)
      .catch(() => setRoles([]));
  }, []);

  const cleanMappings = (mappings: UserKiotvietMapping[]) =>
    mappings
      .map((m) => ({ ...m, external_kiot_user_id: m.external_kiot_user_id.trim() }))
      .filter((m) => m.external_kiot_user_id);

  const handleSubmit = async () => {
    if (!form.username.trim() || !form.password.trim()) {
      toast.error(t("users.toast.usernamePasswordRequired"));
      return;
    }
    await onSubmit({
      username: form.username.trim(),
      display_name: form.displayName.trim(),
      role: form.role,
      is_active: form.active === "true",
      kiotviet_mappings: cleanMappings(form.kiotvietMappings),
      password: form.password,
      zenify_email: form.zenifyEmail.trim(),
      foxia_id: form.foxiaId.trim(),
      // Select trong UserCreateDialog chỉ cho chọn trong tập enum media_role hợp lệ.
      media_role: form.mediaRole as CreateAdminUserPayload["media_role"],
      media_api_key: form.mediaApiKey.trim() || "",
      department_id: form.departmentId ? Number(form.departmentId) : null,
      department_ids: [],
      role_ids: [],
    });
    setForm(EMPTY_FORM);
    onOpenChange(false);
  };

  // KiotVietChannelRow has { id, name } which matches UserCreateDialog's kiotvietChannels prop
  return (
    <UserCreateDialog
      showRbacControls={false}
      open={open}
      username={form.username}
      displayName={form.displayName}
      role={form.role}
      active={form.active}
      kiotvietMappings={form.kiotvietMappings}
      password={form.password}
      zenifyEmail={form.zenifyEmail}
      foxiaId={form.foxiaId}
      mediaRole={form.mediaRole}
      mediaApiKey={form.mediaApiKey}
      departmentId={form.departmentId}
      departmentIds={form.departmentIds}
      roleIds={form.roleIds}
      departments={shell.departments}
      roles={roles}
      kiotvietChannels={shell.kiotVietChannels}
      onOpenChange={onOpenChange}
      onUsernameChange={(v) => setForm((p) => ({ ...p, username: v }))}
      onDisplayNameChange={(v) => setForm((p) => ({ ...p, displayName: v }))}
      onRoleChange={(v) => setForm((p) => ({ ...p, role: v }))}
      onActiveChange={(v) => setForm((p) => ({ ...p, active: v }))}
      onKiotvietMappingsChange={(v) => setForm((p) => ({ ...p, kiotvietMappings: v }))}
      onPasswordChange={(v) => setForm((p) => ({ ...p, password: v }))}
      onZenifyEmailChange={(v) => setForm((p) => ({ ...p, zenifyEmail: v }))}
      onFoxiaIdChange={(v) => setForm((p) => ({ ...p, foxiaId: v }))}
      onMediaRoleChange={(v) => setForm((p) => ({ ...p, mediaRole: v }))}
      onMediaApiKeyChange={(v) => setForm((p) => ({ ...p, mediaApiKey: v }))}
      onDepartmentIdChange={(v) => setForm((p) => ({ ...p, departmentId: v }))}
      onDepartmentIdsChange={(v) => setForm((p) => ({ ...p, departmentIds: v }))}
      onRoleIdsChange={(v) => setForm((p) => ({ ...p, roleIds: v }))}
      onSubmit={handleSubmit}
    />
  );
}
