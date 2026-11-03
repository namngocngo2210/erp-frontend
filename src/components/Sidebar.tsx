import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronRight, X } from "lucide-react";

import { useI18n } from "@/i18n";
import { pathFromSection, type AppSection } from "@/lib/routes";
import { type ModuleSection } from "@/app/modules";
import { buildNavModel, type NavGroup, type NavZone } from "@/app/nav-layout";

function shouldHandleNavClick(event: React.MouseEvent<HTMLAnchorElement>): boolean {
  // Cho phép middle-click, ctrl/cmd/shift-click rơi xuống hành vi mặc định
  // của thẻ <a> để mở tab mới (giống Chrome).
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

type Props = {
  active: AppSection;
  allowedSections: string[];
  collapsed: boolean;
  onChange: (value: AppSection) => void;
};

type MobileNavDrawerProps = {
  active: AppSection;
  allowedSections: string[];
  open: boolean;
  onChange: (value: AppSection) => void;
  onClose: () => void;
};

/** Chip icon module — màu nhận diện riêng từng module (đồng bộ App Launcher). */
function ModuleIconChip({ group, active }: { group: NavGroup; active: boolean }) {
  const Icon = group.icon;
  return (
    <span
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-md text-white shadow-sm ${group.accent.chip} ${
        active ? "ring-2 ring-white/40" : ""
      }`}
    >
      <Icon className="h-[18px] w-[18px]" />
    </span>
  );
}

/** Logo header DESI (về trang đơn hàng). */
function SidebarBrand({
  collapsed,
  onChange,
}: {
  collapsed: boolean;
  onChange: (value: AppSection) => void;
}) {
  const { t } = useI18n();
  return (
    <div
      className={`flex h-14 items-center border-b border-primary-foreground/20 ${
        collapsed ? "justify-center px-2" : "px-3"
      }`}
    >
      <a
        href={pathFromSection("orders")}
        className="flex items-center gap-2 rounded-md px-1 py-1 text-left hover:bg-primary-foreground/10"
        onClick={(event) => {
          if (!shouldHandleNavClick(event)) return;
          event.preventDefault();
          onChange("orders");
        }}
        title={t("sidebar.homeTitle")}
        aria-label={t("sidebar.homeTitle")}
      >
        <img
          src="/logo.jpg"
          alt="DESI logo"
          className="h-9 w-9 rounded-lg border border-primary-foreground/40 bg-background object-contain p-0.5 shadow-xs"
        />
        {!collapsed && (
          <p className="display-face text-base font-semibold tracking-tight text-primary-foreground">
            DESI
          </p>
        )}
      </a>
    </div>
  );
}

/** Item section (dùng chung cho accordion desktop và mobile). */
function SectionLink({
  item,
  active,
  onSelect,
}: {
  item: ModuleSection;
  active: AppSection;
  onSelect: () => void;
}) {
  const { t } = useI18n();
  const ItemIcon = item.icon;
  const isActive = active === item.key;
  return (
    <a
      href={pathFromSection(item.key)}
      onClick={(event) => {
        if (!shouldHandleNavClick(event)) return;
        event.preventDefault();
        onSelect();
      }}
      className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
        isActive
          ? "bg-white/15 font-medium text-white"
          : "text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-white"
      }`}
    >
      <span
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-md ${
          isActive ? "bg-white/20" : "bg-primary-foreground/10"
        }`}
      >
        <ItemIcon className="h-4 w-4" />
      </span>
      <span className="flex-1 truncate">{t(item.labelKey)}</span>
    </a>
  );
}

/** Header nhóm zone (chữ hoa, mờ) — dùng chung accordion desktop và mobile. */
function ZoneLabel({ labelKey }: { labelKey: string }) {
  const { t } = useI18n();
  return (
    <p className="px-2.5 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-primary-foreground/50">
      {t(labelKey)}
    </p>
  );
}

/** Block item phẳng đầu sidebar (các trang báo cáo). */
function PinnedList({
  pinned,
  active,
  onSelect,
}: {
  pinned: ModuleSection[];
  active: AppSection;
  onSelect: (key: AppSection) => void;
}) {
  if (pinned.length === 0) return null;
  return (
    <ul className="space-y-0.5">
      {pinned.map((item) => (
        <li key={item.key}>
          <SectionLink item={item} active={active} onSelect={() => onSelect(item.key)} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Sidebar đầy đủ (Odoo cũ): liệt kê tất cả module + section trong một sidebar.
 * - Mở rộng (w-72): accordion inline, mặc định mở nhóm chứa section đang đứng.
 * - Thu gọn (w-16): rail icon, hover/click mở flyout popover các section.
 */
export function Sidebar({ active, allowedSections, collapsed, onChange }: Props) {
  const { pinned, zones, activeGroupKey } = useMemo(
    () => buildNavModel(active, allowedSections),
    [active, allowedSections],
  );
  // w-72 để nhãn dài nhất ("Hiệu quả marketing (Foxia)", "Cấu hình liên kết Foxia")
  // hiện trọn, không bị truncate — khớp bề rộng drawer mobile.
  const sidebarWidth = collapsed ? "w-16" : "w-72";

  return (
    <aside
      className={`sticky top-0 z-30 hidden h-dvh shrink-0 flex-col border-r border-primary-foreground/20 bg-primary text-primary-foreground transition-[width] duration-200 lg:flex ${sidebarWidth}`}
    >
      <SidebarBrand collapsed={collapsed} onChange={onChange} />
      {collapsed ? (
        <SidebarRail
          pinned={pinned}
          zones={zones}
          active={active}
          activeGroupKey={activeGroupKey}
          onChange={onChange}
        />
      ) : (
        <SidebarAccordion
          pinned={pinned}
          zones={zones}
          active={active}
          activeGroupKey={activeGroupKey}
          onChange={onChange}
        />
      )}
    </aside>
  );
}

/** Desktop mở rộng: accordion inline. */
function SidebarAccordion({
  pinned,
  zones,
  active,
  activeGroupKey,
  onChange,
}: {
  pinned: ModuleSection[];
  zones: NavZone[];
  active: AppSection;
  activeGroupKey: string | null;
  onChange: (value: AppSection) => void;
}) {
  const { t } = useI18n();
  const [expandedGroup, setExpandedGroup] = useState<string | null>(activeGroupKey);

  // Khi điều hướng sang module khác, tự mở nhóm chứa section đang đứng.
  useEffect(() => {
    if (activeGroupKey) setExpandedGroup(activeGroupKey);
  }, [activeGroupKey]);

  return (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2">
      <PinnedList pinned={pinned} active={active} onSelect={onChange} />
      {zones.map((zone) => (
        <div key={zone.labelKey}>
          <ZoneLabel labelKey={zone.labelKey} />
          <ul className="space-y-1">
            {zone.groups.map((group) => {
              const isExpanded = expandedGroup === group.key;
              const isActiveGroup = activeGroupKey === group.key;
              return (
                <li key={group.key}>
                  <button
                    type="button"
                    onClick={() => setExpandedGroup(isExpanded ? null : group.key)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                      isActiveGroup || isExpanded
                        ? "bg-primary-foreground/15 text-white"
                        : "text-primary-foreground/85 hover:bg-primary-foreground/10 hover:text-white"
                    }`}
                    aria-expanded={isExpanded}
                  >
                    <ModuleIconChip group={group} active={isActiveGroup} />
                    <span className="flex-1 truncate text-sm font-medium">{t(group.labelKey)}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-primary-foreground/60 transition-transform ${
                        isExpanded ? "rotate-180 text-white" : ""
                      }`}
                    />
                  </button>
                  <div
                    className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                      isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <ul className="mt-1 space-y-0.5 pl-2">
                        {group.items.map((item) => (
                          <li key={item.key}>
                            <SectionLink
                              item={item}
                              active={active}
                              onSelect={() => onChange(item.key)}
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Desktop thu gọn: rail icon + flyout popover (portal) các section khi hover/click. */
function SidebarRail({
  pinned,
  zones,
  active,
  activeGroupKey,
  onChange,
}: {
  pinned: ModuleSection[];
  zones: NavZone[];
  active: AppSection;
  activeGroupKey: string | null;
  onChange: (value: AppSection) => void;
}) {
  const { t } = useI18n();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [flyoutPos, setFlyoutPos] = useState<{ top: number; left: number } | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const flyoutRef = useRef<HTMLDivElement | null>(null);

  const cancelClose = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimerRef.current = window.setTimeout(() => setOpenGroup(null), 120);
  };

  const updateFlyoutPosition = (groupKey: string) => {
    const trigger = triggerRefs.current[groupKey];
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setFlyoutPos({ top: rect.top, left: rect.right + 8 });
  };

  const openGroupAt = (groupKey: string) => {
    cancelClose();
    setOpenGroup(groupKey);
    updateFlyoutPosition(groupKey);
  };

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!openGroup) return;
    const reposition = () => updateFlyoutPosition(openGroup);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [openGroup]);

  useEffect(() => {
    if (!openGroup) return;
    const onClickOutside = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;
      const trigger = triggerRefs.current[openGroup];
      const flyout = flyoutRef.current;
      if (trigger && trigger.contains(event.target)) return;
      if (flyout && flyout.contains(event.target)) return;
      setOpenGroup(null);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [openGroup]);

  const openGroupData = openGroup
    ? zones.flatMap((z) => z.groups).find((g) => g.key === openGroup)
    : undefined;

  return (
    <>
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-1.5 py-2">
        {pinned.length > 0 && (
          <ul className="space-y-1">
            {pinned.map((item) => {
              const ItemIcon = item.icon;
              const isActive = active === item.key;
              return (
                <li key={item.key}>
                  <a
                    href={pathFromSection(item.key)}
                    onClick={(event) => {
                      if (!shouldHandleNavClick(event)) return;
                      event.preventDefault();
                      onChange(item.key);
                    }}
                    title={t(item.labelKey)}
                    className={`flex w-full items-center justify-center rounded-lg px-2 py-2 transition-colors ${
                      isActive
                        ? "bg-primary-foreground/15 text-white"
                        : "text-primary-foreground/85 hover:bg-primary-foreground/10 hover:text-white"
                    }`}
                  >
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${
                        isActive ? "bg-white/15" : ""
                      }`}
                    >
                      <ItemIcon className="h-[18px] w-[18px]" />
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
        {zones.map((zone, i) => (
          <div key={zone.labelKey}>
            {(i > 0 || pinned.length > 0) && (
              <div aria-hidden className="mx-2 my-2 border-t border-primary-foreground/15" />
            )}
            <ul className="space-y-1">
              {zone.groups.map((group) => {
                const isActiveGroup = activeGroupKey === group.key;
                const isOpen = openGroup === group.key;
                return (
                  <li
                    key={group.key}
                    onMouseEnter={() => openGroupAt(group.key)}
                    onMouseLeave={scheduleClose}
                  >
                    <button
                      type="button"
                      ref={(el) => {
                        triggerRefs.current[group.key] = el;
                      }}
                      onClick={() => (isOpen ? setOpenGroup(null) : openGroupAt(group.key))}
                      className={`flex w-full items-center justify-center rounded-lg px-2 py-2 transition-colors ${
                        isActiveGroup || isOpen
                          ? "bg-primary-foreground/15 text-white"
                          : "text-primary-foreground/85 hover:bg-primary-foreground/10 hover:text-white"
                      }`}
                      title={t(group.labelKey)}
                      aria-haspopup="menu"
                      aria-expanded={isOpen}
                    >
                      <ModuleIconChip group={group} active={isActiveGroup} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {openGroupData &&
        flyoutPos &&
        createPortal(
          <div
            ref={flyoutRef}
            className="fixed z-60 min-w-64 rounded-xl border border-primary-foreground/20 bg-primary p-1.5 text-primary-foreground shadow-2xl animate-in fade-in-0 zoom-in-95 slide-in-from-left-1 duration-100"
            style={{ top: flyoutPos.top, left: flyoutPos.left }}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            role="menu"
          >
            <p className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary-foreground/60">
              {t(openGroupData.labelKey)}
            </p>
            <ul className="space-y-0.5">
              {openGroupData.items.map((item) => (
                <li key={item.key}>
                  <SectionLink
                    item={item}
                    active={active}
                    onSelect={() => {
                      onChange(item.key);
                      setOpenGroup(null);
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}

/** Mobile: accordion inline trong drawer trượt trái. */
export function MobileNavDrawer({
  active,
  allowedSections,
  open,
  onChange,
  onClose,
}: MobileNavDrawerProps) {
  const { t } = useI18n();
  const { pinned, zones, activeGroupKey } = useMemo(
    () => buildNavModel(active, allowedSections),
    [active, allowedSections],
  );
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  useEffect(() => {
    if (open) setExpandedGroup(activeGroupKey);
  }, [open, activeGroupKey]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label={t("common.close", "Đóng")}
        className="absolute inset-0 bg-black/50 animate-in fade-in-0 duration-200"
        onClick={onClose}
      />
      <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-primary text-primary-foreground shadow-2xl animate-in slide-in-from-left duration-200 ease-out">
        <div className="flex h-14 items-center justify-between border-b border-primary-foreground/20 px-3">
          <a
            href={pathFromSection("orders")}
            className="flex items-center gap-2 rounded-md px-1 py-1 text-left hover:bg-primary-foreground/10"
            onClick={(event) => {
              if (!shouldHandleNavClick(event)) return;
              event.preventDefault();
              onChange("orders");
              onClose();
            }}
          >
            <img
              src="/logo.jpg"
              alt="DESI logo"
              className="h-9 w-9 rounded-lg border border-primary-foreground/40 bg-background object-contain p-0.5 shadow-xs"
            />
            <p className="display-face text-base font-semibold tracking-tight text-primary-foreground">
              DESI
            </p>
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close", "Đóng")}
            className="grid h-9 w-9 place-items-center rounded-md text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-2">
          <PinnedList
            pinned={pinned}
            active={active}
            onSelect={(key) => {
              onChange(key);
              onClose();
            }}
          />
          {zones.map((zone) => (
            <div key={zone.labelKey}>
              <ZoneLabel labelKey={zone.labelKey} />
              <ul className="space-y-1">
                {zone.groups.map((group) => {
                  const isExpanded = expandedGroup === group.key;
                  const isActiveGroup = activeGroupKey === group.key;
                  return (
                    <li key={group.key}>
                      <button
                        type="button"
                        onClick={() => setExpandedGroup(isExpanded ? null : group.key)}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                          isActiveGroup || isExpanded
                            ? "bg-primary-foreground/15 text-white"
                            : "text-primary-foreground/85 hover:bg-primary-foreground/10 hover:text-white"
                        }`}
                        aria-expanded={isExpanded}
                      >
                        <ModuleIconChip group={group} active={isActiveGroup} />
                        <span className="flex-1 truncate text-sm font-medium">
                          {t(group.labelKey)}
                        </span>
                        <ChevronRight
                          className={`h-4 w-4 text-primary-foreground/60 transition-transform ${
                            isExpanded ? "rotate-90 text-white" : ""
                          }`}
                        />
                      </button>
                      <div
                        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                        }`}
                      >
                        <div className="overflow-hidden">
                          <ul className="mt-1 space-y-0.5 pl-2">
                            {group.items.map((item) => (
                              <li key={item.key}>
                                <SectionLink
                                  item={item}
                                  active={active}
                                  onSelect={() => {
                                    onChange(item.key);
                                    onClose();
                                  }}
                                />
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </div>,
    document.body,
  );
}
