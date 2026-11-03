import {
  BadgeDollarSign,
  BarChart3,
  Boxes,
  Building2,
  CalendarDays,
  Clapperboard,
  ClipboardList,
  Compass,
  Contact,
  Database,
  FileText,
  Film,
  FolderTree,
  Gauge,
  Headphones,
  History,
  Lightbulb,
  MapPin,
  MapPinned,
  Medal,
  Megaphone,
  MessageSquare,
  Package,
  PackageSearch,
  PhoneCall,
  Plug,
  QrCode,
  RadioTower,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Store,
  Tags,
  Truck,
  Users,
  UsersRound,
  Wallet,
  Warehouse,
  Waves,
  Workflow,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { type AppSection } from "@/lib/routes";

export type ModuleSection = {
  key: AppSection;
  labelKey: string;
  icon: LucideIcon;
  /**
   * Key quyền dùng thay cho `key` khi kiểm tra `allowed_sections` (mirror
   * SECTION_PERMISSION). Có thể là section RBAC không có trang riêng, vd `salaries`.
   */
  requires?: string;
  /** Hiện tab nếu user có BẤT KỲ section nào trong danh sách (OR logic). */
  requiresAny?: AppSection[];
  /**
   * Ẩn khỏi sidebar/nav nhưng vẫn giữ trong SECTION_TO_MODULE để route
   * truy cập trực tiếp qua URL không crash shell (khác "returns": không có tab).
   */
  hidden?: boolean;
};

/** Màu nhận diện riêng của mỗi module — dùng nhất quán ở sidebar + App Launcher. */
export type ModuleAccent = {
  /** Chip icon trên sidebar (nền xanh đậm): màu bão hòa, icon trắng. */
  chip: string;
  /** Tile icon ở App Launcher (nền sáng): tint nhạt cùng hue. */
  tile: string;
};

export type AppModule = {
  key: string;
  labelKey: string;
  shortLabelKey: string;
  icon: LucideIcon;
  accent: ModuleAccent;
  basePath: string;
  sections: ModuleSection[];
};

export const APP_MODULES: AppModule[] = [
  {
    key: "sales",
    labelKey: "sidebar.group.orders",
    shortLabelKey: "module.sales",
    icon: ShoppingCart,
    accent: { chip: "bg-sky-400", tile: "bg-sky-500/15 text-sky-600" },
    basePath: "/sales",
    sections: [
      { key: "orders", labelKey: "topnav.tabs.orders", icon: ShoppingBag },
      { key: "landing-orders", labelKey: "topnav.tabs.landingOrders", icon: RadioTower },
      { key: "koc-orders", labelKey: "topnav.tabs.kocOrders", icon: Sparkles },
    ],
  },
  {
    // CSKH dùng chung basePath "/sales" vì SECTION_TO_PATH khai báo URL tường minh
    // (/sales/contacts, ...) — tách module KHÔNG đổi URL, không cần redirect.
    key: "cskh",
    labelKey: "sidebar.group.cskh",
    shortLabelKey: "module.cskh",
    icon: Headphones,
    accent: { chip: "bg-cyan-400", tile: "bg-cyan-500/15 text-cyan-600" },
    basePath: "/sales",
    sections: [
      { key: "contacts", labelKey: "topnav.tabs.contacts", icon: Contact },
      { key: "floating-pool", labelKey: "topnav.tabs.floatingPool", icon: Waves },
      { key: "resale-tracking", labelKey: "topnav.tabs.resaleTracking", icon: PhoneCall },
      { key: "pancake-leads", labelKey: "topnav.tabs.pancakeLeads", icon: MessageSquare },
    ],
  },
  {
    key: "crm",
    labelKey: "sidebar.group.customers",
    shortLabelKey: "module.crm",
    icon: Users,
    accent: {
      chip: "bg-violet-400",
      tile: "bg-violet-500/15 text-violet-600",
    },
    basePath: "/crm",
    sections: [
      { key: "customers", labelKey: "topnav.tabs.customers", icon: Contact },
      { key: "loyal-customers", labelKey: "topnav.tabs.loyalCustomers", icon: Medal },
    ],
  },
  {
    key: "inventory",
    labelKey: "sidebar.group.warehouse",
    shortLabelKey: "module.inventory",
    icon: Warehouse,
    accent: {
      chip: "bg-emerald-400",
      tile: "bg-emerald-500/15 text-emerald-600",
    },
    basePath: "/inventory",
    sections: [
      { key: "shipments", labelKey: "topnav.tabs.shipments", icon: Truck },
      { key: "stock", labelKey: "topnav.tabs.stock", icon: Boxes },
      {
        key: "dispatch-history",
        labelKey: "topnav.tabs.dispatchHistory",
        icon: History,
        requires: "stock",
      },
      {
        key: "stock-documents",
        labelKey: "topnav.tabs.stockDocuments",
        icon: ClipboardList,
        requiresAny: ["stock-documents", "returns"],
      },
      { key: "warehouses", labelKey: "topnav.tabs.warehouses", icon: Warehouse },
    ],
  },
  {
    key: "catalog",
    labelKey: "sidebar.group.catalog",
    shortLabelKey: "module.catalog",
    icon: Package,
    accent: {
      chip: "bg-orange-400",
      tile: "bg-orange-500/15 text-orange-600",
    },
    basePath: "/catalog",
    sections: [
      { key: "products", labelKey: "topnav.tabs.products", icon: Package },
      { key: "product-categories", labelKey: "topnav.tabs.productCategories", icon: FolderTree },
    ],
  },
  {
    key: "marketing",
    labelKey: "sidebar.group.marketing",
    shortLabelKey: "module.marketing",
    icon: Megaphone,
    accent: {
      chip: "bg-fuchsia-400",
      tile: "bg-fuchsia-500/15 text-fuchsia-600",
    },
    basePath: "/marketing",
    sections: [
      { key: "facebook-ads", labelKey: "topnav.tabs.facebookAds", icon: Megaphone },
      { key: "google-ads", labelKey: "topnav.tabs.googleAds", icon: BadgeDollarSign },
    ],
  },
  {
    key: "media",
    labelKey: "sidebar.group.media",
    shortLabelKey: "module.media",
    icon: Clapperboard,
    accent: {
      chip: "bg-indigo-400",
      tile: "bg-indigo-500/15 text-indigo-600",
    },
    basePath: "/media",
    // Menu hiện theo provisioning từng user (backend thêm 5 section này vào
    // allowed_sections khi user có key riêng hoặc vai trò Media) — không qua role RBAC.
    sections: [
      { key: "media-explore", labelKey: "topnav.tabs.mediaExplore", icon: Compass },
      { key: "media-contents", labelKey: "topnav.tabs.mediaContents", icon: Film },
      { key: "media-proposals", labelKey: "topnav.tabs.mediaProposals", icon: Lightbulb },
      { key: "media-reports", labelKey: "topnav.tabs.mediaReports", icon: BarChart3 },
      { key: "media-taxonomy", labelKey: "topnav.tabs.mediaTaxonomy", icon: Tags },
    ],
  },
  {
    key: "aftersales",
    labelKey: "sidebar.group.aftersales",
    shortLabelKey: "module.aftersales",
    icon: ShieldCheck,
    accent: { chip: "bg-rose-400", tile: "bg-rose-500/15 text-rose-600" },
    basePath: "/aftersales",
    sections: [
      { key: "warranty", labelKey: "topnav.tabs.warranty", icon: ShieldCheck },
      { key: "warranty-codes", labelKey: "topnav.tabs.warrantyCodes", icon: QrCode },
    ],
  },
  {
    key: "utilities",
    labelKey: "sidebar.group.utilities",
    shortLabelKey: "module.utilities",
    icon: Wrench,
    accent: { chip: "bg-lime-500", tile: "bg-lime-500/15 text-lime-700" },
    basePath: "/utilities",
    sections: [{ key: "address-lookup", labelKey: "topnav.tabs.addressLookup", icon: MapPinned }],
  },
  {
    key: "reports",
    labelKey: "sidebar.group.reports",
    shortLabelKey: "module.reports",
    icon: BarChart3,
    accent: { chip: "bg-amber-400", tile: "bg-amber-500/15 text-amber-600" },
    basePath: "/reports",
    sections: [
      { key: "overview-report", labelKey: "topnav.tabs.overviewReport", icon: Gauge },
      { key: "call-quality", labelKey: "topnav.tabs.callQuality", icon: Headphones },
      { key: "dashboard", labelKey: "topnav.tabs.dashboard", icon: BarChart3 },
      { key: "ads-report", labelKey: "topnav.tabs.adsReport", icon: Megaphone },
      {
        // Ẩn tạm khỏi menu theo yêu cầu 15/09/2026 (trang vẫn mở được qua URL
        // /reports/foxia và quyền vẫn gán được ở Vai trò). Bỏ `hidden` để hiện lại.
        key: "foxia-report",
        labelKey: "topnav.tabs.foxiaReport",
        icon: Megaphone,
        hidden: true,
      },
      {
        // Quyền riêng `customer-explorer:view` (Task 2, migration 0040) — KHÔNG
        // set `requires` sang "dashboard". Menu ẩn cho tới khi role được cấp
        // quyền riêng; nếu dùng chung `dashboard` thì ai có dashboard sẽ thấy
        // menu rồi nhận 403 ở mọi thao tác trên trang.
        key: "customer-explorer",
        labelKey: "topnav.tabs.customerExplorer",
        icon: Search,
      },
    ],
  },
  {
    key: "hr",
    labelKey: "sidebar.group.hr",
    shortLabelKey: "module.hr",
    icon: Users,
    accent: { chip: "bg-teal-400", tile: "bg-teal-500/15 text-teal-600" },
    basePath: "/hr",
    sections: [
      { key: "employees", labelKey: "topnav.tabs.employees", icon: Users },
      {
        // Quản lý phòng ban (trưởng phòng + team). Vẫn gate `users` (admin) vì
        // CRUD phòng ban ở backend chỉ cho admin — chỉ đổi VỊ TRÍ menu sang HR.
        key: "departments",
        labelKey: "topnav.tabs.departments",
        icon: Building2,
        requires: "users",
      },
      { key: "leave", labelKey: "topnav.tabs.leave", icon: CalendarDays, requires: "employees" },
      {
        key: "attendance-history",
        labelKey: "topnav.tabs.attendanceHistory",
        icon: History,
        requires: "employees",
      },
      {
        // Trang lương → quyền `salaries` (nhạy cảm), không phải `employees`.
        key: "compensation",
        labelKey: "topnav.tabs.compensation",
        icon: Wallet,
        requires: "salaries",
      },
    ],
  },
  {
    key: "settings",
    labelKey: "sidebar.group.admin",
    shortLabelKey: "module.settings",
    icon: ShieldCheck,
    accent: { chip: "bg-slate-400", tile: "bg-slate-500/15 text-slate-600" },
    basePath: "/settings",
    sections: [
      { key: "users", labelKey: "topnav.tabs.users", icon: UsersRound },
      { key: "lead-assignment", labelKey: "topnav.tabs.leadAssignment", icon: Shuffle },
      { key: "roles", labelKey: "topnav.tabs.roles", icon: ShieldCheck, requires: "users" },
      { key: "channels", labelKey: "topnav.tabs.channels", icon: Store },
      { key: "kiotviet", labelKey: "topnav.tabs.kiotviet", icon: Database },
      { key: "foxia-link", labelKey: "topnav.tabs.foxiaLink", icon: Plug },
      { key: "pancake", labelKey: "topnav.tabs.pancake", icon: Plug },
      { key: "pancake-pos", labelKey: "topnav.tabs.pancakePos", icon: PackageSearch },
      { key: "system-settings", labelKey: "topnav.tabs.systemSettings", icon: SlidersHorizontal },
      {
        key: "media-settings",
        labelKey: "topnav.tabs.mediaSettings",
        icon: Plug,
        requires: "users",
      },
      { key: "contact_flow", labelKey: "topnav.tabs.contactFlow", icon: Workflow },
      { key: "audit", labelKey: "topnav.tabs.audit", icon: FileText },
      {
        key: "attendance-locations",
        labelKey: "topnav.tabs.attendanceLocations",
        icon: MapPin,
        requires: "employees",
      },
    ],
  },
];

/** localStorage key nhớ module dùng gần nhất để "/" quay lại đúng chỗ. */
export const LAST_MODULE_STORAGE_KEY = "desi.lastModule";

export const SECTION_TO_MODULE: Record<AppSection, AppModule> = Object.fromEntries(
  APP_MODULES.flatMap((m) => m.sections.map((s) => [s.key, m] as const)),
) as Record<AppSection, AppModule>;

export function moduleByKey(key: string): AppModule | undefined {
  return APP_MODULES.find((m) => m.key === key);
}

export function defaultSectionOfModule(m: AppModule): AppSection {
  return m.sections[0].key;
}

/** Section này có nằm trong allowed_sections không (tôn trọng requires/requiresAny). */
function isSectionAllowed(s: ModuleSection, allowed: ReadonlySet<string>): boolean {
  return s.requiresAny
    ? s.requiresAny.some((x) => allowed.has(x))
    : allowed.has(s.requires ?? s.key);
}

/**
 * Section đầu tiên trong module mà user THỰC SỰ vào được (bỏ qua section ẩn).
 * Dùng làm đích redirect: `defaultSectionOfModule` trả section đầu tiên bất kể
 * quyền, nên nếu dùng để điều hướng sẽ bị guard đá ngược → vòng lặp redirect.
 */
export function firstAllowedSectionOfModule(
  m: AppModule,
  allowedSections: readonly string[],
): AppSection | undefined {
  const allowed = new Set(allowedSections);
  return m.sections.find((s) => !s.hidden && isSectionAllowed(s, allowed))?.key;
}

/** Section đầu tiên user vào được trên toàn app — đích redirect cuối cùng. */
export function firstAllowedSection(allowedSections: readonly string[]): AppSection | undefined {
  const allowed = new Set(allowedSections);
  for (const m of APP_MODULES) {
    const s = m.sections.find((x) => !x.hidden && isSectionAllowed(x, allowed));
    if (s) return s.key;
  }
  return undefined;
}

/** Module user được phép thấy: có ≥1 section hiển thị mà allowed_sections cho phép. */
export function accessibleModules(allowedSections: string[]): AppModule[] {
  const allowed = new Set(allowedSections);
  return APP_MODULES.filter((m) =>
    m.sections.some((s) => !s.hidden && isSectionAllowed(s, allowed)),
  );
}
