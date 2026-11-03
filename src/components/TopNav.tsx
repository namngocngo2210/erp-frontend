import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  BellRing,
  ChevronDown,
  Clock3,
  Fingerprint,
  FileSpreadsheet,
  Menu,
  Package,
  UserCircle2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n";

type Props = {
  unreadCount: number;
  notifications: Array<{
    id: string;
    orderId: number | null;
    content: string;
    timeLabel: string;
    unread: boolean;
  }>;
  onMarkAllNotificationsRead: () => void;
  onMarkNotificationRead: (notificationId: string) => void;
  username: string;
  displayName: string;
  avatarDataUrl: string;
  onLogout: () => Promise<void>;
  onOpenProfile: () => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobileNav?: () => void;
  moduleLabel?: string;
  /** Số job xuất file đang pending/running (ExportJobsProvider.activeCount) —
   * 0 hoặc undefined thì không hiện badge. Đóng ExportDock KHÔNG huỷ job đang
   * chạy nền, nên đây là đường DUY NHẤT để mở lại panel sau khi đã đóng. */
  exportActiveCount?: number;
  onOpenExports?: () => void;
};

export function TopNav({
  unreadCount,
  notifications,
  onMarkAllNotificationsRead,
  onMarkNotificationRead,
  username,
  displayName,
  avatarDataUrl,
  onLogout,
  onOpenProfile,
  sidebarCollapsed,
  onToggleSidebar,
  onOpenMobileNav,
  moduleLabel,
  exportActiveCount = 0,
  onOpenExports,
}: Props) {
  const { language, setLanguage, t } = useI18n();
  const navigate = useNavigate();
  const [openNotifications, setOpenNotifications] = useState(false);

  const initials = useMemo(() => {
    const source = (displayName || username || "U").trim();
    if (!source) return "U";
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
  }, [displayName, username]);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-white text-foreground">
      <div className="flex min-h-14 items-center justify-between gap-3 px-3 py-2 md:h-14 md:px-4 md:py-0">
        <button
          type="button"
          onClick={() => onOpenMobileNav?.()}
          className="grid h-10 w-10 place-items-center rounded-md text-muted-foreground hover:bg-accent/60 hover:text-foreground lg:hidden"
          title={t("topnav.expandSidebar")}
          aria-label={t("topnav.expandSidebar")}
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onToggleSidebar}
          className="hidden h-10 w-10 place-items-center rounded-md text-muted-foreground hover:bg-accent/60 hover:text-foreground lg:grid"
          title={sidebarCollapsed ? t("topnav.expandSidebar") : t("topnav.collapseSidebar")}
          aria-label={sidebarCollapsed ? t("topnav.expandSidebar") : t("topnav.collapseSidebar")}
          aria-pressed={sidebarCollapsed}
        >
          <Menu className="h-5 w-5" />
        </button>
        {moduleLabel && (
          <span className="hidden text-sm font-medium text-foreground md:inline">
            {moduleLabel}
          </span>
        )}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-2 py-1 text-base leading-none text-primary transition-colors ${language === "vi" ? "bg-primary/15" : "hover:bg-primary/5"}`}
              title={t("lang.vi")}
              aria-label={t("lang.vi")}
              aria-pressed={language === "vi"}
              onClick={() => setLanguage("vi")}
            >
              VN
            </button>
            <button
              type="button"
              className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-2 py-1 text-base leading-none text-primary transition-colors ${language === "en" ? "bg-primary/15" : "hover:bg-primary/5"}`}
              title={t("lang.en")}
              aria-label={t("lang.en")}
              aria-pressed={language === "en"}
              onClick={() => setLanguage("en")}
            >
              GB
            </button>
          </div>

          {onOpenExports && (
            <button
              type="button"
              onClick={onOpenExports}
              className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border bg-white p-0 transition-colors hover:bg-accent/60"
              title="Xuất file"
              aria-label="Xuất file"
            >
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              {exportActiveCount > 0 && (
                <Badge className="absolute right-0 top-0 flex h-5 min-w-5 -translate-y-1/3 translate-x-1/3 items-center justify-center rounded-full border border-primary bg-destructive px-1 text-2xs font-semibold leading-none text-destructive-foreground">
                  {exportActiveCount}
                </Badge>
              )}
            </button>
          )}

          <div className="hidden md:block">
            <Popover open={openNotifications} onOpenChange={setOpenNotifications}>
              <PopoverTrigger
                className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border bg-white p-0 transition-colors hover:bg-accent/60"
                aria-label="Notifications"
              >
                <BellRing className="h-4 w-4 text-primary" />
                {unreadCount > 0 && (
                  <Badge className="absolute right-0 top-0 flex h-5 min-w-5 -translate-y-1/3 translate-x-1/3 items-center justify-center rounded-full border border-primary bg-destructive px-1 text-2xs font-semibold leading-none text-destructive-foreground">
                    {unreadCount}
                  </Badge>
                )}
              </PopoverTrigger>
              <PopoverContent className="w-[min(20rem,calc(100vw-1.5rem))] p-0 shadow-2xl">
                <div className="flex items-center justify-between border-b border-border/80 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-primary">
                      <Bell className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-semibold">Thông báo</p>
                  </div>
                  <button
                    type="button"
                    className="text-xs font-medium text-primary transition-colors hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => {
                      onMarkAllNotificationsRead();
                      setOpenNotifications(false);
                    }}
                    disabled={notifications.length === 0 || unreadCount === 0}
                  >
                    Đã xem tất cả
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                      Chưa có thông báo
                    </p>
                  ) : (
                    <ul className="space-y-2 p-2">
                      {notifications.map((item) => (
                        <li
                          key={item.id}
                          className={`cursor-pointer rounded-xl border px-3 py-2.5 transition-colors hover:bg-accent/30 ${
                            item.unread
                              ? "border-primary/25 bg-primary/5"
                              : "border-border/70 bg-background/50"
                          }`}
                          onClick={() => onMarkNotificationRead(item.id)}
                        >
                          <div className="flex items-start gap-2.5">
                            <div
                              className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                                item.unread
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              <Package className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm leading-5">{item.content}</p>
                              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock3 className="h-3.5 w-3.5" />
                                <span>{item.timeLabel}</span>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex min-h-11 items-center gap-2 rounded-full border border-border bg-white px-2 py-1 text-left transition-colors hover:bg-accent/60"
                aria-label={t("topnav.profile")}
              >
                {avatarDataUrl ? (
                  <img
                    src={avatarDataUrl}
                    alt="Avatar"
                    className="h-8 w-8 rounded-full border border-primary-foreground/60 object-cover"
                  />
                ) : (
                  <div className="grid h-8 w-8 place-items-center rounded-full border border-primary-foreground/60 bg-background text-xs font-semibold text-primary">
                    {initials}
                  </div>
                )}
                <div className="hidden min-w-0 md:block">
                  <p className="max-w-36 truncate text-xs font-semibold text-foreground">
                    {displayName || username}
                  </p>
                  <p className="max-w-36 truncate text-xs text-muted-foreground">@{username}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={onOpenProfile}>
                <UserCircle2 className="h-4 w-4" />
                {t("topnav.profile")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/hr/check-in")}>
                <Fingerprint className="h-4 w-4" />
                {t("hr.checkin.navLink", "Chấm công")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onLogout().catch(() => null)}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                {t("topnav.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
