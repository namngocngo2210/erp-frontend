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
import { Switch } from "@/components/ui/switch";
import { KiotvietUserMappingsEditor } from "@/features/users/KiotvietUserMappingsEditor";
import { MultiSelectCheckboxes } from "@/features/users/MultiSelectCheckboxes";
import { useI18n } from "@/i18n";
import type { Department, UserKiotvietMapping } from "@/features/users/types";
import type { Role } from "@/lib/api/roles";

type Props = {
  open: boolean;
  displayName: string;
  role: string;
  active: string;
  kiotvietMappings: UserKiotvietMapping[];
  changePassword: boolean;
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
  onOpenChange: (open: boolean) => void;
  onDisplayNameChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onActiveChange: (value: string) => void;
  onKiotvietMappingsChange: (value: UserKiotvietMapping[]) => void;
  onChangePasswordToggle: (value: boolean) => void;
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

export function UserEditDialog({
  open,
  displayName,
  role,
  active,
  kiotvietMappings,
  changePassword,
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
  onOpenChange,
  onDisplayNameChange,
  onRoleChange,
  onActiveChange,
  onKiotvietMappingsChange,
  onChangePasswordToggle,
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
        title={t("users.edit.title")}
        description={t("users.edit.description")}
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
              {t("common.save")}
            </Button>
          </>
        }
      >
        <FormGrid columns={2}>
          <div>
            <label
              htmlFor="user-edit-display-name"
              className="mb-1 block text-sm text-muted-foreground"
            >
              {t("users.fields.displayName")}
            </label>
            <Input
              id="user-edit-display-name"
              value={displayName}
              onChange={(e) => onDisplayNameChange(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="user-edit-role" className="mb-1 block text-sm text-muted-foreground">
              {t("users.fields.role")}
            </label>
            <Select value={role} onValueChange={(value) => onRoleChange(value ?? "staff")}>
              <SelectTrigger id="user-edit-role">
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
                htmlFor="user-edit-department"
                className="mb-1 block text-sm text-muted-foreground"
              >
                {t("users.fields.department", "Phòng ban")}
              </label>
              <Select
                value={departmentId}
                onValueChange={(value) => onDepartmentIdChange(value === "__none__" ? "" : value)}
              >
                <SelectTrigger id="user-edit-department">
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
          <div className="col-span-full">
            <label className="mb-1 block text-sm text-muted-foreground">
              {t("users.fields.departments", "Phòng ban (nhiều)")}
            </label>
            <MultiSelectCheckboxes
              idPrefix="user-edit-departments"
              options={departments
                .filter((d) => d.is_active)
                .map((d) => ({ id: d.id, label: d.name }))}
              selected={departmentIds}
              onChange={onDepartmentIdsChange}
              emptyText={t("users.fields.noDepartmentOptions", "Chưa có phòng ban.")}
            />
          </div>
          <div className="col-span-full">
            <label className="mb-1 block text-sm text-muted-foreground">
              {t("users.fields.roles", "Vai trò (RBAC)")}
            </label>
            <MultiSelectCheckboxes
              idPrefix="user-edit-roles"
              options={roles.filter((r) => r.is_active).map((r) => ({ id: r.id, label: r.name }))}
              selected={roleIds}
              onChange={onRoleIdsChange}
              emptyText={t("users.fields.noRoleOptions", "Chưa có vai trò.")}
            />
          </div>
          <div>
            <label htmlFor="user-edit-status" className="mb-1 block text-sm text-muted-foreground">
              {t("users.fields.status")}
            </label>
            <Select value={active} onValueChange={(value) => onActiveChange(value ?? "true")}>
              <SelectTrigger id="user-edit-status">
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
              idPrefix="user-edit-kvmap"
              value={kiotvietMappings}
              onChange={onKiotvietMappingsChange}
              kiotvietChannels={kiotvietChannels}
            />
          </div>
          <div className="col-span-full">
            <label
              htmlFor="user-edit-zenify-email"
              className="mb-1 block text-sm text-muted-foreground"
            >
              {t("users.fields.zenifyEmail", "Email Zenify (tổng đài)")}
            </label>
            <Input
              id="user-edit-zenify-email"
              // KHÔNG dùng type="email"/name gợi email: Chrome coi đó là ô "username"
              // và tự điền tài khoản đang đăng nhập vào (đã từng ghi "admin" vào đây).
              type="text"
              name="user-edit-zenify-agent"
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore
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
              htmlFor="user-edit-foxia-id"
              className="mb-1 block text-sm text-muted-foreground"
            >
              {t("users.fields.foxiaId", "Foxia ID")}
            </label>
            <Input
              id="user-edit-foxia-id"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore
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
              htmlFor="user-edit-media-role"
              className="mb-1 block text-sm text-muted-foreground"
            >
              {t("users.fields.mediaRole")}
            </label>
            <Select
              value={mediaRole || "none"}
              onValueChange={(v) => onMediaRoleChange(v === "none" ? "" : v)}
            >
              <SelectTrigger id="user-edit-media-role">
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
              htmlFor="user-edit-media-key"
              className="mb-1 block text-sm text-muted-foreground"
            >
              {t("users.fields.mediaApiKey")}
            </label>
            <Input
              id="user-edit-media-key"
              // Cùng lý do với ô mật khẩu: ô password luôn hiển thị dễ bị Chrome tự điền
              // mật khẩu của admin → key sai prefix dak_ → lưu user thất bại.
              type="password"
              name="user-edit-media-api-key"
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
          {/* Ô mật khẩu chỉ tồn tại trong DOM khi admin bật công tắc. Trước đây ô này
              luôn hiển thị nên trình duyệt tự điền (autofill) mật khẩu của chính
              admin vào, và mọi lần sửa thông tin khác đều âm thầm ghi đè mật khẩu
              của nhân viên → họ nhập đúng pass vẫn không đăng nhập được. */}
          <div className="col-span-full flex items-center gap-3">
            <Switch
              id="user-edit-change-password"
              checked={changePassword}
              onCheckedChange={onChangePasswordToggle}
            />
            <label htmlFor="user-edit-change-password" className="text-sm text-muted-foreground">
              {t("users.fields.changePassword", "Đổi mật khẩu")}
            </label>
          </div>
          {changePassword && (
            <div>
              <label
                htmlFor="user-edit-password"
                className="mb-1 block text-sm text-muted-foreground"
              >
                {t("users.fields.newPassword")}
              </label>
              <Input
                id="user-edit-password"
                type="password"
                name="user-edit-new-password"
                autoComplete="new-password"
                data-lpignore="true"
                data-1p-ignore
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t("users.fields.passwordPolicyHint", "Tối thiểu 12 ký tự, không chỉ gồm số.")}{" "}
                {t(
                  "users.fields.newPasswordHint",
                  "Để trống hoặc tắt công tắc = giữ nguyên mật khẩu hiện tại.",
                )}
              </p>
            </div>
          )}
        </FormGrid>
      </FormDialogShell>
    </Dialog>
  );
}
