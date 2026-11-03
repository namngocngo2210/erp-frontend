import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormDialogShell, FormGrid } from "@/components/ui/form-dialog-content";
import { Input } from "@/components/ui/input";

type UserLike = {
  username: string;
  display_name: string;
};

type Props = {
  open: boolean;
  user: UserLike;
  profileDisplayName: string;
  profileAvatarDataUrl: string;
  profileSaving: boolean;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  passwordSaving: boolean;
  t: (key: string, fallback?: string) => string;
  onOpenChange: (open: boolean) => void;
  onAvatarPicked: (file: File | null) => void;
  onProfileDisplayNameChange: (value: string) => void;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onRemoveAvatar: () => void;
  onSaveProfile: () => void;
  onSavePassword: () => void;
};

export function ProfileDialog({
  open,
  user,
  profileDisplayName,
  profileAvatarDataUrl,
  profileSaving,
  currentPassword,
  newPassword,
  confirmPassword,
  passwordSaving,
  t,
  onOpenChange,
  onAvatarPicked,
  onProfileDisplayNameChange,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onRemoveAvatar,
  onSaveProfile,
  onSavePassword,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogShell
        title={t("topnav.profile")}
        description={t("app.profile.description")}
        footer={
          <Button
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => onOpenChange(false)}
          >
            {t("common.close")}
          </Button>
        }
      >
        <FormGrid columns={2}>
          {/* Profile info panel */}
          <div className="space-y-3 rounded-xl border border-border p-3">
            <p className="text-sm font-medium col-span-full">{t("app.profile.personalInfo")}</p>
            <div className="flex items-center gap-3">
              {profileAvatarDataUrl ? (
                <img
                  src={profileAvatarDataUrl}
                  alt={t("app.profile.avatarPreview")}
                  className="h-16 w-16 rounded-full border object-cover"
                />
              ) : (
                <div className="grid h-16 w-16 place-items-center rounded-full border bg-muted/50 text-sm text-primary">
                  {user.display_name?.[0] || user.username?.[0] || "U"}
                </div>
              )}
              <div className="space-y-2">
                <Input
                  id="profile-avatar"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => onAvatarPicked(event.target.files?.[0] ?? null)}
                />
                <Button type="button" size="sm" variant="outline" onClick={onRemoveAvatar}>
                  {t("app.profile.removeAvatar")}
                </Button>
              </div>
            </div>
            <div>
              <label
                htmlFor="profile-username"
                className="mb-1 block text-sm text-muted-foreground"
              >
                {t("app.profile.username")}
              </label>
              <Input id="profile-username" value={user.username} disabled />
            </div>
            <div>
              <label
                htmlFor="profile-display-name"
                className="mb-1 block text-sm text-muted-foreground"
              >
                {t("app.profile.displayName")}
              </label>
              <Input
                id="profile-display-name"
                value={profileDisplayName}
                onChange={(event) => onProfileDisplayNameChange(event.target.value)}
              />
            </div>
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={onSaveProfile}
              disabled={profileSaving}
            >
              {profileSaving ? t("common.saving") : t("app.profile.save", "Save profile")}
            </Button>
          </div>

          {/* Change password panel */}
          <div className="space-y-3 rounded-xl border border-border p-3">
            <p className="text-sm font-medium">{t("app.profile.changePassword")}</p>
            <div>
              <label
                htmlFor="profile-current-password"
                className="mb-1 block text-sm text-muted-foreground"
              >
                {t("app.profile.currentPassword")}
              </label>
              <Input
                id="profile-current-password"
                type="password"
                value={currentPassword}
                onChange={(event) => onCurrentPasswordChange(event.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="profile-new-password"
                className="mb-1 block text-sm text-muted-foreground"
              >
                {t("app.profile.newPassword")}
              </label>
              <Input
                id="profile-new-password"
                type="password"
                value={newPassword}
                onChange={(event) => onNewPasswordChange(event.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t("app.profile.passwordPolicyHint")}
              </p>
            </div>
            <div>
              <label
                htmlFor="profile-confirm-password"
                className="mb-1 block text-sm text-muted-foreground"
              >
                {t("app.profile.confirmPassword")}
              </label>
              <Input
                id="profile-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => onConfirmPasswordChange(event.target.value)}
              />
            </div>
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={onSavePassword}
              disabled={passwordSaving}
            >
              {passwordSaving ? t("app.profile.changingPassword") : t("app.profile.changePassword")}
            </Button>
          </div>
        </FormGrid>
      </FormDialogShell>
    </Dialog>
  );
}
