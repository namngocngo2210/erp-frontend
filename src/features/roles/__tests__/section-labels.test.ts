import { describe, expect, it } from "vitest";

import { MODULE_GROUPS, SECTION_LABELS, sectionLabel } from "@/features/roles/constants";

/**
 * Mirror của PERMISSION_CATALOG (backend/apps/users/rbac_catalog.py) — nguồn của
 * GET /api/users/permissions. Thêm section mới ở backend thì thêm vào đây; test sẽ
 * đòi nhãn + nhóm tương ứng để trang Vai trò không hiện khóa thô dưới "Khác"
 * (đã xảy ra với address-lookup, customer-explorer, call-quality, employees 15/09/2026).
 */
const PERMISSION_CATALOG_SECTIONS = [
  "orders",
  "landing-orders",
  "koc-orders",
  "warranty",
  "warranty-codes",
  "customers",
  "contacts",
  "loyal-customers",
  "resale-tracking",
  "dashboard",
  "ads-report",
  "overview-report",
  "customer-explorer",
  "call-quality",
  "channels",
  "kiotviet",
  "facebook-ads",
  "google-ads",
  "foxia-report",
  "products",
  "product-categories",
  "warehouses",
  "stock",
  "stock-documents",
  "returns",
  "shipments",
  "employees",
  "salaries",
  "users",
  "lead-assignment",
  "sale-assignment",
  "customer-phone",
  "floating-pool",
  "contact_flow",
  "audit",
  "address-lookup",
  "pancake-pos",
];

describe("Vai trò & quyền — nhãn section", () => {
  it("mọi section trong catalog quyền đều có tên tiếng Việt, không lộ khóa thô", () => {
    const missing = PERMISSION_CATALOG_SECTIONS.filter((s) => sectionLabel(s) === s);
    expect(missing).toEqual([]);
  });

  it("mọi section trong catalog quyền đều thuộc một nhóm (không rơi vào 'Khác')", () => {
    const grouped = new Set(MODULE_GROUPS.flatMap((g) => g.sections));
    const missing = PERMISSION_CATALOG_SECTIONS.filter((s) => !grouped.has(s));
    expect(missing).toEqual([]);
  });

  it("nhóm không chứa section trùng hoặc section không có nhãn", () => {
    const all = MODULE_GROUPS.flatMap((g) => g.sections);
    expect(new Set(all).size).toBe(all.length);
    expect(all.filter((s) => !SECTION_LABELS[s])).toEqual([]);
  });

  it("Tra cứu địa chỉ nằm trong nhóm Tiện ích", () => {
    expect(sectionLabel("address-lookup")).toBe("Tra cứu địa chỉ");
    expect(MODULE_GROUPS.find((g) => g.label === "Tiện ích")?.sections).toEqual(["address-lookup"]);
  });
});
