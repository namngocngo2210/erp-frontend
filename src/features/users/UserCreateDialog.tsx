import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormDialogShell, FormGrid } from "@/components/ui/form-dialog-content";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KiotvietUserMappingsEditor } from "@/features/users/KiotvietUserMappingsEditor";
import { MultiSelectCheckboxes } from "@/features/users/MultiSelectCheckboxes";
import { useI18n } from "@/i18n";
import type { Department, UserKiotvietMapping } from "@/features/users/types";
import type { Role } from "@/lib/api/roles";

type Props = {
  open: boolean;
  username: string;
  displayName: string;
  role: string;
  active: string;
  kiotvietMappings: UserKiotvietMapping[];
  password: string;
  zenifyEmail: string;
  foxiaId: string;
  mediaRole: string;
  mediaApiKey: string;
  mediaApiKeySet?: boolean;
  mediaApiKeyPrefix?: string;
  departmentId: string;
  departmentIds: number[];
  roleIds: number[];
  departments: Department[];
  roles: Role[];
  kiotvietChannels: { id: number; name: string }[];
  /** When false, hides the RBAC role-multi and department-multi controls.
   *  Defaults to true — existing Users admin page is unaffected. */
  showRbacControls?: boolean;
  onOpenChange: (open: boolean) => void;
  onUsernameChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onActiveChange: (value: string) => void;
  onKiotvietMappingsChange: (value: UserKiotvietMapping[]) => void;
  onPasswordChange: (value: string) => void;
  onZenifyEmailChange: (value: string) => void;
  onFoxiaIdChange: (value: string) => void;
  onMediaRoleChange: (value: string) => void;
  onMediaApiKeyChange: (value: string) => void;
  onClearMediaApiKey?: () => void;
  onDepartmentIdChange: (value: string) => void;
  onDepartmentIdsChange: (value: number[]) => void;
  onRoleIdsChange: (value: number[]) => void;
  onSubmit: () => void;
};

export function UserCreateDialog({
  open,
  username,
  displayName,
  role,
  active,
  kiotvietMappings,
  password,
  zenifyEmail,
  foxiaId,
  mediaRole,
  mediaApiKey,
  mediaApiKeySet,
  mediaApiKeyPrefix,
  departmentId,
  departmentIds,
  roleIds,
  departments,
  roles,
  kiotvietChannels,
  showRbacControls = true,
  onOpenChange,
  onUsernameChange,
  onDisplayNameChange,
  onRoleChange,
  onActiveChange,
  onKiotvietMappingsChange,
  onPasswordChange,
  onZenifyEmailChange,
  onFoxiaIdChange,
  onMediaRoleChange,
  onMediaApiKeyChange,
  onClearMediaApiKey,
  onDepartmentIdChange,
  onDepartmentIdsChange,
  onRoleIdsChange,
  onSubmit,
}: Props) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogShell
        title={t("users.create.title")}
        description={t("users.create.description")}
        footer={
          <>
            <Button
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={onSubmit}
            >
              {t("common.create")}
            </Button>
          </>
        }
      >
        <FormGrid columns={2}>
          <div>
            <label
              htmlFor="user-create-username"
              className="mb-1 block text-sm text-muted-foreground"
            >
              {t("users.fields.username")}
            </label>
            <Input
              id="user-create-username"
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="user-create-display-name"
              className="mb-1 block text-sm text-muted-foreground"
            >
              {t("users.fields.displayName")}
            </label>
            <Input
              id="user-create-display-name"
              value={displayName}
              onChange={(e) => onDisplayNameChange(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="user-create-role" className="mb-1 block text-sm text-muted-foreground">
              {t("users.fields.role")}
            </label>
            <Select value={role} onValueChange={(value) => onRoleChange(value ?? "staff")}>
              <SelectTrigger id="user-create-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">{t("users.roles.staff")}</SelectItem>
                <SelectItem value="admin">{t("users.roles.admin")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {role === "staff" && (
            <div>
              <label
                htmlFor="user-create-department"
                className="mb-1 block text-sm text-muted-foreground"
              >
                {t("users.fields.department", "Phòng ban")}
              </label>
              <Select
                value={departmentId}
                onValueChange={(value) => onDepartmentIdChange(value === "__none__" ? "" : value)}
              >
                <SelectTrigger id="user-create-department">
                  <SelectValue placeholder={t("users.fields.noDepartment", "-- Không chọn --")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    {t("users.fields.noDepartment", "-- Không chọn --")}
                  </SelectItem>
                  {departments
                    .filter((d) => d.is_active)
                    .map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {showRbacControls && (
            <div className="col-span-full">
              <label className="mb-1 block text-sm text-muted-foreground">
                {t("users.fields.departments", "Phòng ban (nhiều)")}
              </label>
              <MultiSelectCheckboxes
                idPrefix="user-create-departments"
                options={departments
                  .filter((d) => d.is_active)
                  .map((d) => ({ id: d.id, label: d.name }))}
                selected={departmentIds}
                onChange={onDepartmentIdsChange}
                emptyText={t("users.fields.noDepartmentOptions", "Chưa có phòng ban.")}
              />
            </div>
          )}
          {showRbacControls && (
            <div className="col-span-full">
              <label className="mb-1 block text-sm text-muted-foreground">
                {t("users.fields.roles", "Vai trò (RBAC)")}
              </label>
              <MultiSelectCheckboxes
                idPrefix="user-create-roles"
                options={roles.filter((r) => r.is_active).map((r) => ({ id: r.id, label: r.name }))}
                selected={roleIds}
                onChange={onRoleIdsChange}
                emptyText={t("users.fields.noRoleOptions", "Chưa có vai trò.")}
              />
            </div>
          )}
          <div>
            <label
              htmlFor="user-create-status"
              className="mb-1 block text-sm text-muted-foreground"
            >
              {t("users.fields.status")}
            </label>
            <Select value={active} onValueChange={(value) => onActiveChange(value ?? "true")}>
              <SelectTrigger id="user-create-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">{t("common.active")}</SelectItem>
                <SelectItem value="false">{t("common.inactive")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-full">
            <label className="mb-1 block text-sm text-muted-foreground">
              {t("users.fields.kiotvietMappings", "Mapping KiotViet (soldById)")}
            </label>
            <KiotvietUserMappingsEditor
              idPrefix="user-create-kvmap"
              value={kiotvietMappings}
              onChange={onKiotvietMappingsChange}
              kiotvietChannels={kiotvietChannels}
            />
          </div>
          <div className="col-span-full">
            <label
              htmlFor="user-create-zenify-email"
              className="mb-1 block text-sm text-muted-foreground"
            >
              {t("users.fields.zenifyEmail", "Email Zenify (tổng đài)")}
            </label>
            <Input
              id="user-create-zenify-email"
              type="email"
              autoComplete="off"
              placeholder="agent@congty.vn"
              value={zenifyEmail}
              onChange={(e) => onZenifyEmailChange(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t(
                "users.fields.zenifyEmailHint",
                "Email agent đăng nhập tổng đài Zenify để gọi ra từ ERP.",
              )}
            </p>
          </div>
          <div className="col-span-full">
            <label
              htmlFor="user-create-foxia-id"
              className="mb-1 block text-sm text-muted-foreground"
            >
              {t("users.fields.foxiaId", "Foxia ID")}
            </label>
            <Input
              id="user-create-foxia-id"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="VD: 1234"
              value={foxiaId}
              onChange={(e) => onFoxiaIdChange(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t(
                "users.fields.foxiaIdHint",
                "ID tài khoản nhân viên bên Foxia, dùng để đối chiếu đơn/lead Foxia về người này.",
              )}
            </p>
          </div>
          <div>
            <label
              htmlFor="user-create-media-role"
              className="mb-1 block text-sm text-muted-foreground"
            >
              {t("users.fields.mediaRole")}
            </label>
            <Select
              value={mediaRole || "none"}
              onValueChange={(v) => onMediaRoleChange(v === "none" ? "" : v)}
            >
              <SelectTrigger id="user-create-media-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("users.fields.mediaRole.none")}</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="uploader">Uploader</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label
              htmlFor="user-create-media-key"
              className="mb-1 block text-sm text-muted-foreground"
            >
              {t("users.fields.mediaApiKey")}
            </label>
            <Input
              id="user-create-media-key"
              // Cùng lý do với ô mật khẩu: ô password luôn hiển thị dễ bị Chrome tự điền
              // mật khẩu của admin → key sai prefix dak_ → lưu user thất bại.
              type="password"
              name="user-create-media-api-key"
              autoComplete="new-password"
              data-lpignore="true"
              data-1p-ignore
              placeholder="dak_..."
              value={mediaApiKey}
              onChange={(e) => onMediaApiKeyChange(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {mediaApiKeySet
                ? `${t("users.fields.mediaApiKey.set")} ${mediaApiKeyPrefix}… `
                : null}
              {t("users.fields.mediaApiKeyHint")}
              {mediaApiKeySet && onClearMediaApiKey ? (
                <button
                  type="button"
                  className="ml-1 text-rose-600 underline"
                  onClick={onClearMediaApiKey}
                >
                  {t("users.fields.mediaApiKey.clear")}
                </button>
              ) : null}
            </p>
          </div>
          <div>
            <label
              htmlFor="user-create-password"
              className="mb-1 block text-sm text-muted-foreground"
            >
              {t("users.fields.password")}
            </label>
            <Input
              id="user-create-password"
              type="password"
              name="user-create-new-password"
              autoComplete="new-password"
              data-lpignore="true"
              data-1p-ignore
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t("users.fields.passwordPolicyHint", "Tối thiểu 12 ký tự, không chỉ gồm số.")}
            </p>
          </div>
        </FormGrid>
      </FormDialogShell>
    </Dialog>
  );
}
