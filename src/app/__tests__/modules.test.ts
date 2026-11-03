import { describe, it, expect } from "vitest";
import {
  APP_MODULES,
  SECTION_TO_MODULE,
  moduleByKey,
  defaultSectionOfModule,
  accessibleModules,
} from "@/app/modules";

// Mọi AppSection có tab riêng trong module nav. Riêng "returns" KHÔNG có tab:
// trang Trả hàng đã gộp vào Phiếu kho (stock-documents, requiresAny) — xem bên dưới.
const ALL_SECTIONS = [
  "orders",
  "landing-orders",
  "koc-orders",
  "contacts",
  "floating-pool",
  "customers",
  "customer-explorer",
  "loyal-customers",
  "resale-tracking",
  "pancake-leads",
  "warranty",
  "warranty-codes",
  "dashboard",
  "ads-report",
  "foxia-report",
  "overview-report",
  "call-quality",
  "channels",
  "kiotviet",
  "foxia-link",
  "pancake",
  "pancake-pos",
  "system-settings",
  "contact_flow",
  "facebook-ads",
  "google-ads",
  "users",
  "lead-assignment",
  "roles",
  "departments",
  "products",
  "product-categories",
  "warehouses",
  "shipments",
  "stock",
  "dispatch-history",
  "stock-documents",
  "audit",
  "employees",
  "leave",
  "attendance-history",
  "attendance-locations",
  "compensation",
  "media-explore",
  "media-contents",
  "media-proposals",
  "media-reports",
  "media-taxonomy",
  "media-settings",
  "address-lookup",
];

describe("APP_MODULES integrity", () => {
  it("has the expected modules", () => {
    expect(APP_MODULES.map((m) => m.key)).toEqual([
      "sales",
      "cskh",
      "crm",
      "inventory",
      "catalog",
      "marketing",
      "media",
      "aftersales",
      "utilities",
      "reports",
      "hr",
      "settings",
    ]);
  });

  it("each section belongs to exactly one module", () => {
    const seen = APP_MODULES.flatMap((m) => m.sections.map((s) => s.key));
    expect(seen.sort()).toEqual([...ALL_SECTIONS].sort());
    expect(new Set(seen).size).toBe(seen.length);
  });

  it("every module has at least one section", () => {
    for (const m of APP_MODULES) {
      expect(m.sections.length).toBeGreaterThan(0);
    }
  });

  it("section 'returns' không có tab riêng nhưng vẫn mở được Phiếu kho qua requiresAny", () => {
    const stockDocuments = APP_MODULES.flatMap((m) => m.sections).find(
      (s) => s.key === "stock-documents",
    );
    expect(stockDocuments?.requiresAny).toContain("returns");
  });
});

describe("derived helpers", () => {
  it("SECTION_TO_MODULE maps every section to the right module", () => {
    expect(SECTION_TO_MODULE["warehouses"].key).toBe("inventory");
    expect(SECTION_TO_MODULE["shipments"].key).toBe("inventory");
    expect(SECTION_TO_MODULE["warranty"].key).toBe("aftersales");
    expect(SECTION_TO_MODULE["warranty-codes"].key).toBe("aftersales");
    expect(SECTION_TO_MODULE["roles"].key).toBe("settings");
    expect(SECTION_TO_MODULE["lead-assignment"].key).toBe("settings");
    expect(SECTION_TO_MODULE["kiotviet"].key).toBe("settings");
    expect(SECTION_TO_MODULE["channels"].key).toBe("settings");
    expect(SECTION_TO_MODULE["products"].key).toBe("catalog");
    expect(SECTION_TO_MODULE["product-categories"].key).toBe("catalog");
    expect(SECTION_TO_MODULE["ads-report"].key).toBe("reports");
    expect(SECTION_TO_MODULE["overview-report"].key).toBe("reports");
    expect(SECTION_TO_MODULE["customer-explorer"].key).toBe("reports");
    expect(SECTION_TO_MODULE["orders"].key).toBe("sales");
    expect(SECTION_TO_MODULE["landing-orders"].key).toBe("sales");
    expect(SECTION_TO_MODULE["koc-orders"].key).toBe("sales");
    expect(SECTION_TO_MODULE["contacts"].key).toBe("cskh");
    expect(SECTION_TO_MODULE["floating-pool"].key).toBe("cskh");
    expect(SECTION_TO_MODULE["resale-tracking"].key).toBe("cskh");
    expect(SECTION_TO_MODULE["pancake"].key).toBe("settings");
    expect(SECTION_TO_MODULE["pancake-pos"].key).toBe("settings");
    expect(SECTION_TO_MODULE["pancake-leads"].key).toBe("cskh");
  });

  it("moduleByKey / defaultSectionOfModule", () => {
    const sales = moduleByKey("sales");
    expect(sales).toBeDefined();
    expect(defaultSectionOfModule(sales!)).toBe("orders");
    expect(moduleByKey("nope")).toBeUndefined();
  });

  it("accessibleModules filters by allowed_sections (honoring requires)", () => {
    const mods = accessibleModules(["warehouses"]);
    expect(mods.map((m) => m.key)).toEqual(["inventory"]);
    // cấp quyền dashboard làm module reports hiển thị (section "dashboard" nằm
    // trong module reports).
    const reports = accessibleModules(["dashboard"]).map((m) => m.key);
    expect(reports).toContain("reports");
  });

  it("customer-explorer dùng quyền riêng, KHÔNG ăn theo dashboard", () => {
    // Quyền customer-explorer:view (Task 2) là quyền RIÊNG — cấp riêng nó cũng
    // đủ để module reports hiển thị mà không cần quyền dashboard.
    expect(accessibleModules(["customer-explorer"]).map((m) => m.key)).toEqual(["reports"]);
  });

  it("module cskh mở được bằng quyền lẻ, section mặc định là contacts", () => {
    const cskh = moduleByKey("cskh");
    expect(cskh).toBeDefined();
    expect(defaultSectionOfModule(cskh!)).toBe("contacts");
    expect(accessibleModules(["floating-pool"]).map((m) => m.key)).toEqual(["cskh"]);
    // Quyền của nhóm Đơn hàng KHÔNG kéo nhóm CSKH hiện ra và ngược lại.
    expect(accessibleModules(["orders"]).map((m) => m.key)).toEqual(["sales"]);
  });
});
