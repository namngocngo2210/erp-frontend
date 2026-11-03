import { MobileNavDrawer, Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { ProfileDialog } from "@/app/profile-dialog";
import { useExportJobs } from "@/features/exports/ExportJobsProvider";
import { useI18n } from "@/i18n";
import { useAppUI } from "@/app/AppShellContext";
import { SECTION_TO_MODULE } from "@/app/modules";
import { type AppSection } from "@/lib/routes";

/**
 * Shell chrome consumers.
 *
 * Mỗi component dưới đây consume {@link useAppUI} riêng, nên khi UI state biến
 * động cao (notifications, sidebar collapse, mobile nav, profile dialog) đổi thì
 * chỉ chrome re-render — RootLayout và `<Outlet/>` (các page/grid) đứng yên.
 * `section` / `allowedSections` / nav handler vẫn nhận qua props từ RootLayout
 * để giữ nguyên layout skeleton.
 */

type ShellChromeUser = {
  username: string;
  display_name: string;
  avatar_data_url: string;
};

export function ShellSidebar({
  section,
  allowedSections,
  onNavigateSection,
}: {
  section: AppSection;
  allowedSections: string[];
  onNavigateSection: (section: AppSection) => void;
}) {
  const { sidebarCollapsed } = useAppUI();
  return (
    <Sidebar
      active={section}
      allowedSections={allowedSections}
      collapsed={sidebarCollapsed}
      onChange={onNavigateSection}
    />
  );
}

export function ShellMobileNav({
  section,
  allowedSections,
  onNavigateSection,
}: {
  section: AppSection;
  allowedSections: string[];
  onNavigateSection: (section: AppSection) => void;
}) {
  const { mobileNavOpen, setMobileNavOpen } = useAppUI();
  return (
    <MobileNavDrawer
      active={section}
      allowedSections={allowedSections}
      open={mobileNavOpen}
      onChange={onNavigateSection}
      onClose={() => setMobileNavOpen(false)}
    />
  );
}

export function ShellTopNav({
  user,
  section,
  logout,
}: {
  user: ShellChromeUser;
  section: AppSection;
  logout: () => Promise<void>;
}) {
  const { t } = useI18n();
  const {
    notifications,
    unreadCount,
    markAllNotificationsRead,
    markNotificationRead,
    sidebarCollapsed,
    setSidebarCollapsed,
    setMobileNavOpen,
    openProfileModal,
  } = useAppUI();
  // `activeCount`/`setOpen` từ ExportJobsProvider (mount ở App.tsx, bọc quanh cả
  // shell) — đóng ExportDock chỉ ẩn UI, job vẫn chạy nền; icon này là đường DUY
  // NHẤT để mở lại panel sau khi đã đóng (trước đây không có, xem
  // final-fix-report mục 7).
  const { activeCount, setOpen: setExportsOpen } = useExportJobs();
  return (
    <TopNav
      unreadCount={unreadCount}
      notifications={notifications}
      onMarkAllNotificationsRead={markAllNotificationsRead}
      onMarkNotificationRead={markNotificationRead}
      username={user.username}
      displayName={user.display_name}
      avatarDataUrl={user.avatar_data_url}
      onOpenProfile={openProfileModal}
      onLogout={logout}
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
      onOpenMobileNav={() => setMobileNavOpen(true)}
      moduleLabel={t(SECTION_TO_MODULE[section].shortLabelKey)}
      exportActiveCount={activeCount}
      onOpenExports={() => setExportsOpen(true)}
    />
  );
}

export function ShellProfileDialog({ user }: { user: ShellChromeUser }) {
  const { t } = useI18n();
  const {
    openProfile,
    setOpenProfile,
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
  } = useAppUI();
  return (
    <ProfileDialog
      open={openProfile}
      onOpenChange={setOpenProfile}
      user={{ username: user.username, display_name: user.display_name }}
      profileDisplayName={profileDisplayName}
      profileAvatarDataUrl={profileAvatarDataUrl}
      profileSaving={profileSaving}
      currentPassword={currentPassword}
      newPassword={newPassword}
      confirmPassword={confirmPassword}
      passwordSaving={passwordSaving}
      t={t}
      onAvatarPicked={onAvatarPicked}
      onProfileDisplayNameChange={setProfileDisplayName}
      onCurrentPasswordChange={setCurrentPassword}
      onNewPasswordChange={setNewPassword}
      onConfirmPasswordChange={setConfirmPassword}
      onRemoveAvatar={removeAvatar}
      onSaveProfile={saveProfile}
      onSavePassword={savePassword}
    />
  );
}
