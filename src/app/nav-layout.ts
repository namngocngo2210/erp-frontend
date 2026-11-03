import { Settings, type LucideIcon } from "lucide-react";

import { APP_MODULES, type ModuleAccent, type ModuleSection } from "@/app/modules";
import { type AppSection } from "@/lib/routes";

/** Section phẳng ở đầu sidebar — bấm điều hướng thẳng, không qua accordion. */
export const SIDEBAR_PINNED: AppSection[] = [
  "overview-report",
  "dashboard",
  "ads-report",
  "foxia-report",
  "customer-explorer",
  "call-quality",
];

export type SidebarZone = {
  /** Định danh zone — cũng là hậu tố key của group Cài đặt (`settings:<key>`). */
  key: string;
  labelKey: string;
  moduleKeys: string[];
  /**
   * Section cấu hình đặt vào dropdown "Cài đặt" ở CUỐI zone này. Section vẫn
   * thuộc module gốc (giữ URL, quyền, nhãn TopNav, App Launcher) — chỉ vị trí
   * trên sidebar đổi; nó bị loại khỏi group của module gốc như `SIDEBAR_PINNED`.
   */
  settings?: AppSection[];
};

/** Nhóm module bên dưới block phẳng, theo đúng thứ tự hiển thị. */
export const SIDEBAR_ZONES: SidebarZone[] = [
  {
    key: "ops",
    labelKey: "sidebar.zone.ops",
    moduleKeys: ["sales", "cskh", "crm", "aftersales"],
    settings: ["lead-assignment", "foxia-link", "pancake", "pancake-pos", "contact_flow"],
  },
  {
    key: "warehouse",
    labelKey: "sidebar.zone.warehouse",
    moduleKeys: ["inventory", "catalog"],
  },
  {
    key: "marketing",
    labelKey: "sidebar.zone.marketing",
    moduleKeys: ["marketing"],
    settings: ["channels", "kiotviet"],
  },
  {
    key: "media",
    labelKey: "sidebar.zone.media",
    moduleKeys: ["media"],
  },
  {
    key: "utilities",
    labelKey: "sidebar.zone.utilities",
    moduleKeys: ["utilities"],
  },
  {
    key: "hr",
    labelKey: "sidebar.zone.hr",
    moduleKeys: ["hr"],
    settings: ["attendance-locations"],
  },
  {
    key: "settings",
    labelKey: "sidebar.zone.settings",
    moduleKeys: ["settings"],
    settings: ["system-settings"],
  },
];

/** Diện mạo chung của mọi dropdown "Cài đặt" theo zone (không gắn module nào). */
const SETTINGS_GROUP_ICON: LucideIcon = Settings;
const SETTINGS_GROUP_ACCENT: ModuleAccent = {
  chip: "bg-slate-400",
  tile: "bg-slate-500/15 text-slate-600",
};

export type NavGroup = {
  key: string;
  labelKey: string;
  icon: LucideIcon;
  accent: ModuleAccent;
  items: ModuleSection[];
};

export type NavZone = {
  labelKey: string;
  groups: NavGroup[];
};

export type NavModel = {
  pinned: ModuleSection[];
  zones: NavZone[];
  /** Module chứa section active (null nếu active là item phẳng). */
  activeGroupKey: string | null;
};

const PINNED_SET = new Set<AppSection>(SIDEBAR_PINNED);
/** Section đã chuyển vào dropdown Cài đặt của zone — không hiện ở module gốc nữa. */
const ZONE_SETTINGS_SET = new Set<AppSection>(SIDEBAR_ZONES.flatMap((z) => z.settings ?? []));
const sectionByKey = new Map(
  APP_MODULES.flatMap((m) => m.sections.map((s) => [s.key, s] as const)),
);

function canSee(section: ModuleSection, allowed: Set<string>): boolean {
  if (section.hidden) return false;
  return section.requiresAny
    ? section.requiresAny.some((x) => allowed.has(x))
    : allowed.has(section.requires ?? section.key);
}

/**
 * Model điều hướng sidebar: item phẳng + zone module (đã lọc RBAC).
 * Pure function để unit test không cần render; Sidebar bọc trong useMemo.
 */
export function buildNavModel(active: AppSection, allowedSections: string[]): NavModel {
  const allowed = new Set(allowedSections);

  const pinned = SIDEBAR_PINNED.flatMap((key) => {
    const section = sectionByKey.get(key);
    return section && canSee(section, allowed) ? [section] : [];
  });

  const zones = SIDEBAR_ZONES.map((zone) => {
    const groups: NavGroup[] = zone.moduleKeys.flatMap((moduleKey) => {
      const m = APP_MODULES.find((x) => x.key === moduleKey);
      if (!m) return [];
      const items = m.sections.filter(
        (s) => !PINNED_SET.has(s.key) && !ZONE_SETTINGS_SET.has(s.key) && canSee(s, allowed),
      );
      return items.length > 0
        ? [{ key: m.key, labelKey: m.labelKey, icon: m.icon, accent: m.accent, items }]
        : [];
    });
    const settingsItems = (zone.settings ?? []).flatMap((key) => {
      const section = sectionByKey.get(key);
      return section && canSee(section, allowed) ? [section] : [];
    });
    if (settingsItems.length > 0) {
      groups.push({
        key: `settings:${zone.key}`,
        labelKey: "sidebar.group.settings",
        icon: SETTINGS_GROUP_ICON,
        accent: SETTINGS_GROUP_ACCENT,
        items: settingsItems,
      });
    }
    return { labelKey: zone.labelKey, groups };
  }).filter((zone) => zone.groups.length > 0);

  const activeGroupKey =
    zones.flatMap((z) => z.groups).find((g) => g.items.some((i) => i.key === active))?.key ?? null;

  return { pinned, zones, activeGroupKey };
}
