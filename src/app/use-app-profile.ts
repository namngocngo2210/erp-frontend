import { useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";

import { useI18n } from "@/i18n";
import { type AuthUser } from "@/hooks/use-auth-bootstrap";
import { handleApiError } from "@/lib/errors";
import * as usersApi from "@/lib/api/users";

type UseAppProfileParams = {
  user: AuthUser | null;
  setUser: Dispatch<SetStateAction<AuthUser | null>>;
};

/**
 * State + handler cho dialog hồ sơ cá nhân (avatar, display name, đổi mật khẩu).
 * Chỉ DI CHUYỂN từ App.tsx — logic giữ nguyên; App vẫn wire vào AppUIContext.
 */
export function useAppProfile({ user, setUser }: UseAppProfileParams) {
  const { t } = useI18n();
  const [openProfile, setOpenProfile] = useState(false);
  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [profileAvatarDataUrl, setProfileAvatarDataUrl] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  const openProfileModal = () => {
    if (!user) return;
    setProfileDisplayName(user.display_name ?? "");
    setProfileAvatarDataUrl(user.avatar_data_url ?? "");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setOpenProfile(true);
  };

  const onAvatarPicked = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("app.profile.toast.invalidImage"));
      return;
    }
    if (file.size > 1_500_000) {
      toast.error(t("app.profile.toast.imageTooLarge"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") setProfileAvatarDataUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => setProfileAvatarDataUrl("");

  const saveProfile = async () => {
    if (!user) return;
    setProfileSaving(true);
    try {
      const data = await usersApi.updateProfile({
        display_name: profileDisplayName.trim(),
        avatar_data_url: profileAvatarDataUrl,
      });
      setUser(data as AuthUser);
      toast.success(t("app.profile.toast.saveSuccess"));
      setOpenProfile(false);
    } catch (err: unknown) {
      handleApiError(err, { toast: t("app.profile.toast.saveFailed"), context: "profile.save" });
    } finally {
      setProfileSaving(false);
    }
  };

  const savePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error(t("app.profile.toast.passwordRequired"));
      return;
    }
    setPasswordSaving(true);
    try {
      await usersApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success(t("app.profile.toast.passwordSuccess"));
    } catch (err: unknown) {
      // Đổi mật khẩu sai mật khẩu cũ trả 400 kèm detail — hiện đúng lý do.
      handleApiError(err, {
        toast: t("app.profile.toast.passwordFailed"),
        context: "profile.changePassword",
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  return {
    openProfile,
    setOpenProfile,
    openProfileModal,
    profileDisplayName,
    profileAvatarDataUrl,
    profileSaving,
    currentPassword,
    newPassword,
    confirmPassword,
    passwordSaving,
    setProfileDisplayName,
    setCurrentPassword,
    setNewPassword,
    setConfirmPassword,
    onAvatarPicked,
    removeAvatar,
    saveProfile,
    savePassword,
  };
}
